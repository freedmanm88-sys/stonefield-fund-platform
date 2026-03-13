import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AccountForm from '@/components/accounts/AccountForm'

export default async function NewAccountPage() {
  const supabase = createClient()

  const [investorsRes, classesRes] = await Promise.all([
    supabase.from('investors').select('*').order('last_name').order('first_name'),
    supabase.from('share_classes').select('*').order('code'),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/accounts" className="text-sm text-gray-500 hover:text-brand-blue">
          &larr; Back to Accounts
        </Link>
        <h1 className="text-2xl font-bold text-brand-black mt-2">Add Investment Account</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new investment account for an investor</p>
      </div>
      <AccountForm
        investors={investorsRes.data || []}
        shareClasses={classesRes.data || []}
      />
    </div>
  )
}
