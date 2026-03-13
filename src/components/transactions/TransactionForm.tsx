'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction, type CreateTransactionInput } from '@/lib/actions/transactions'
import type { InvestmentAccount, MonthlyPeriod, TransactionType } from '@/lib/types/database'
import { TRANSACTION_TYPES } from '@/lib/types/database'

interface TransactionFormProps {
  accounts: (InvestmentAccount & { investor?: { first_name: string; last_name: string }; share_class?: { code: string } })[]
  periods: MonthlyPeriod[]
  preselectedAccountId?: string
  preselectedPeriodId?: string
}

export default function TransactionForm({
  accounts,
  periods,
  preselectedAccountId,
  preselectedPeriodId,
}: TransactionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [accountId, setAccountId] = useState(preselectedAccountId || '')
  const [periodId, setPeriodId] = useState(preselectedPeriodId || '')
  const [txnType, setTxnType] = useState<TransactionType>('deposit')
  const [amount, setAmount] = useState('')
  const [txnDate, setTxnDate] = useState('')
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destAccountId, setDestAccountId] = useState('')

  // Auto-select first available period
  useEffect(() => {
    if (!periodId && periods.length > 0) {
      const openPeriod = periods.find((p) => p.status === 'open')
      if (openPeriod) setPeriodId(openPeriod.id)
    }
  }, [periods, periodId])

  const isTransfer = txnType === 'account_transfer' || txnType === 'share_class_transfer'
  const needsReason = txnType === 'manual_adjustment'

  // Filter to writable periods only
  const writablePeriods = periods.filter((p) =>
    ['open', 'calculated', 'unlocked'].includes(p.status),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const input: CreateTransactionInput = {
      investmentAccountId: accountId,
      monthlyPeriodId: periodId,
      transactionType: txnType,
      amount: parseFloat(amount),
      transactionDate: txnDate,
      description: description || undefined,
      reason: reason || undefined,
      sourceAccountId: isTransfer ? sourceAccountId || undefined : undefined,
      destinationAccountId: isTransfer ? destAccountId || undefined : undefined,
    }

    const result = await createTransaction(input)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/dashboard/transactions')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Period</label>
        <select
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
        >
          <option value="">Select period...</option>
          {writablePeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {new Date(p.period_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}{' '}
              ({p.status})
            </option>
          ))}
        </select>
      </div>

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
        <select
          value={txnType}
          onChange={(e) => setTxnType(e.target.value as TransactionType)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Account */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Investment Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
        >
          <option value="">Select account...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_name}
              {a.investor ? ` — ${a.investor.first_name} ${a.investor.last_name}` : ''}
              {a.share_class ? ` (${a.share_class.code})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Transfer fields */}
      {isTransfer && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Account</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
            >
              <option value="">Select source...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Account</label>
            <select
              value={destAccountId}
              onChange={(e) => setDestAccountId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
            >
              <option value="">Select destination...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
        <input
          type="date"
          value={txnDate}
          onChange={(e) => setTxnDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
        />
      </div>

      {/* Reason (for manual adjustments) */}
      {needsReason && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={2}
            placeholder="Mandatory reason for manual adjustment"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue-hover disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Transaction'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
