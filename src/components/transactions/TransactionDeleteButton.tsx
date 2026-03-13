'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTransaction } from '@/lib/actions/transactions'

interface TransactionDeleteButtonProps {
  transactionId: string
  transactionDescription?: string
}

export default function TransactionDeleteButton({
  transactionId,
  transactionDescription,
}: TransactionDeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    if (!reason.trim()) {
      setError('Deletion reason is required')
      return
    }

    setLoading(true)
    setError('')
    const result = await deleteTransaction(transactionId, reason)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setShowConfirm(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-red-600 hover:text-red-800 font-medium"
      >
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Transaction</h3>
            <p className="text-sm text-gray-600">
              This will soft-delete the transaction
              {transactionDescription ? ` "${transactionDescription}"` : ''}.
              If a PAD file exists for this month, it will be automatically voided.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                placeholder="Mandatory reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowConfirm(false); setError(''); setReason('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || !reason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
