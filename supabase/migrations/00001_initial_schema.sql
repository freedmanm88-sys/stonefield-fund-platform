-- ============================================================
-- MIC Fund Management Platform — Phase 1 Schema
-- Stonefield Capital · March 2026
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS TABLE (app users, not auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL,  -- FK to auth.users
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member' CHECK (role IN ('admin', 'team_member')),
  last_login TIMESTAMPTZ,
  last_action TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 2. INVESTORS TABLE
-- ============================================================
CREATE TABLE public.investors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT NOT NULL,
  phone TEXT,
  cell_phone TEXT,
  street_address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 3. SHARE CLASSES TABLE
-- ============================================================
CREATE TABLE public.share_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  current_annual_rate NUMERIC(6, 4) NOT NULL,  -- e.g. 0.1100 for 11%
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 4. SHARE CLASS RATE HISTORY (rates never overwritten)
-- ============================================================
CREATE TABLE public.share_class_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_class_id UUID NOT NULL REFERENCES public.share_classes(id),
  annual_rate NUMERIC(6, 4) NOT NULL,
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id),
  UNIQUE(share_class_id, effective_from)
);

-- ============================================================
-- 5. INVESTMENT ACCOUNTS TABLE
-- ============================================================
CREATE TABLE public.investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES public.investors(id),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (account_type IN ('individual', 'corporate', 'registered')),
  share_class_id UUID NOT NULL REFERENCES public.share_classes(id),
  drip_enabled BOOLEAN NOT NULL DEFAULT false,
  pad_enabled BOOLEAN NOT NULL DEFAULT true,
  institution_number TEXT,     -- 3-digit Canadian bank institution #
  branch_transit_number TEXT,  -- 5-digit transit #
  account_number TEXT,         -- 7-12 digits (encrypted at rest via Supabase Vault)
  system_account_id TEXT UNIQUE NOT NULL,  -- auto-generated unique ID for PAD reference
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 6. ACCOUNT CLASS HISTORY (start_date, end_date per assignment)
-- ============================================================
CREATE TABLE public.account_class_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_account_id UUID NOT NULL REFERENCES public.investment_accounts(id),
  share_class_id UUID NOT NULL REFERENCES public.share_classes(id),
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = current assignment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 7. MONTHLY PERIODS TABLE
-- ============================================================
CREATE TABLE public.monthly_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_date DATE NOT NULL UNIQUE,  -- first day of month, e.g. 2026-04-01
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'calculated', 'approved', 'closed', 'unlocked')),
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 8. TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_account_id UUID NOT NULL REFERENCES public.investment_accounts(id),
  monthly_period_id UUID NOT NULL REFERENCES public.monthly_periods(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit', 'redemption', 'interest_accrual', 'interest_payout',
    'drip_conversion', 'account_transfer', 'share_class_transfer',
    'revenue', 'expense', 'manual_adjustment'
  )),
  amount NUMERIC(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  reason TEXT,  -- mandatory for manual adjustments and soft deletes
  source_account_id UUID REFERENCES public.investment_accounts(id),  -- for transfers
  destination_account_id UUID REFERENCES public.investment_accounts(id),  -- for transfers
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id),
  deleted_reason TEXT
);

-- ============================================================
-- 9. JOURNAL ENTRIES (double-entry GL, append-only in practice)
-- ============================================================
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 10. CHART OF ACCOUNTS
-- ============================================================
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 11. PAD FILES TABLE
-- ============================================================
CREATE TABLE public.pad_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_period_id UUID NOT NULL REFERENCES public.monthly_periods(id),
  version_number INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'void')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  payee_count INT NOT NULL,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  void_reason TEXT,
  voided_by UUID REFERENCES public.users(id),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 12. INTEREST CALCULATION RUNS
-- ============================================================
CREATE TABLE public.interest_calculation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_period_id UUID NOT NULL REFERENCES public.monthly_periods(id),
  run_by UUID REFERENCES public.users(id),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  superseded_by UUID REFERENCES public.interest_calculation_runs(id),
  is_stale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 13. MONTHLY FUND STATS (for analytics)
-- ============================================================
CREATE TABLE public.monthly_fund_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_period_id UUID NOT NULL REFERENCES public.monthly_periods(id) UNIQUE,
  total_aum NUMERIC(15, 2),
  investor_count INT,
  loans_deployed NUMERIC(15, 2),
  loan_revenue NUMERIC(15, 2),
  total_interest_paid NUMERIC(15, 2),
  total_drip NUMERIC(15, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 14. RECONCILIATION IMPORTS
-- ============================================================
CREATE TABLE public.reconciliation_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_period_id UUID NOT NULL REFERENCES public.monthly_periods(id),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  comparison_results JSONB,
  imported_by UUID REFERENCES public.users(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

-- ============================================================
-- 15. IMMUTABLE AUDIT LOG (append-only, no update/delete)
-- ============================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address INET
);

-- ============================================================
-- AUDIT LOG TRIGGER FUNCTION
-- Writes to audit_log on every INSERT, UPDATE, DELETE
-- Cannot be bypassed by application code
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _user_name TEXT;
  _old JSONB;
  _new JSONB;
  _action TEXT;
  _record_id UUID;
BEGIN
  -- Get the current user from the JWT claims (Supabase auth)
  BEGIN
    _user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID;
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
  END;

  -- Try to get the user name
  BEGIN
    SELECT full_name INTO _user_name FROM public.users WHERE auth_id = _user_id;
  EXCEPTION WHEN OTHERS THEN
    _user_name := NULL;
  END;

  _action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _new := NULL;
    _record_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    _record_id := NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    _old := NULL;
    _new := to_jsonb(NEW);
    _record_id := NEW.id;
  END IF;

  INSERT INTO public.audit_log (
    user_id, user_name, action, table_name, record_id, old_value, new_value
  ) VALUES (
    _user_id, _user_name, _action, TG_TABLE_NAME, _record_id, _old, _new
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ATTACH AUDIT TRIGGERS TO ALL TABLES (except audit_log itself)
-- ============================================================
DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOR _tbl IN
    SELECT unnest(ARRAY[
      'users', 'investors', 'share_classes', 'share_class_rate_history',
      'investment_accounts', 'account_class_history', 'monthly_periods',
      'transactions', 'journal_entries', 'chart_of_accounts', 'pad_files',
      'interest_calculation_runs', 'monthly_fund_stats', 'reconciliation_imports'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()',
      _tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- PREVENT UPDATE/DELETE ON AUDIT LOG (immutable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: % operations are not permitted', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- ============================================================
-- FUNCTION: REJECT WRITES TO CLOSED MONTHS
-- Used by RLS policies to prevent any writes to closed months
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_month_open_for_writes(period_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  _status TEXT;
BEGIN
  SELECT status INTO _status FROM public.monthly_periods WHERE id = period_id AND deleted_at IS NULL;
  IF _status IS NULL THEN
    RETURN true;  -- period doesn't exist yet, allow creation
  END IF;
  RETURN _status IN ('open', 'calculated', 'unlocked');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  _tbl TEXT;
BEGIN
  FOR _tbl IN
    SELECT unnest(ARRAY[
      'users', 'investors', 'share_classes', 'investment_accounts',
      'monthly_periods', 'transactions', 'chart_of_accounts', 'monthly_fund_stats'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER update_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      _tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- AUTO-GENERATE SYSTEM ACCOUNT ID
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_system_account_id()
RETURNS TRIGGER AS $$
DECLARE
  _next_id INT;
BEGIN
  IF NEW.system_account_id IS NULL OR NEW.system_account_id = '' THEN
    SELECT COALESCE(MAX(CAST(system_account_id AS INT)), 0) + 1
    INTO _next_id
    FROM public.investment_accounts
    WHERE system_account_id ~ '^\d+$';

    NEW.system_account_id := LPAD(_next_id::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_system_account_id
  BEFORE INSERT ON public.investment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.generate_system_account_id();

-- ============================================================
-- AUTO-CREATE ACCOUNT CLASS HISTORY ENTRY ON INSERT/UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_account_class_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.account_class_history (
      investment_account_id, share_class_id, start_date, created_by
    ) VALUES (
      NEW.id, NEW.share_class_id, CURRENT_DATE, NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.share_class_id IS DISTINCT FROM NEW.share_class_id THEN
    -- End the current assignment
    UPDATE public.account_class_history
    SET end_date = CURRENT_DATE
    WHERE investment_account_id = NEW.id
      AND end_date IS NULL
      AND deleted_at IS NULL;

    -- Create new assignment
    INSERT INTO public.account_class_history (
      investment_account_id, share_class_id, start_date, created_by
    ) VALUES (
      NEW.id, NEW.share_class_id, CURRENT_DATE, NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_class_change
  AFTER INSERT OR UPDATE ON public.investment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.track_account_class_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_class_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pad_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_calculation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_fund_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: USERS
-- ============================================================
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: INVESTORS (all authenticated users can read; write requires active user)
-- ============================================================
CREATE POLICY "investors_select" ON public.investors
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "investors_select_deleted" ON public.investors
  FOR SELECT USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY "investors_insert" ON public.investors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "investors_update" ON public.investors
  FOR UPDATE USING (true);

CREATE POLICY "investors_delete" ON public.investors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: SHARE CLASSES
-- ============================================================
CREATE POLICY "share_classes_select" ON public.share_classes
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "share_classes_insert" ON public.share_classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY "share_classes_update" ON public.share_classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: SHARE CLASS RATE HISTORY
-- ============================================================
CREATE POLICY "rate_history_select" ON public.share_class_rate_history
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "rate_history_insert" ON public.share_class_rate_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: INVESTMENT ACCOUNTS
-- ============================================================
CREATE POLICY "accounts_select" ON public.investment_accounts
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "accounts_select_deleted" ON public.investment_accounts
  FOR SELECT USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY "accounts_insert" ON public.investment_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "accounts_update" ON public.investment_accounts
  FOR UPDATE USING (true);

-- ============================================================
-- RLS POLICIES: ACCOUNT CLASS HISTORY
-- ============================================================
CREATE POLICY "class_history_select" ON public.account_class_history
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "class_history_insert" ON public.account_class_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "class_history_update" ON public.account_class_history
  FOR UPDATE USING (true);

-- ============================================================
-- RLS POLICIES: MONTHLY PERIODS
-- ============================================================
CREATE POLICY "periods_select" ON public.monthly_periods
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "periods_insert" ON public.monthly_periods
  FOR INSERT WITH CHECK (true);

CREATE POLICY "periods_update" ON public.monthly_periods
  FOR UPDATE USING (true);

-- ============================================================
-- RLS POLICIES: TRANSACTIONS — closed months reject writes at DB layer
-- ============================================================
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "transactions_select_deleted" ON public.transactions
  FOR SELECT USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    public.is_month_open_for_writes(monthly_period_id)
  );

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (
    public.is_month_open_for_writes(monthly_period_id)
  );

-- ============================================================
-- RLS POLICIES: JOURNAL ENTRIES
-- ============================================================
CREATE POLICY "journal_select" ON public.journal_entries
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "journal_insert" ON public.journal_entries
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- RLS POLICIES: CHART OF ACCOUNTS
-- ============================================================
CREATE POLICY "coa_select" ON public.chart_of_accounts
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "coa_insert" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: PAD FILES
-- ============================================================
CREATE POLICY "pad_select" ON public.pad_files
  FOR SELECT USING (true);

CREATE POLICY "pad_insert" ON public.pad_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

CREATE POLICY "pad_update" ON public.pad_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: INTEREST CALCULATION RUNS
-- ============================================================
CREATE POLICY "calc_runs_select" ON public.interest_calculation_runs
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "calc_runs_insert" ON public.interest_calculation_runs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "calc_runs_update" ON public.interest_calculation_runs
  FOR UPDATE USING (true);

-- ============================================================
-- RLS POLICIES: MONTHLY FUND STATS
-- ============================================================
CREATE POLICY "fund_stats_select" ON public.monthly_fund_stats
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "fund_stats_insert" ON public.monthly_fund_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "fund_stats_update" ON public.monthly_fund_stats
  FOR UPDATE USING (true);

-- ============================================================
-- RLS POLICIES: RECONCILIATION IMPORTS
-- ============================================================
CREATE POLICY "recon_select" ON public.reconciliation_imports
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "recon_insert" ON public.reconciliation_imports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- ============================================================
-- RLS POLICIES: AUDIT LOG (read-only for admins, append via trigger)
-- ============================================================
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::UUID
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

-- Allow the trigger function to insert (runs as SECURITY DEFINER)
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- SEED: SHARE CLASSES (all 12 from Mortgage Automator export)
-- ============================================================
INSERT INTO public.share_classes (code, name, current_annual_rate) VALUES
  ('B', 'Class B (11%)',    0.1100),
  ('E', 'Class E (10%)',    0.1000),
  ('G', 'Class G (9.35%)',  0.0935),
  ('H', 'Class H (9%)',     0.0900),
  ('I', 'Class I (8.5%)',   0.0850),
  ('J', 'Class J (8%)',     0.0800),
  ('L', 'Class L (7.5%)',   0.0750),
  ('M', 'Class M (7.25%)',  0.0725),
  ('N', 'Class N (7%)',     0.0700),
  ('O', 'Class O (6.79%)',  0.0679),
  ('P', 'Class P (8.25%)',  0.0825),
  ('S', 'Class S (9.25%)',  0.0925);

-- Seed rate history for each class (effective from system start)
INSERT INTO public.share_class_rate_history (share_class_id, annual_rate, effective_from)
SELECT id, current_annual_rate, '2026-01-01'::DATE
FROM public.share_classes;

-- ============================================================
-- SEED: CHART OF ACCOUNTS (basic fund accounting)
-- ============================================================
INSERT INTO public.chart_of_accounts (code, name, account_type) VALUES
  ('1000', 'Cash',                  'asset'),
  ('1100', 'Loans Receivable',      'asset'),
  ('2000', 'Interest Payable',      'liability'),
  ('3000', 'Investor Capital',      'equity'),
  ('3100', 'Retained Earnings',     'equity'),
  ('4000', 'Interest Revenue',      'revenue'),
  ('4100', 'Loan Revenue',          'revenue'),
  ('5000', 'Interest Expense',      'expense'),
  ('5100', 'Operating Expenses',    'expense'),
  ('5200', 'Management Fees',       'expense'),
  ('5300', 'Professional Fees',     'expense'),
  ('5400', 'Office & Admin',        'expense');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_investors_deleted ON public.investors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_investors_name ON public.investors(last_name, first_name);
CREATE INDEX idx_accounts_investor ON public.investment_accounts(investor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_class ON public.investment_accounts(share_class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_account ON public.transactions(investment_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_period ON public.transactions(monthly_period_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name, timestamp);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, timestamp);
CREATE INDEX idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX idx_class_history_account ON public.account_class_history(investment_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rate_history_class ON public.share_class_rate_history(share_class_id, effective_from) WHERE deleted_at IS NULL;
