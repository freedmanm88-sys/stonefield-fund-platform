'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  investorId: string
  investorName: string
}

export default function InvestorDeleteButton({ investorId }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Get app user for deleted_by
    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user!.id)
      .single()

    // Soft delete
    await supabase
      .from('investors')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: appUser?.id,
      })
      .eq('id', investorId)

    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-red-500 hover:underline"
    >
      Delete
    </button>
  )
}
