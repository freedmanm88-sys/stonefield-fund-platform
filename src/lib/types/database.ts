export interface Investor {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  email: string
  phone: string | null
  cell_phone: string | null
  street_address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export interface ShareClass {
  id: string
  code: string
  name: string
  current_annual_rate: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface InvestmentAccount {
  id: string
  investor_id: string
  account_name: string
  account_type: 'individual' | 'corporate' | 'registered'
  share_class_id: string
  drip_enabled: boolean
  pad_enabled: boolean
  institution_number: string | null
  branch_transit_number: string | null
  account_number: string | null
  system_account_id: string
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  deleted_by: string | null
  // Joined fields
  investor?: Investor
  share_class?: ShareClass
}

export interface AccountClassHistory {
  id: string
  investment_account_id: string
  share_class_id: string
  start_date: string
  end_date: string | null
  created_at: string
  created_by: string | null
  deleted_at: string | null
  share_class?: ShareClass
}

export interface ShareClassRateHistory {
  id: string
  share_class_id: string
  annual_rate: number
  effective_from: string
  created_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface MonthlyPeriod {
  id: string
  period_date: string
  status: 'open' | 'calculated' | 'approved' | 'closed' | 'unlocked'
  status_history: Array<{
    from: string
    to: string
    changed_by: string
    changed_at: string
    reason?: string
  }>
  closed_at: string | null
  closed_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TransactionType =
  | 'deposit'
  | 'redemption'
  | 'interest_accrual'
  | 'interest_payout'
  | 'drip_conversion'
  | 'account_transfer'
  | 'share_class_transfer'
  | 'revenue'
  | 'expense'
  | 'manual_adjustment'

export interface Transaction {
  id: string
  investment_account_id: string
  monthly_period_id: string
  transaction_type: TransactionType
  amount: number
  transaction_date: string
  description: string | null
  reason: string | null
  source_account_id: string | null
  destination_account_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  deleted_by: string | null
  deleted_reason: string | null
  // Joined fields
  investment_account?: InvestmentAccount & { investor?: Investor; share_class?: ShareClass }
  monthly_period?: MonthlyPeriod
}

export interface JournalEntry {
  id: string
  transaction_id: string | null
  account_code: string
  account_name: string
  debit: number
  credit: number
  entry_date: string
  description: string | null
  created_at: string
  created_by: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export interface ChartOfAccount {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface PadFile {
  id: string
  monthly_period_id: string
  version_number: number
  status: 'active' | 'void'
  storage_path: string
  file_name: string
  total_amount: number
  payee_count: number
  generated_by: string | null
  generated_at: string
  void_reason: string | null
  voided_by: string | null
  voided_at: string | null
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface InterestCalculationRun {
  id: string
  monthly_period_id: string
  run_by: string | null
  run_at: string
  results: Record<string, unknown>
  superseded_by: string | null
  is_stale: boolean
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface AppUser {
  id: string
  auth_id: string
  email: string
  full_name: string
  role: 'admin' | 'team_member'
  last_login: string | null
  last_action: string | null
  deactivated_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  user_id: string | null
  user_name: string | null
  action: string
  table_name: string
  record_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  reason: string | null
  ip_address: string | null
}

// ── Constants ──

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'redemption', label: 'Redemption' },
  { value: 'interest_accrual', label: 'Interest Accrual' },
  { value: 'interest_payout', label: 'Interest Payout (PAD)' },
  { value: 'drip_conversion', label: 'DRIP Conversion' },
  { value: 'account_transfer', label: 'Account Transfer' },
  { value: 'share_class_transfer', label: 'Share Class Transfer' },
  { value: 'revenue', label: 'Revenue Entry' },
  { value: 'expense', label: 'Expense Entry' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
]

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Deposit',
  redemption: 'Redemption',
  interest_accrual: 'Interest Accrual',
  interest_payout: 'Interest Payout',
  drip_conversion: 'DRIP Conversion',
  account_transfer: 'Account Transfer',
  share_class_transfer: 'Share Class Transfer',
  revenue: 'Revenue',
  expense: 'Expense',
  manual_adjustment: 'Manual Adjustment',
}

export const MONTH_STATUS_LABELS: Record<MonthlyPeriod['status'], string> = {
  open: 'Open',
  calculated: 'Calculated',
  approved: 'Approved',
  closed: 'Closed',
  unlocked: 'Unlocked',
}

export const MONTH_STATUS_COLORS: Record<MonthlyPeriod['status'], string> = {
  open: 'bg-green-100 text-green-800',
  calculated: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  unlocked: 'bg-amber-100 text-amber-800',
}
