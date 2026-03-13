'use server'

import { createClient } from '@/lib/supabase/server'
import { transitionMonth } from '@/lib/calculations'
import { revalidatePath } from 'next/cache'

export async function transitionMonthStatus(
  periodId: string,
  targetStatus: string,
  reason?: string,
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return { error: 'User not found' }

  // Admin-only transitions: approve, close, unlock
  const adminOnly = ['approved', 'closed', 'unlocked']
  if (adminOnly.includes(targetStatus) && appUser.role !== 'admin') {
    return { error: 'Only admins can perform this action' }
  }

  // Get current period
  const { data: period } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('id', periodId)
    .single()

  if (!period) return { error: 'Monthly period not found' }

  // Validate transition
  try {
    const result = transitionMonth(period.status, targetStatus, {
      reason,
      userId: appUser.id,
    })

    const updateData: Record<string, unknown> = {
      status: result.newStatus,
      status_history: [...(period.status_history || []), result.historyEntry],
    }

    // Set closed_at/closed_by when closing
    if (targetStatus === 'closed') {
      updateData.closed_at = new Date().toISOString()
      updateData.closed_by = appUser.id
    }

    // Clear closed_at when unlocking
    if (targetStatus === 'unlocked') {
      updateData.closed_at = null
      updateData.closed_by = null
    }

    const { error } = await supabase
      .from('monthly_periods')
      .update(updateData)
      .eq('id', periodId)

    if (error) return { error: error.message }

    // Auto-void PAD when unlocking
    if (targetStatus === 'unlocked') {
      const { data: activePad } = await supabase
        .from('pad_files')
        .select('id')
        .eq('monthly_period_id', periodId)
        .eq('status', 'active')
        .maybeSingle()

      if (activePad) {
        await supabase
          .from('pad_files')
          .update({
            status: 'void',
            void_reason: `Month unlocked: ${reason}`,
            voided_by: appUser.id,
            voided_at: new Date().toISOString(),
          })
          .eq('id', activePad.id)
      }

      // Mark calculations as stale
      await supabase
        .from('interest_calculation_runs')
        .update({ is_stale: true })
        .eq('monthly_period_id', periodId)
        .eq('is_stale', false)
    }

    // When reverting calculated → open, mark calcs stale
    if (period.status === 'calculated' && targetStatus === 'open') {
      await supabase
        .from('interest_calculation_runs')
        .update({ is_stale: true })
        .eq('monthly_period_id', periodId)
        .eq('is_stale', false)
    }

    revalidatePath('/dashboard/ledger')
    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard')

    return { data: result }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function createMonthlyPeriod(periodDate: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!appUser) return { error: 'User not found' }

  const { data, error } = await supabase
    .from('monthly_periods')
    .insert({
      period_date: periodDate,
      status: 'open',
      status_history: [],
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/ledger')
  return { data }
}
