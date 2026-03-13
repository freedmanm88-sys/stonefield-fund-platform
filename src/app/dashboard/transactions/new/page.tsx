import { createClient } from '@/lib/supabase/server'
import TransactionForm from '@/components/transactions/TransactionForm'

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: { account?: string; period?: string }
}) {
  const supabase = createClient()

  const [accountsRes, periodsRes] = await Promise.all([
    supabase
      .from('investment_accounts')
      .select('*, investor:investors(first_name, last_name), share_class:share_classes(code)')
      .order('account_name'),
    supabase
      .from('monthly_periods')
      .select('*')
      .order('period_date', { ascending: false }),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">New Transaction</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new transaction with automatic journal entries</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <TransactionForm
          accounts={accountsRes.data || []}
          periods={periodsRes.data || []}
          preselectedAccountId={searchParams.account}
          preselectedPeriodId={searchParams.period}
        />
      </div>
    </div>
  )
}
