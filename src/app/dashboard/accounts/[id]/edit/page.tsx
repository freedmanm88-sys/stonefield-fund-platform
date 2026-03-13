import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AccountForm from '@/components/accounts/AccountForm'

export default async function EditAccountPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const [accountRes, investorsRes, classesRes] = await Promise.all([
    supabase
      .from('investment_accounts')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase.from('investors').select('*').order('last_name').order('first_name'),
    supabase.from('share_classes').select('*').order('code'),
  ])

  if (!accountRes.data) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/dashboard/accounts/${params.id}`} className="text-sm text-gray-500 hover:text-brand-blue">
          &larr; Back to {accountRes.data.account_name}
        </Link>
        <h1 className="text-2xl font-bold text-brand-black mt-2">Edit Account</h1>
        <p className="text-sm text-gray-500 mt-1">Update {accountRes.data.account_name}</p>
      </div>
      <AccountForm
        account={accountRes.data}
        investors={investorsRes.data || []}
        shareClasses={classesRes.data || []}
      />
    </div>
  )
}
