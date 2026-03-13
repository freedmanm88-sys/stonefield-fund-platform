import { describe, it, expect } from 'vitest'
import {
  calculateInterest,
  calculateMultiTranche,
  calculateDripUnits,
  diffCalculationRuns,
  isValidTransition,
  transitionMonth,
} from '../calculations'

// ─────────────────────────────────────────────────────────────
// CALC-01 through CALC-08: Interest Calculation Engine
// ─────────────────────────────────────────────────────────────

describe('Interest Calculation Engine', () => {
  // April 2026 constants
  const APRIL = {
    monthStart: '2026-04-01',
    monthEnd: '2026-04-30',
    daysInMonth: 30,
  }

  // ── CALC-01: Full month interest, single tranche ──
  it('CALC-01: full month, single tranche — $100k @ 10%', () => {
    const result = calculateInterest({
      annualRate: 0.10, // Class E
      balance: 100_000,
      depositDate: '2026-04-01',
      ...APRIL,
    })
    // $100,000 × 10% / 12 = $833.33
    expect(result).toBeCloseTo(833.33, 2)
  })

  it('CALC-01b: full month interest when deposit predates the month', () => {
    // Deposit was March 1 but we are calculating April — should still be full month
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-03-01',
      ...APRIL,
    })
    expect(result).toBeCloseTo(833.33, 2)
  })

  // ── CALC-02: Partial month — mid-month deposit ──
  it('CALC-02: partial month mid-month deposit — $120k @ 9.35% deposited Apr 16', () => {
    const result = calculateInterest({
      annualRate: 0.0935, // Class G
      balance: 120_000,
      depositDate: '2026-04-16',
      ...APRIL,
    })
    // Days held = 15 (Apr 16-30 inclusive)
    // $120,000 × 9.35% / 12 / 30 × 15 = $467.50
    expect(result).toBeCloseTo(467.50, 2)
  })

  it('CALC-02b: deposit on last day of month — 1 day of interest', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-04-30',
      ...APRIL,
    })
    // 1 day: $100,000 × 10% / 12 / 30 × 1 = $27.78
    expect(result).toBeCloseTo(27.78, 2)
  })

  // ── CALC-03: Redemption day excluded ──
  it('CALC-03: redemption date excluded — redeem Apr 15', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-04-01',
      redemptionDate: '2026-04-15',
      ...APRIL,
    })
    // Days held = 14 (Apr 1-14). Redemption day (15th) excluded.
    // $100,000 × 10% / 12 / 30 × 14 ≈ $388.89
    expect(result).toBeCloseTo(388.89, 2)
  })

  it('CALC-03b: redemption on first day — zero interest', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-04-01',
      redemptionDate: '2026-04-01',
      ...APRIL,
    })
    expect(result).toBe(0)
  })

  // ── CALC-04: Multi-tranche calculation ──
  it('CALC-04: multi-tranche — $50k on Apr 1 + $50k on Apr 16', () => {
    const result = calculateMultiTranche({
      annualRate: 0.10, // Class E
      tranches: [
        { balance: 50_000, depositDate: '2026-04-01' },
        { balance: 50_000, depositDate: '2026-04-16' },
      ],
      ...APRIL,
    })
    // Tranche 1: $50k × 10% / 12 = $416.67 (full month)
    // Tranche 2: $50k × 10% / 12 / 30 × 15 = $208.33 (15 days)
    // Total: $625.00
    expect(result).toBeCloseTo(625.00, 2)
  })

  it('CALC-04b: multi-tranche with one redeemed mid-month', () => {
    const result = calculateMultiTranche({
      annualRate: 0.10,
      tranches: [
        { balance: 50_000, depositDate: '2026-04-01', redemptionDate: '2026-04-15' },
        { balance: 50_000, depositDate: '2026-04-01' },
      ],
      ...APRIL,
    })
    // Tranche 1: 14 days → $50k × 10% / 12 / 30 × 14 = $194.44
    // Tranche 2: full month → $50k × 10% / 12 = $416.67
    // Total = $611.11
    expect(result).toBeCloseTo(611.11, 2)
  })

  // ── CALC-05: DRIP account ──
  it('CALC-05: DRIP account — interest converted to units at $1.00/unit', () => {
    const interest = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-04-01',
      ...APRIL,
    })
    const units = calculateDripUnits(interest)

    // Interest = $833.33, units = 833.33 at $1/unit
    expect(interest).toBeCloseTo(833.33, 2)
    expect(units).toBeCloseTo(833.33, 2)
  })

  it('CALC-05b: DRIP units for partial month', () => {
    const interest = calculateInterest({
      annualRate: 0.0935,
      balance: 120_000,
      depositDate: '2026-04-16',
      ...APRIL,
    })
    const units = calculateDripUnits(interest)
    expect(units).toBeCloseTo(467.50, 2)
  })

  // ── CALC-06: Calculation diff view ──
  it('CALC-06: diff view shows changes between calculation runs', () => {
    const previousRun = new Map<string, number>([
      ['acct-1', 833.33],
      ['acct-2', 467.50],
      ['acct-3', 416.67],
    ])

    // After adding a transaction, acct-2 changes
    const newRun = new Map<string, number>([
      ['acct-1', 833.33],
      ['acct-2', 625.00],
      ['acct-3', 416.67],
    ])

    const diffs = diffCalculationRuns(previousRun, newRun)

    expect(diffs).toHaveLength(3)

    const acct1 = diffs.find((d) => d.accountId === 'acct-1')!
    expect(acct1.changed).toBe(false)
    expect(acct1.previousInterest).toBe(833.33)
    expect(acct1.newInterest).toBe(833.33)

    const acct2 = diffs.find((d) => d.accountId === 'acct-2')!
    expect(acct2.changed).toBe(true)
    expect(acct2.previousInterest).toBe(467.50)
    expect(acct2.newInterest).toBe(625.00)

    const acct3 = diffs.find((d) => d.accountId === 'acct-3')!
    expect(acct3.changed).toBe(false)
  })

  it('CALC-06b: diff detects new accounts not in previous run', () => {
    const previousRun = new Map<string, number>([
      ['acct-1', 833.33],
    ])
    const newRun = new Map<string, number>([
      ['acct-1', 833.33],
      ['acct-new', 500.00],
    ])

    const diffs = diffCalculationRuns(previousRun, newRun)
    const newAcct = diffs.find((d) => d.accountId === 'acct-new')!
    expect(newAcct.changed).toBe(true)
    expect(newAcct.previousInterest).toBe(0)
    expect(newAcct.newInterest).toBe(500.00)
  })

  // ── CALC-07: Stale calculation detection ──
  it('CALC-07: stale calculation detected when amounts differ', () => {
    const previousRun = new Map<string, number>([
      ['acct-1', 833.33],
    ])
    const afterNewDeposit = new Map<string, number>([
      ['acct-1', 1041.67],
    ])

    const diffs = diffCalculationRuns(previousRun, afterNewDeposit)
    const hasStaleCalc = diffs.some((d) => d.changed)
    expect(hasStaleCalc).toBe(true)
  })

  it('CALC-07b: no stale flag when calculations are identical', () => {
    const run1 = new Map<string, number>([['acct-1', 833.33]])
    const run2 = new Map<string, number>([['acct-1', 833.33]])

    const diffs = diffCalculationRuns(run1, run2)
    const hasStaleCalc = diffs.some((d) => d.changed)
    expect(hasStaleCalc).toBe(false)
  })

  // ── CALC-08: Calculation history preserved ──
  it('CALC-08: previous and new calculation runs stored independently', () => {
    // Simulate two separate runs stored as snapshots
    const run1Timestamp = '2026-04-28T10:00:00Z'
    const run1Results = new Map<string, number>([
      ['acct-1', 833.33],
      ['acct-2', 467.50],
    ])

    const run2Timestamp = '2026-04-28T14:00:00Z'
    const run2Results = new Map<string, number>([
      ['acct-1', 833.33],
      ['acct-2', 625.00],
    ])

    // Both snapshots exist (different timestamps means different records)
    expect(run1Timestamp).not.toBe(run2Timestamp)
    expect(run1Results.get('acct-2')).not.toBe(run2Results.get('acct-2'))

    // Diff correctly shows the change
    const diffs = diffCalculationRuns(run1Results, run2Results)
    expect(diffs.find((d) => d.accountId === 'acct-2')!.changed).toBe(true)
    expect(diffs.find((d) => d.accountId === 'acct-1')!.changed).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────
// Month Lifecycle State Machine (unit-level validation)
// ─────────────────────────────────────────────────────────────

describe('Month Lifecycle State Machine', () => {
  // ── Valid transitions ──
  it('allows open → calculated', () => {
    expect(isValidTransition('open', 'calculated')).toBe(true)
  })

  it('allows calculated → approved', () => {
    expect(isValidTransition('calculated', 'approved')).toBe(true)
  })

  it('allows approved → closed', () => {
    expect(isValidTransition('approved', 'closed')).toBe(true)
  })

  it('allows closed → unlocked', () => {
    expect(isValidTransition('closed', 'unlocked')).toBe(true)
  })

  it('allows calculated → open (revert)', () => {
    expect(isValidTransition('calculated', 'open')).toBe(true)
  })

  // ── Invalid transitions ──
  it('blocks open → approved (must go through calculated)', () => {
    expect(isValidTransition('open', 'approved')).toBe(false)
  })

  it('blocks open → closed', () => {
    expect(isValidTransition('open', 'closed')).toBe(false)
  })

  it('blocks closed → open', () => {
    expect(isValidTransition('closed', 'open')).toBe(false)
  })

  it('blocks approved → open', () => {
    expect(isValidTransition('approved', 'open')).toBe(false)
  })

  // ── transitionMonth() ──
  it('transitionMonth returns new status and history entry', () => {
    const result = transitionMonth('open', 'calculated', { userId: 'user-123' })
    expect(result.newStatus).toBe('calculated')
    expect(result.historyEntry.from).toBe('open')
    expect(result.historyEntry.to).toBe('calculated')
    expect(result.historyEntry.changed_by).toBe('user-123')
  })

  it('transitionMonth throws on invalid transition', () => {
    expect(() => transitionMonth('open', 'closed')).toThrow('Invalid transition')
  })

  it('unlock requires a mandatory reason', () => {
    expect(() => transitionMonth('closed', 'unlocked', { userId: 'admin' }))
      .toThrow('Unlock requires a mandatory reason')
  })

  it('unlock without reason (empty string) is blocked', () => {
    expect(() => transitionMonth('closed', 'unlocked', { userId: 'admin', reason: '  ' }))
      .toThrow('Unlock requires a mandatory reason')
  })

  it('unlock with reason succeeds', () => {
    const result = transitionMonth('closed', 'unlocked', {
      userId: 'admin',
      reason: 'Late correction needed',
    })
    expect(result.newStatus).toBe('unlocked')
    expect(result.historyEntry.reason).toBe('Late correction needed')
  })
})

// ─────────────────────────────────────────────────────────────
// Edge cases & boundary conditions
// ─────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('zero balance returns zero interest', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 0,
      depositDate: '2026-04-01',
      monthStart: '2026-04-01',
      monthEnd: '2026-04-30',
      daysInMonth: 30,
    })
    expect(result).toBe(0)
  })

  it('zero annual rate returns zero interest', () => {
    const result = calculateInterest({
      annualRate: 0,
      balance: 100_000,
      depositDate: '2026-04-01',
      monthStart: '2026-04-01',
      monthEnd: '2026-04-30',
      daysInMonth: 30,
    })
    expect(result).toBe(0)
  })

  it('deposit after month end returns zero interest', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-05-01',
      monthStart: '2026-04-01',
      monthEnd: '2026-04-30',
      daysInMonth: 30,
    })
    expect(result).toBe(0)
  })

  it('February 28-day month calculates correctly', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-02-01',
      monthStart: '2026-02-01',
      monthEnd: '2026-02-28',
      daysInMonth: 28,
    })
    // Full month: $100,000 × 10% / 12 = $833.33
    expect(result).toBeCloseTo(833.33, 2)
  })

  it('31-day month calculates correctly for partial', () => {
    const result = calculateInterest({
      annualRate: 0.10,
      balance: 100_000,
      depositDate: '2026-01-16',
      monthStart: '2026-01-01',
      monthEnd: '2026-01-31',
      daysInMonth: 31,
    })
    // 16 days (Jan 16-31): $100,000 × 10% / 12 / 31 × 16 = $430.11
    expect(result).toBeCloseTo(430.11, 2)
  })

  it('multi-tranche with empty array returns zero', () => {
    const result = calculateMultiTranche({
      annualRate: 0.10,
      tranches: [],
      monthStart: '2026-04-01',
      monthEnd: '2026-04-30',
      daysInMonth: 30,
    })
    expect(result).toBe(0)
  })
})
