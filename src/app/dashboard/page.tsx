import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TRANSACTION_TYPE_LABELS, MONTH_STATUS_LABELS, MONTH_STATUS_COLORS } from '@/lib/types/database'
import type { TransactionType } from '@/lib/types/database'

export default async function DashboardPage() {
  const supabase = createClient()

  const [investorsRes, accountsRes, periodRes, recentTxnRes, staleCheckRes] = await Promise.all([
    supabase.from('investors').select('id', { count: 'exact', head: true }),
    supabase.from('investment_accounts').select('id', { count: 'exact', head: true }),
    supabase
      .from('monthly_periods')
      .select('*')
      .order('period_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select(`
        id, transaction_type, amount, transaction_date, description,
        investment_account:investment_accounts (
          account_name,
          investor:investors (first_name, last_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5),
    // Check if any open period has stale calculations
    supabase
      .from('interest_calculation_runs')
      .select('id, is_stale, monthly_period_id')
      .eq('is_stale', true)
      .limit(1)
      .maybeSingle(),
  ])

  const investorCount = investorsRes.count || 0
  const accountCount = accountsRes.count || 0
  const currentPeriod = periodRes.data
  const recentTransactions = recentTxnRes.data || []
  const hasStaleCalcs = !!staleCheckRes.data

  const monthLabel = currentPeriod
    ? new Date(currentPeriod.period_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Fund Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Stonefield Capital — MIC Fund Management</p>
      </div>

      {/* Stale calculation banner */}
      {hasStaleCalcs && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Recalculation Required</p>
            <p className="text-xs text-amber-600">Transactions have changed since the last calculation run.</p>
          </div>
          <Link
            href="/dashboard/ledger"
            className="text-sm font-medium text-amber-800 hover:text-amber-900 underline"
          >
            Go to Ledger
          </Link>
        </div>
      )}

      {/* Summary Cards — uniform height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total AUM" value="$0.00" subtitle="Assets under management" />
        <SummaryCard
          title="Active Investors"
          value={investorCount.toString()}
          href="/dashboard/investors"
          subtitle={`${accountCount} accounts`}
        />
        <SummaryCard
          title="Closing Retained Earnings"
          value="$0.00"
          subtitle="Current period"
        />
        <SummaryCard
          title="Month Status"
          value={monthLabel}
          href="/dashboard/ledger"
          subtitle={currentPeriod ? `Status: ${currentPeriod.status}` : 'No open period'}
          statusBadge={currentPeriod ? { label: MONTH_STATUS_LABELS[currentPeriod.status as keyof typeof MONTH_STATUS_LABELS], color: MONTH_STATUS_COLORS[currentPeriod.status as keyof typeof MONTH_STATUS_COLORS] } : undefined}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fund Performance placeholder */}
          <DashboardCard title="Fund Performance" subtitle="AUM over time">
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="text-center">
                <ChartPlaceholderIcon />
                <p className="text-sm text-gray-400 mt-2">Performance chart will appear here</p>
                <p className="text-xs text-gray-300 mt-1">once transactions are recorded</p>
              </div>
            </div>
          </DashboardCard>

          {/* Income Statement summary */}
          <DashboardCard title="Income Statement" subtitle="Current period summary">
            <div className="grid grid-cols-2 gap-4">
              <StatLine label="Total Income" value="$0.00" />
              <StatLine label="Total Expenses" value="$0.00" />
              <StatLine label="Net Income" value="$0.00" bold />
              <StatLine label="Mgmt Fee Accrual" value="$0.00" />
            </div>
          </DashboardCard>

          {/* Capital Movement summary */}
          <DashboardCard title="Capital Movement" subtitle="Current period">
            <div className="grid grid-cols-2 gap-4">
              <StatLine label="Deposits" value="$0.00" />
              <StatLine label="Redemptions" value="$0.00" />
              <StatLine label="DRIP Reinvestments" value="$0.00" />
              <StatLine label="Net Capital Flow" value="$0.00" bold />
            </div>
          </DashboardCard>
        </div>

        {/* Right column — 1/3 width */}
        <div className="space-y-6">
          {/* Recent Transactions */}
          <DashboardCard title="Recent Transactions">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18v-.008Zm-12 0h.008v.008H6v-.008Z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No transactions yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  <Link href="/dashboard/transactions/new" className="text-brand-blue hover:underline">
                    Add your first transaction
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((txn) => {
                  const acct = txn.investment_account as unknown as Record<string, unknown> | null
                  const investor = acct?.investor as unknown as { first_name: string; last_name: string } | null
                  return (
                    <div key={txn.id} className="flex items-center justify-between py-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 truncate">
                          {investor ? `${investor.first_name} ${investor.last_name}` : (acct?.account_name as string) || '—'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {TRANSACTION_TYPE_LABELS[txn.transaction_type as TransactionType]} &middot; {new Date(txn.transaction_date + 'T00:00:00').toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-sm font-medium tabular-nums ml-3 ${Number(txn.amount) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${Number(txn.amount).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                })}
                <Link
                  href="/dashboard/transactions"
                  className="block text-center text-xs text-brand-blue hover:underline pt-2 border-t border-gray-100"
                >
                  View all transactions
                </Link>
              </div>
            )}
          </DashboardCard>

          {/* Quick Navigation */}
          <DashboardCard title="Quick Actions">
            <div className="space-y-2">
              <QuickLink href="/dashboard/investors" label="View Investors" count={investorCount} />
              <QuickLink href="/dashboard/accounts" label="View Accounts" count={accountCount} />
              <QuickLink href="/dashboard/ledger" label="Fund Ledger" />
              <QuickLink href="/dashboard/transactions/new" label="Add Transaction" />
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}

/* ── Reusable sub-components ── */

function SummaryCard({
  title,
  value,
  subtitle,
  href,
  statusBadge,
}: {
  title: string
  value: string
  subtitle?: string
  href?: string
  statusBadge?: { label: string; color: string }
}) {
  const content = (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 h-[108px] flex flex-col justify-between ${
        href ? 'hover:border-brand-blue hover:shadow-sm transition-all' : ''
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-brand-black">{value}</p>
          {statusBadge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function DashboardCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-brand-black">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StatLine({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-brand-black' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  )
}

function QuickLink({
  href,
  label,
  count,
}: {
  href: string
  label: string
  count?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:border-brand-blue hover:bg-brand-blue-light/30 transition-all text-sm text-gray-700 hover:text-brand-blue group"
    >
      <span className="font-medium">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400 group-hover:text-brand-blue bg-gray-50 group-hover:bg-brand-blue-light px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </Link>
  )
}

function ChartPlaceholderIcon() {
  return (
    <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}
