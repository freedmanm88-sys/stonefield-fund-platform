import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MonthLifecycleControls from '@/components/ledger/MonthLifecycleControls'
import { TRANSACTION_TYPE_LABELS } from '@/lib/types/database'
import type { TransactionType } from '@/lib/types/database'

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: { month?: string; type?: string }
}) {
  const supabase = createClient()

  // Get current user for role check
  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user!.id)
    .single()

  // Get all monthly periods
  const { data: periods } = await supabase
    .from('monthly_periods')
    .select('*')
    .order('period_date', { ascending: false })

  const allPeriods = periods || []

  // Selected period (default to most recent)
  const selectedPeriodId = searchParams.month || allPeriods[0]?.id
  const selectedPeriod = allPeriods.find((p) => p.id === selectedPeriodId) || allPeriods[0]

  // Check if calculations are stale
  let isStale = false
  if (selectedPeriod) {
    const { data: latestCalcRun } = await supabase
      .from('interest_calculation_runs')
      .select('is_stale')
      .eq('monthly_period_id', selectedPeriod.id)
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    isStale = latestCalcRun?.is_stale === true
  }

  // Get transactions for selected period
  let transactionsQuery = supabase
    .from('transactions')
    .select(`
      *,
      investment_account:investment_accounts (
        id, account_name,
        investor:investors (first_name, last_name),
        share_class:share_classes (code)
      )
    `)
    .order('transaction_date', { ascending: true })

  if (selectedPeriod) {
    transactionsQuery = transactionsQuery.eq('monthly_period_id', selectedPeriod.id)
  }

  if (searchParams.type) {
    transactionsQuery = transactionsQuery.eq('transaction_type', searchParams.type)
  }

  const { data: transactions } = await transactionsQuery

  const txns = transactions || []

  // Journal entries for selected period
  const transactionIds = txns.map((t) => t.id)
  let journalEntries: { id: string; transaction_id: string; account_code: string; account_name: string; debit: number; credit: number; entry_date: string }[] = []
  if (transactionIds.length > 0) {
    const { data: je } = await supabase
      .from('journal_entries')
      .select('*')
      .in('transaction_id', transactionIds)
      .order('entry_date', { ascending: true })
    journalEntries = je || []
  }

  // Compute GL summary
  const glSummary = new Map<string, { code: string; name: string; debit: number; credit: number }>()
  for (const entry of journalEntries) {
    const existing = glSummary.get(entry.account_code) || {
      code: entry.account_code,
      name: entry.account_name,
      debit: 0,
      credit: 0,
    }
    existing.debit += Number(entry.debit)
    existing.credit += Number(entry.credit)
    glSummary.set(entry.account_code, existing)
  }
  const glRows = Array.from(glSummary.values()).sort((a, b) => a.code.localeCompare(b.code))

  const periodLabel = selectedPeriod
    ? new Date(selectedPeriod.period_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'No periods'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Fund Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">{periodLabel}</p>
        </div>
        <Link
          href="/dashboard/transactions/new"
          className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors"
        >
          Add Transaction
        </Link>
      </div>

      {/* Stale calculation banner */}
      {isStale && selectedPeriod && selectedPeriod.status !== 'closed' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Recalculation Required</p>
            <p className="text-xs text-amber-600">Transactions have changed since the last calculation run. Recalculate before generating a PAD file.</p>
          </div>
        </div>
      )}

      {/* Month selector + lifecycle controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
            <form>
              <select
                name="month"
                defaultValue={selectedPeriodId}
                onChange={(e) => {
                  const form = e.target.closest('form')
                  if (form) form.submit()
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
              >
                {allPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.period_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
                {allPeriods.length === 0 && <option>No periods available</option>}
              </select>
            </form>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Filter by type</label>
            <form>
              <input type="hidden" name="month" value={selectedPeriodId} />
              <select
                name="type"
                defaultValue={searchParams.type || ''}
                onChange={(e) => {
                  const form = e.target.closest('form')
                  if (form) form.submit()
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue"
              >
                <option value="">All types</option>
                {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </form>
          </div>
        </div>

        {selectedPeriod && (
          <MonthLifecycleControls
            period={selectedPeriod}
            userRole={(appUser?.role as 'admin' | 'team_member') || 'team_member'}
            isStale={isStale}
          />
        )}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-brand-black">
            Transactions ({txns.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Account</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Investor</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No transactions for this period.
                  </td>
                </tr>
              ) : (
                txns.map((txn) => {
                  const acct = txn.investment_account as Record<string, unknown> | null
                  const investor = acct?.investor as { first_name: string; last_name: string } | null
                  const shareClass = acct?.share_class as { code: string } | null

                  return (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(txn.transaction_date + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {TRANSACTION_TYPE_LABELS[txn.transaction_type as TransactionType] || txn.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {(acct?.account_name as string) || '—'}
                        {shareClass && (
                          <span className="ml-1 text-xs text-gray-400">({shareClass.code})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {investor ? `${investor.first_name} ${investor.last_name}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-right tabular-nums">
                        <span className={Number(txn.amount) >= 0 ? 'text-green-700' : 'text-red-700'}>
                          ${Number(txn.amount).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                        {txn.description || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GL Summary */}
      {glRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-brand-black">General Ledger Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Code</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Account</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Debit</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Credit</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {glRows.map((row) => (
                  <tr key={row.code} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-mono text-gray-600">{row.code}</td>
                    <td className="px-6 py-3 text-sm text-gray-900">{row.name}</td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-gray-700">
                      {row.debit > 0 ? `$${row.debit.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-gray-700">
                      {row.credit > 0 ? `$${row.credit.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums font-medium text-gray-900">
                      ${(row.debit - row.credit).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
