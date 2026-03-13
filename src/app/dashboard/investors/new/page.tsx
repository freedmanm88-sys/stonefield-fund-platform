import InvestorForm from '@/components/investors/InvestorForm'
import Link from 'next/link'

export default function NewInvestorPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/investors" className="text-sm text-gray-500 hover:text-brand-blue">
          &larr; Back to Investors
        </Link>
        <h1 className="text-2xl font-bold text-brand-black mt-2">Add Investor</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new investor profile</p>
      </div>
      <InvestorForm />
    </div>
  )
}
