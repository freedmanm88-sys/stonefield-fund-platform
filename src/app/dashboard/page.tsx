import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()

  const [investorsRes, accountsRes, periodRes] = await Promise.all([
    supabase.from('investors').select('id', { count: 'exact', head: true }),
    supabase.from('investment_accounts').select('id', { count: 'exact', head: true }),
    supabase
      .from('monthly_periods')
      .select('*')
      .eq('status', 'open')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const investorCount = investorsRes.count || 0
  const accountCount = accountsRes.count || 0
  const currentPeriod = periodRes.data

  const monthLabel = currentPeriod
    ? new Date(currentPeriod.year, currentPeriod.month - 1).toLocaleDateString('en-US', {
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
          subtitle={currentPeriod ? `Status: ${currentPeriod.status}` : 'No open period'}
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18v-.008Zm-12 0h.008v.008H6v-.008Z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Transactions will appear here as they are recorded</p>
            </div>
          </DashboardCard>

          {/* Quick Navigation */}
          <DashboardCard title="Quick Actions">
            <div className="space-y-2">
              <QuickLink href="/dashboard/investors" label="View Investors" count={investorCount} />
              <QuickLink href="/dashboard/accounts" label="View Accounts" count={accountCount} />
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
}: {
  title: string
  value: string
  subtitle?: string
  href?: string
}) {
  const content = (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 h-[108px] flex flex-col justify-between ${
        href ? 'hover:border-brand-blue hover:shadow-sm transition-all' : ''
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <div>
        <p className="text-2xl font-bold text-brand-black">{value}</p>
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
  count: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:border-brand-blue hover:bg-brand-blue-light/30 transition-all text-sm text-gray-700 hover:text-brand-blue group"
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs text-gray-400 group-hover:text-brand-blue bg-gray-50 group-hover:bg-brand-blue-light px-2 py-0.5 rounded-full">
        {count}
      </span>
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
