import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function AccountDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: account } = await supabase
    .from('investment_accounts')
    .select('*, investor:investors(id, first_name, last_name, email), share_class:share_classes(id, code, name, current_annual_rate)')
    .eq('id', params.id)
    .single()

  if (!account) {
    notFound()
  }

  // Fetch class assignment history
  const { data: classHistory } = await supabase
    .from('account_class_history')
    .select('*, share_class:share_classes(code, name, current_annual_rate)')
    .eq('investment_account_id', params.id)
    .order('start_date', { ascending: false })

  const inv = account.investor as { id: string; first_name: string; last_name: string; email: string } | null
  const sc = account.share_class as { id: string; code: string; name: string; current_annual_rate: number } | null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/accounts" className="text-sm text-gray-500 hover:text-brand-blue">
            &larr; Back to Accounts
          </Link>
          <h1 className="text-2xl font-bold text-brand-black mt-2">{account.account_name}</h1>
          <p className="text-sm text-gray-500 mt-1">System ID: {account.system_account_id}</p>
        </div>
        <Link
          href={`/dashboard/accounts/${account.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-brand-black mb-4">Account Details</h2>
          <dl className="space-y-3">
            <DetailRow label="Account Name" value={account.account_name} />
            <DetailRow label="Account Type" value={account.account_type} />
            <DetailRow
              label="Investor"
              value={inv ? `${inv.first_name} ${inv.last_name}` : '—'}
              href={inv ? `/dashboard/investors/${inv.id}` : undefined}
            />
            <DetailRow
              label="Share Class"
              value={sc ? `${sc.code} — ${(sc.current_annual_rate * 100).toFixed(2)}%` : '—'}
            />
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">DRIP</dt>
              <dd>
                <span className={`text-sm font-medium ${account.drip_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {account.drip_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">PAD</dt>
              <dd>
                <span className={`text-sm font-medium ${account.pad_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {account.pad_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Banking Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-brand-black mb-4">Banking Information</h2>
          <dl className="space-y-3">
            <DetailRow label="Institution #" value={account.institution_number} />
            <DetailRow label="Branch / Transit #" value={account.branch_transit_number} />
            <DetailRow
              label="Account #"
              value={account.account_number ? `****${account.account_number.slice(-4)}` : null}
            />
          </dl>
          {account.notes && (
            <>
              <h3 className="text-sm font-medium text-gray-700 mt-6 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{account.notes}</p>
            </>
          )}
        </div>
      </div>

      {/* Class Assignment History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-brand-black">Share Class History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Class</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Rate</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Start Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">End Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classHistory && classHistory.length > 0 ? (
                classHistory.map((entry) => {
                  const entrySc = entry.share_class as { code: string; name: string; current_annual_rate: number } | null
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-blue-light text-brand-blue">
                          {entrySc?.code}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {entrySc ? `${(entrySc.current_annual_rate * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{entry.start_date}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{entry.end_date || '—'}</td>
                      <td className="px-6 py-3">
                        {!entry.end_date ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Current
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Ended</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No class history available
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

function DetailRow({
  label,
  value,
  href,
}: {
  label: string
  value: string | null
  href?: string
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">
        {href ? (
          <Link href={href} className="text-brand-blue hover:underline">
            {value || '—'}
          </Link>
        ) : (
          <span className="capitalize">{value || '—'}</span>
        )}
      </dd>
    </div>
  )
}
