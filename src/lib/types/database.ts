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
