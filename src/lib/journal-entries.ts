/**
 * Double-entry GL engine — maps each transaction type to its journal entries
 * per spec §8.1.
 */

import type { TransactionType } from './types/database'

export interface JournalLine {
  accountCode: string
  accountName: string
  debit: number
  credit: number
}

/**
 * Given a transaction type and amount, return the pair of journal entry lines.
 * Amount is always positive — debit/credit direction is determined by type.
 */
export function createJournalLines(
  type: TransactionType,
  amount: number,
): JournalLine[] {
  const amt = Math.abs(amount)

  switch (type) {
    // Deposit: Dr. Cash / Cr. Investor Capital
    case 'deposit':
      return [
        { accountCode: '1000', accountName: 'Cash', debit: amt, credit: 0 },
        { accountCode: '3000', accountName: 'Investor Capital', debit: 0, credit: amt },
      ]

    // Redemption: Dr. Investor Capital / Cr. Cash
    case 'redemption':
      return [
        { accountCode: '3000', accountName: 'Investor Capital', debit: amt, credit: 0 },
        { accountCode: '1000', accountName: 'Cash', debit: 0, credit: amt },
      ]

    // Interest Accrual: Dr. Interest Expense / Cr. Interest Payable
    case 'interest_accrual':
      return [
        { accountCode: '5000', accountName: 'Interest Expense', debit: amt, credit: 0 },
        { accountCode: '2000', accountName: 'Interest Payable', debit: 0, credit: amt },
      ]

    // Interest Payout (PAD): Dr. Interest Payable / Cr. Cash
    case 'interest_payout':
      return [
        { accountCode: '2000', accountName: 'Interest Payable', debit: amt, credit: 0 },
        { accountCode: '1000', accountName: 'Cash', debit: 0, credit: amt },
      ]

    // DRIP Conversion: Dr. Interest Payable / Cr. Investor Capital
    case 'drip_conversion':
      return [
        { accountCode: '2000', accountName: 'Interest Payable', debit: amt, credit: 0 },
        { accountCode: '3000', accountName: 'Investor Capital', debit: 0, credit: amt },
      ]

    // Account Transfer: Dr. Source Capital / Cr. Dest Capital
    case 'account_transfer':
      return [
        { accountCode: '3000', accountName: 'Investor Capital (Source)', debit: amt, credit: 0 },
        { accountCode: '3000', accountName: 'Investor Capital (Dest)', debit: 0, credit: amt },
      ]

    // Share Class Transfer: internal reclassification
    case 'share_class_transfer':
      return [
        { accountCode: '3000', accountName: 'Investor Capital (Old Class)', debit: amt, credit: 0 },
        { accountCode: '3000', accountName: 'Investor Capital (New Class)', debit: 0, credit: amt },
      ]

    // Revenue Entry: Dr. Cash / Cr. Interest Revenue
    case 'revenue':
      return [
        { accountCode: '1000', accountName: 'Cash', debit: amt, credit: 0 },
        { accountCode: '4000', accountName: 'Interest Revenue', debit: 0, credit: amt },
      ]

    // Expense Entry: Dr. Expense Category / Cr. Cash
    case 'expense':
      return [
        { accountCode: '5100', accountName: 'Operating Expenses', debit: amt, credit: 0 },
        { accountCode: '1000', accountName: 'Cash', debit: 0, credit: amt },
      ]

    // Manual Adjustment: Custom Dr./Cr. — default to RE adjustment
    case 'manual_adjustment':
      return [
        { accountCode: '3100', accountName: 'Retained Earnings', debit: amt, credit: 0 },
        { accountCode: '1000', accountName: 'Cash', debit: 0, credit: amt },
      ]

    default:
      return []
  }
}

/**
 * Validates that journal lines balance (total debits === total credits).
 */
export function validateJournalBalance(lines: JournalLine[]): boolean {
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0)
  return Math.abs(totalDebit - totalCredit) < 0.005
}
