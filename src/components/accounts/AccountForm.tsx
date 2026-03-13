'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { InvestmentAccount, Investor, ShareClass } from '@/lib/types/database'

interface Props {
  account?: InvestmentAccount
  investors: Investor[]
  shareClasses: ShareClass[]
}

export default function AccountForm({ account, investors, shareClasses }: Props) {
  const isEditing = !!account
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const preselectedInvestorId = searchParams.get('investor_id')

  const [form, setForm] = useState({
    investor_id: account?.investor_id || preselectedInvestorId || '',
    account_name: account?.account_name || '',
    account_type: account?.account_type || 'individual',
    share_class_id: account?.share_class_id || '',
    drip_enabled: account?.drip_enabled || false,
    pad_enabled: account?.pad_enabled ?? true,
    institution_number: account?.institution_number || '',
    branch_transit_number: account?.branch_transit_number || '',
    account_number: account?.account_number || '',
    notes: account?.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-populate account name based on investor if creating new
  useEffect(() => {
    if (!isEditing && form.investor_id && !form.account_name) {
      const inv = investors.find(i => i.id === form.investor_id)
      if (inv) {
        setForm(prev => ({ ...prev, account_name: `${inv.first_name} ${inv.last_name}` }))
      }
    }
  }, [form.investor_id, isEditing, investors, form.account_name])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    setForm(prev => ({ ...prev, [target.name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user!.id)
      .single()

    const payload = {
      investor_id: form.investor_id,
      account_name: form.account_name,
      account_type: form.account_type,
      share_class_id: form.share_class_id,
      drip_enabled: form.drip_enabled,
      pad_enabled: form.pad_enabled,
      institution_number: form.institution_number || null,
      branch_transit_number: form.branch_transit_number || null,
      account_number: form.account_number || null,
      notes: form.notes || null,
    }

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('investment_accounts')
        .update(payload)
        .eq('id', account.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
      router.push(`/dashboard/accounts/${account.id}`)
    } else {
      const { data, error: insertError } = await supabase
        .from('investment_accounts')
        .insert({ ...payload, created_by: appUser?.id })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }
      router.push(`/dashboard/accounts/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-4">Account Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Investor *</label>
            <select
              name="investor_id"
              value={form.investor_id}
              onChange={handleChange}
              required
              disabled={isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm disabled:bg-gray-100"
            >
              <option value="">Select an investor</option>
              {investors.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.last_name}, {inv.first_name} — {inv.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
            <input
              name="account_name"
              value={form.account_name}
              onChange={handleChange}
              required
              placeholder="e.g. 1831883 Ontario Ltd"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
            <select
              name="account_type"
              value={form.account_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
            >
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="registered">Registered (RRSP/TFSA/RESP)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share Class *</label>
            <select
              name="share_class_id"
              value={form.share_class_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
            >
              <option value="">Select share class</option>
              {shareClasses.map(sc => (
                <option key={sc.id} value={sc.id}>
                  {sc.code} — {(sc.current_annual_rate * 100).toFixed(2)}%
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-6 sm:col-span-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="drip_enabled"
                checked={form.drip_enabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm text-gray-700">DRIP Enabled</span>
              <span className="text-xs text-gray-400">(reinvest interest as units)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="pad_enabled"
                checked={form.pad_enabled}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              <span className="text-sm text-gray-700">PAD Enabled</span>
              <span className="text-xs text-gray-400">(include in PAD file)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-4">Banking Information</h2>
        <p className="text-xs text-gray-500 mb-4">Required for PAD payment processing</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution # (3 digits)</label>
            <input
              name="institution_number"
              value={form.institution_number}
              onChange={handleChange}
              maxLength={3}
              pattern="\d{3}"
              placeholder="e.g. 004"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch / Transit # (5 digits)</label>
            <input
              name="branch_transit_number"
              value={form.branch_transit_number}
              onChange={handleChange}
              maxLength={5}
              pattern="\d{5}"
              placeholder="e.g. 12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account # (7-12 digits)</label>
            <input
              name="account_number"
              value={form.account_number}
              onChange={handleChange}
              maxLength={12}
              placeholder="e.g. 1234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-brand-black mb-4">Notes</h2>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm resize-none"
          placeholder="Internal notes about this account..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
