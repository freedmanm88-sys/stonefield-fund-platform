import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AccountDeleteButton from '@/components/accounts/AccountDeleteButton'

export default async function AccountsPage() {
  const supabase = createClient()

  const { data: accounts, error } = await supabase
    .from('investment_accounts')
    .select('*, investor:investors(id, first_name, last_name), share_class:share_classes(id, code, name, current_annual_rate)')
    .order('account_name')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Investment Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {accounts?.length || 0} active account{accounts?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/accounts/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Account
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg">
          Error loading accounts: {error.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Account</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Investor</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Class</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">DRIP</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">PAD</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts && accounts.length > 0 ? (
                accounts.map((account) => {
                  const inv = account.investor as { id: string; first_name: string; last_name: string } | null
                  const sc = account.share_class as { id: string; code: string; name: string; current_annual_rate: number } | null
                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/accounts/${account.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-brand-blue"
                        >
                          {account.account_name}
                        </Link>
                        <p className="text-xs text-gray-400">ID: {account.system_account_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        {inv ? (
                          <Link
                            href={`/dashboard/investors/${inv.id}`}
                            className="text-sm text-gray-600 hover:text-brand-blue"
                          >
                            {inv.last_name}, {inv.first_name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 capitalize">{account.account_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-blue-light text-brand-blue">
                          {sc ? `${sc.code} (${(sc.current_annual_rate * 100).toFixed(2)}%)` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-medium ${account.drip_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {account.drip_enabled ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-medium ${account.pad_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {account.pad_enabled ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/accounts/${account.id}/edit`} className="text-sm text-brand-blue hover:underline">
                            Edit
                          </Link>
                          <AccountDeleteButton accountId={account.id} accountName={account.account_name} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No investment accounts yet.{' '}
                    <Link href="/dashboard/accounts/new" className="text-brand-blue hover:underline">
                      Add your first account
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
