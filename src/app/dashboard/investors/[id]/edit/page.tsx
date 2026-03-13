import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InvestorForm from '@/components/investors/InvestorForm'

export default async function EditInvestorPage({
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/dashboard/investors/${params.id}`} className="text-sm text-gray-500 hover:text-brand-blue">
          &larr; Back to {investor.first_name} {investor.last_name}
        </Link>
        <h1 className="text-2xl font-bold text-brand-black mt-2">Edit Investor</h1>
        <p className="text-sm text-gray-500 mt-1">Update {investor.first_name} {investor.last_name}&apos;s profile</p>
      </div>
      <InvestorForm investor={investor} />
    </div>
  )
}
