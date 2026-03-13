'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { transitionMonthStatus } from '@/lib/actions/month-lifecycle'
import type { MonthlyPeriod } from '@/lib/types/database'
import { MONTH_STATUS_LABELS, MONTH_STATUS_COLORS } from '@/lib/types/database'

interface MonthLifecycleControlsProps {
  period: MonthlyPeriod
  userRole: 'admin' | 'team_member'
  isStale?: boolean
}

export default function MonthLifecycleControls({
  period,
  userRole,
  isStale,
}: MonthLifecycleControlsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const router = useRouter()

  const isAdmin = userRole === 'admin'

  async function handleTransition(target: string, reason?: string) {
    setLoading(true)
    setError('')
    const result = await transitionMonthStatus(period.id, target, reason)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  async function handleUnlock() {
    if (!unlockReason.trim()) {
      setError('Unlock reason is mandatory')
      return
    }
    await handleTransition('unlocked', unlockReason)
    setShowUnlockDialog(false)
    setUnlockReason('')
  }

  // Determine available actions based on current status
  const actions: { label: string; target: string; color: string; adminOnly: boolean; needsReason?: boolean }[] = []

  switch (period.status) {
    case 'open':
      actions.push({ label: 'Run Calculations', target: 'calculated', color: 'bg-brand-blue text-white hover:bg-brand-blue-hover', adminOnly: false })
      break
    case 'calculated':
      actions.push({ label: 'Approve', target: 'approved', color: 'bg-purple-600 text-white hover:bg-purple-700', adminOnly: true })
      actions.push({ label: 'Revert to Open', target: 'open', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200', adminOnly: true })
      break
    case 'approved':
      actions.push({ label: 'Close Month', target: 'closed', color: 'bg-gray-800 text-white hover:bg-gray-900', adminOnly: true })
      break
    case 'closed':
      actions.push({ label: 'Unlock', target: 'unlocked', color: 'bg-amber-500 text-white hover:bg-amber-600', adminOnly: true, needsReason: true })
      break
    case 'unlocked':
      actions.push({ label: 'Move to Approved', target: 'approved', color: 'bg-purple-600 text-white hover:bg-purple-700', adminOnly: true })
      break
  }

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span data-testid="month-status" className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${MONTH_STATUS_COLORS[period.status]}`}>
          {MONTH_STATUS_LABELS[period.status]}
        </span>

        {isStale && period.status !== 'closed' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
            Recalculation Required
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          if (action.adminOnly && !isAdmin) return null

          if (action.needsReason) {
            return (
              <button
                key={action.target}
                onClick={() => setShowUnlockDialog(true)}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${action.color}`}
              >
                {action.label}
              </button>
            )
          }

          return (
            <button
              key={action.target}
              onClick={() => handleTransition(action.target)}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors ${action.color}`}
            >
              {loading ? 'Processing...' : action.label}
            </button>
          )
        })}
      </div>

      {/* Status history */}
      {period.status_history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Status history ({period.status_history.length} transitions)
          </summary>
          <div className="mt-2 space-y-1">
            {period.status_history.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500 pl-2 border-l-2 border-gray-200">
                <span className="font-medium">{entry.from} &rarr; {entry.to}</span>
                <span>&middot;</span>
                <span>{new Date(entry.changed_at).toLocaleDateString()}</span>
                {entry.reason && (
                  <>
                    <span>&middot;</span>
                    <span className="italic">{entry.reason}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Unlock dialog */}
      {showUnlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Unlock Closed Month</h3>
            <p className="text-sm text-gray-600">
              Unlocking this month will void any active PAD file and allow edits.
              This action is logged in the audit trail.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                data-testid="unlock-reason"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={2}
                required
                placeholder="Mandatory reason for unlocking..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            {error && (
              <div data-testid="reason-error" className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowUnlockDialog(false); setError(''); setUnlockReason('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={loading || !unlockReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? 'Unlocking...' : 'Confirm Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
