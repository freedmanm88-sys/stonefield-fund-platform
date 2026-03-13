import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TransactionDeleteButton from '@/components/transactions/TransactionDeleteButton'
import { TRANSACTION_TYPE_LABELS } from '@/lib/types/database'
import type { TransactionType } from '@/lib/types/database'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; account?: string }
}) {
  const supabase = createClient()

  // Check user role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user!.id)
    .single()

  const isAdmin = appUser?.role === 'admin'

  // Build query
  let query = supabase
    .from('transactions')
    .select(`
      *,
      investment_account:investment_accounts (
        id, account_name,
        investor:investors (first_name, last_name),
        share_class:share_classes (code)
      ),
      monthly_period:monthly_periods (period_date, status)
    `)
    .order('transaction_date', { ascending: false })
    .limit(200)

  if (searchParams.type) {
    query = query.eq('transaction_type', searchParams.type)
  }

  if (searchParams.account) {
    query = query.eq('investment_account_id', searchParams.account)
  }

  const { data: transactions } = await query
  const txns = transactions || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">All transactions across all periods</p>
        </div>
        <Link
          href="/dashboard/transactions/new"
          className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors"
        >
          Add Transaction
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
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
          </div>
        </form>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Period</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Account</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Investor</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Description</th>
                {isAdmin && (
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                txns.map((txn) => {
                  const acct = txn.investment_account as Record<string, unknown> | null
                  const investor = acct?.investor as { first_name: string; last_name: string } | null
                  const shareClass = acct?.share_class as { code: string } | null
                  const period = txn.monthly_period as { period_date: string; status: string } | null

                  return (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(txn.transaction_date + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {period
                          ? new Date(period.period_date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {TRANSACTION_TYPE_LABELS[txn.transaction_type as TransactionType] || txn.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        <Link
                          href={`/dashboard/accounts/${acct?.id}`}
                          className="hover:text-brand-blue"
                        >
                          {(acct?.account_name as string) || '—'}
                        </Link>
                        {shareClass && (
                          <span className="ml-1 text-xs text-gray-400">({shareClass.code})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {investor ? (
                          <Link
                            href={`/dashboard/investors/${(acct as Record<string, unknown>)?.investor_id || ''}`}
                            className="hover:text-brand-blue"
                          >
                            {investor.first_name} {investor.last_name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-right tabular-nums">
                        <span className={Number(txn.amount) >= 0 ? 'text-green-700' : 'text-red-700'}>
                          ${Number(txn.amount).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                        {txn.description || '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-3 text-right">
                          <TransactionDeleteButton
                            transactionId={txn.id}
                            transactionDescription={txn.description || undefined}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
