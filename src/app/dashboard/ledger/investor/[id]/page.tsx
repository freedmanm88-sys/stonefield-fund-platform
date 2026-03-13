import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TRANSACTION_TYPE_LABELS } from '@/lib/types/database'
import type { TransactionType } from '@/lib/types/database'

export default async function InvestorLedgerPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  // Get investor
  const { data: investor } = await supabase
    .from('investors')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!investor) notFound()

  // Get investor's accounts
  const { data: accounts } = await supabase
    .from('investment_accounts')
    .select('id, account_name, share_class:share_classes(code)')
    .eq('investor_id', investor.id)
    .order('account_name')

  const accountIds = (accounts || []).map((a) => a.id)

  // Get all transactions for this investor's accounts
  let transactions: Array<Record<string, unknown>> = []
  if (accountIds.length > 0) {
    const { data: txns } = await supabase
      .from('transactions')
      .select(`
        *,
        investment_account:investment_accounts (
          id, account_name,
          share_class:share_classes (code)
        ),
        monthly_period:monthly_periods (period_date, status)
      `)
      .in('investment_account_id', accountIds)
      .order('transaction_date', { ascending: false })
      .limit(500)

    transactions = txns || []
  }

  // Compute running summary
  let totalDeposits = 0
  let totalRedemptions = 0
  let totalInterest = 0

  for (const txn of transactions) {
    const amt = Number(txn.amount)
    switch (txn.transaction_type) {
      case 'deposit':
        totalDeposits += amt
        break
      case 'redemption':
        totalRedemptions += amt
        break
      case 'interest_accrual':
      case 'interest_payout':
      case 'drip_conversion':
        totalInterest += amt
        break
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/ledger" className="text-sm text-brand-blue hover:underline">&larr; Back to Fund Ledger</Link>
          <h1 className="text-2xl font-bold text-brand-black mt-1">
            {investor.first_name} {investor.last_name} — Investor Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {(accounts || []).length} account{(accounts || []).length !== 1 ? 's' : ''} &middot; {transactions.length} transactions
          </p>
        </div>
        <Link
          href={`/dashboard/investors/${investor.id}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Profile
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Deposits</p>
          <p className="text-xl font-bold text-green-700 mt-1">
            ${totalDeposits.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Redemptions</p>
          <p className="text-xl font-bold text-red-700 mt-1">
            ${Math.abs(totalRedemptions).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Interest</p>
          <p className="text-xl font-bold text-brand-blue mt-1">
            ${totalInterest.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-brand-black">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Period</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Account</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No transactions recorded for this investor.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const acct = txn.investment_account as Record<string, unknown> | null
                  const shareClass = (acct?.share_class as { code: string }) || null
                  const period = txn.monthly_period as { period_date: string } | null

                  return (
                    <tr key={txn.id as string} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date((txn.transaction_date as string) + 'T00:00:00').toLocaleDateString()}
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
                          {TRANSACTION_TYPE_LABELS[txn.transaction_type as TransactionType] || (txn.transaction_type as string)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {(acct?.account_name as string) || '—'}
                        {shareClass && (
                          <span className="ml-1 text-xs text-gray-400">({shareClass.code})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-right tabular-nums">
                        <span className={Number(txn.amount) >= 0 ? 'text-green-700' : 'text-red-700'}>
                          ${Number(txn.amount).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                        {(txn.description as string) || '—'}
                      </td>
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
