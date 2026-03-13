import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function InvestorDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: investor } = await supabase
    .from('investors')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!investor) {
    notFound()
  }

  // Fetch investment accounts for this investor
  const { data: accounts } = await supabase
    .from('investment_accounts')
    .select('*, share_class:share_classes(*)')
    .eq('investor_id', params.id)
    .order('account_name')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/investors" className="text-sm text-gray-500 hover:text-brand-blue">
            &larr; Back to Investors
          </Link>
          <h1 className="text-2xl font-bold text-brand-black mt-2">
            {investor.first_name} {investor.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{investor.email}</p>
        </div>
        <Link
          href={`/dashboard/investors/${investor.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Investor Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-brand-black mb-4">Personal Information</h2>
          <dl className="space-y-3">
            <DetailRow label="Name" value={`${investor.first_name} ${investor.last_name}`} />
            <DetailRow label="Email" value={investor.email} />
            <DetailRow label="Phone" value={investor.phone} />
            <DetailRow label="Cell Phone" value={investor.cell_phone} />
            <DetailRow label="Date of Birth" value={investor.date_of_birth} />
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-brand-black mb-4">Address</h2>
          <dl className="space-y-3">
            <DetailRow label="Street" value={investor.street_address} />
            <DetailRow label="City" value={investor.city} />
            <DetailRow label="Province" value={investor.province} />
            <DetailRow label="Postal Code" value={investor.postal_code} />
          </dl>
          {investor.notes && (
            <>
              <h3 className="text-sm font-medium text-gray-700 mt-6 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{investor.notes}</p>
            </>
          )}
        </div>
      </div>

      {/* Investment Accounts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-black">Investment Accounts</h2>
          <Link
            href={`/dashboard/accounts/new?investor_id=${investor.id}`}
            className="text-sm text-brand-blue hover:underline font-medium"
          >
            + Add Account
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Account Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Class</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">DRIP</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">PAD</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts && accounts.length > 0 ? (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/accounts/${account.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-blue"
                      >
                        {account.account_name}
                      </Link>
                      <p className="text-xs text-gray-400">{account.system_account_id}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-600 capitalize">{account.account_type}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-blue-light text-brand-blue">
                        {(account.share_class as { code: string } | null)?.code || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium ${account.drip_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {account.drip_enabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium ${account.pad_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {account.pad_enabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/dashboard/accounts/${account.id}/edit`} className="text-sm text-brand-blue hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No accounts yet.{' '}
                    <Link href={`/dashboard/accounts/new?investor_id=${investor.id}`} className="text-brand-blue hover:underline">
                      Create one
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

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value || '—'}</dd>
    </div>
  )
}
