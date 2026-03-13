'use server'

import { createClient } from '@/lib/supabase/server'
import { createJournalLines } from '@/lib/journal-entries'
import type { TransactionType } from '@/lib/types/database'
import { revalidatePath } from 'next/cache'

export interface CreateTransactionInput {
  investmentAccountId: string
  monthlyPeriodId: string
  transactionType: TransactionType
  amount: number
  transactionDate: string
  description?: string
  reason?: string
  sourceAccountId?: string
  destinationAccountId?: string
}

export async function createTransaction(input: CreateTransactionInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return { error: 'User not found' }

  // Manual adjustments require admin + reason
  if (input.transactionType === 'manual_adjustment') {
    if (appUser.role !== 'admin') return { error: 'Only admins can create manual adjustments' }
    if (!input.reason?.trim()) return { error: 'Manual adjustments require a reason' }
  }

  // Insert transaction
  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .insert({
      investment_account_id: input.investmentAccountId,
      monthly_period_id: input.monthlyPeriodId,
      transaction_type: input.transactionType,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description || null,
      reason: input.reason || null,
      source_account_id: input.sourceAccountId || null,
      destination_account_id: input.destinationAccountId || null,
      created_by: appUser.id,
    })
    .select()
    .single()

  if (txnError) return { error: txnError.message }

  // Create journal entries (double-entry GL)
  const lines = createJournalLines(input.transactionType, input.amount)
  if (lines.length > 0) {
    const journalRows = lines.map((line) => ({
      transaction_id: txn.id,
      account_code: line.accountCode,
      account_name: line.accountName,
      debit: line.debit,
      credit: line.credit,
      entry_date: input.transactionDate,
      description: input.description || `${input.transactionType} transaction`,
      created_by: appUser.id,
    }))

    const { error: journalError } = await supabase
      .from('journal_entries')
      .insert(journalRows)

    if (journalError) {
      console.error('Journal entry creation failed:', journalError)
    }
  }

  // Mark calculations as stale for this month
  await markCalculationsStale(supabase, input.monthlyPeriodId)

  revalidatePath('/dashboard/ledger')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard')

  return { data: txn }
}

export async function deleteTransaction(transactionId: string, reason: string) {
  if (!reason?.trim()) return { error: 'Deletion reason is required' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return { error: 'User not found' }
  if (appUser.role !== 'admin') return { error: 'Only admins can delete transactions' }

  // Get the transaction to find its month
  const { data: txn } = await supabase
    .from('transactions')
    .select('id, monthly_period_id')
    .eq('id', transactionId)
    .single()

  if (!txn) return { error: 'Transaction not found' }

  // Soft-delete the transaction
  const { error } = await supabase
    .from('transactions')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: appUser.id,
      deleted_reason: reason,
    })
    .eq('id', transactionId)

  if (error) return { error: error.message }

  // Soft-delete associated journal entries
  await supabase
    .from('journal_entries')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: appUser.id,
    })
    .eq('transaction_id', transactionId)

  // Auto-void any active PAD for this month
  await autoVoidPad(supabase, txn.monthly_period_id, appUser.id, `Transaction deleted: ${reason}`)

  // Mark calculations as stale
  await markCalculationsStale(supabase, txn.monthly_period_id)

  revalidatePath('/dashboard/ledger')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard')

  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markCalculationsStale(supabase: any, monthlyPeriodId: string) {
  await supabase
    .from('interest_calculation_runs')
    .update({ is_stale: true })
    .eq('monthly_period_id', monthlyPeriodId)
    .eq('is_stale', false)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoVoidPad(supabase: any, monthlyPeriodId: string, userId: string, reason: string) {
  const { data: activePad } = await supabase
    .from('pad_files')
    .select('id')
    .eq('monthly_period_id', monthlyPeriodId)
    .eq('status', 'active')
    .maybeSingle()

  if (activePad) {
    await supabase
      .from('pad_files')
      .update({
        status: 'void',
        void_reason: reason,
        voided_by: userId,
        voided_at: new Date().toISOString(),
      })
      .eq('id', activePad.id)
  }
}
