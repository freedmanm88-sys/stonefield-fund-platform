import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import InvestorDeleteButton from '@/components/investors/InvestorDeleteButton'

export default async function InvestorsPage() {
  const supabase = createClient()

  const { data: investors, error } = await supabase
    .from('investors')
    .select('*')
    .order('last_name')
    .order('first_name')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Investors</h1>
          <p className="text-sm text-gray-500 mt-1">
            {investors?.length || 0} active investor{investors?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/investors/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Investor
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg">
          Error loading investors: {error.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">City</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {investors && investors.length > 0 ? (
                investors.map((investor) => (
                  <tr key={investor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/investors/${investor.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-blue"
                      >
                        {investor.last_name}, {investor.first_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{investor.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{investor.phone || investor.cell_phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{investor.city || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/investors/${investor.id}/edit`}
                          className="text-sm text-brand-blue hover:underline"
                        >
                          Edit
                        </Link>
                        <InvestorDeleteButton investorId={investor.id} investorName={`${investor.first_name} ${investor.last_name}`} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    No investors yet.{' '}
                    <Link href="/dashboard/investors/new" className="text-brand-blue hover:underline">
                      Add your first investor
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
