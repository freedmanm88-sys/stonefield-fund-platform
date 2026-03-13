/**
 * Interest Calculation Engine for the Stonefield Capital MIC Fund Platform.
 *
 * Rules:
 *  - Full month interest: balance × annualRate / 12
 *  - Partial month interest: balance × annualRate / 12 / daysInMonth × daysHeld
 *  - Deposit date is inclusive (earns interest from that day)
 *  - Redemption date is exclusive (does NOT earn interest on the redemption day)
 *  - DRIP accounts: interest is converted to units at $1.00/unit (no PAD entry)
 *  - Multi-tranche: each deposit is calculated independently and summed
 */

export interface Tranche {
  balance: number
  depositDate: string   // YYYY-MM-DD
  redemptionDate?: string // YYYY-MM-DD — exclusive (no interest on this day)
}

export interface CalculationInput {
  annualRate: number
  balance: number
  depositDate: string
  redemptionDate?: string
  monthStart: string
  monthEnd: string
  daysInMonth: number
}

export interface MultiTrancheInput {
  annualRate: number
  tranches: Tranche[]
  monthStart: string
  monthEnd: string
  daysInMonth: number
}

export interface CalculationRunResult {
  accountId: string
  investorId: string
  interest: number
  isDrip: boolean
  unitIssued: number // units at $1.00/unit for DRIP accounts
}

export interface CalculationDiff {
  accountId: string
  previousInterest: number
  newInterest: number
  changed: boolean
}

// ── Valid month lifecycle transitions ──

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['calculated'],
  calculated: ['approved', 'open'],
  approved: ['closed'],
  closed: ['unlocked'],
  unlocked: ['approved'],
}

/**
 * Compute interest for a single tranche within one month.
 *
 * @returns interest amount rounded to 2 decimal places
 */
export function calculateInterest(input: CalculationInput): number {
  const { annualRate, balance, depositDate, redemptionDate, monthStart, monthEnd, daysInMonth } = input

  const start = new Date(depositDate) < new Date(monthStart)
    ? new Date(monthStart)
    : new Date(depositDate)

  let end: Date
  if (redemptionDate) {
    // Redemption date is exclusive — last interest day is the day before
    const redDate = new Date(redemptionDate)
    const monthEndDate = new Date(monthEnd)
    end = redDate < monthEndDate ? redDate : monthEndDate
    // end is exclusive already for redemption
  } else {
    // End of month is inclusive — add 1 to get exclusive boundary
    end = new Date(monthEnd)
    end.setDate(end.getDate() + 1) // make exclusive
  }

  // daysHeld = number of days the balance earns interest
  const daysHeld = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  )

  if (daysHeld <= 0) return 0

  // Full month shortcut: if daysHeld === daysInMonth → balance × rate / 12
  if (daysHeld === daysInMonth) {
    return round2(balance * annualRate / 12)
  }

  // Partial month: daily proration
  return round2((balance * annualRate / 12 / daysInMonth) * daysHeld)
}

/**
 * Compute interest across multiple tranches for one account in one month.
 * Each tranche is calculated independently and the results are summed.
 */
export function calculateMultiTranche(input: MultiTrancheInput): number {
  const total = input.tranches.reduce((sum, tranche) => {
    return sum + calculateInterest({
      annualRate: input.annualRate,
      balance: tranche.balance,
      depositDate: tranche.depositDate,
      redemptionDate: tranche.redemptionDate,
      monthStart: input.monthStart,
      monthEnd: input.monthEnd,
      daysInMonth: input.daysInMonth,
    })
  }, 0)

  return round2(total)
}

/**
 * For DRIP accounts, interest is converted to units at $1.00 per unit.
 */
export function calculateDripUnits(interest: number): number {
  return round2(interest) // 1 unit = $1.00
}

/**
 * Produce a diff between two calculation runs.
 */
export function diffCalculationRuns(
  previous: Map<string, number>,
  current: Map<string, number>,
): CalculationDiff[] {
  const allAccountIds = Array.from(new Set([...Array.from(previous.keys()), ...Array.from(current.keys())]))
  const diffs: CalculationDiff[] = []

  for (const accountId of allAccountIds) {
    const prev = previous.get(accountId) ?? 0
    const curr = current.get(accountId) ?? 0
    diffs.push({
      accountId,
      previousInterest: prev,
      newInterest: curr,
      changed: Math.abs(prev - curr) >= 0.005,
    })
  }

  return diffs
}

/**
 * Validate a month lifecycle transition.
 *
 * @returns `true` if the transition is allowed, `false` otherwise.
 */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Transition a month to a new status. Returns the new status or throws.
 */
export function transitionMonth(
  currentStatus: string,
  targetStatus: string,
  opts?: { reason?: string; userId?: string },
): { newStatus: string; historyEntry: Record<string, unknown> } {
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${targetStatus}`,
    )
  }

  // Unlock requires a reason
  if (targetStatus === 'unlocked' || (currentStatus === 'closed' && targetStatus === 'unlocked')) {
    if (!opts?.reason?.trim()) {
      throw new Error('Unlock requires a mandatory reason')
    }
  }

  return {
    newStatus: targetStatus,
    historyEntry: {
      from: currentStatus,
      to: targetStatus,
      changed_by: opts?.userId ?? 'system',
      changed_at: new Date().toISOString(),
      ...(opts?.reason ? { reason: opts.reason } : {}),
    },
  }
}

/** Round to 2 decimal places using banker's rounding avoidance */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
