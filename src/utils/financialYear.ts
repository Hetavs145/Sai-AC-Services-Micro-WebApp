import { BillData } from '../types';

/**
 * Calculates Indian Financial Year (starts April 1st, ends March 31st).
 * Examples:
 *  - "2024-10-07" -> "FY 2024-25"
 *  - "2025-02-15" -> "FY 2024-25"
 *  - "2026-10-24" -> "FY 2026-27"
 */
export function calculateFinancialYear(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  // Fallback to current date if invalid
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const year = validDate.getFullYear();
  const month = validDate.getMonth() + 1; // 1-12

  let startYear: number;
  let endYear: number;

  if (month >= 4) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }

  const endYearShort = String(endYear).slice(-2);
  return `FY ${startYear}-${endYearShort}`;
}

/**
 * Extracts all unique financial years from stored bills, sorted descending,
 * ensuring the current FY is always available.
 */
export function getAvailableFinancialYears(bills: BillData[]): string[] {
  const currentFy = calculateFinancialYear();
  const fySet = new Set<string>();
  fySet.add(currentFy);

  bills.forEach((bill) => {
    const fy = bill.financialYear || calculateFinancialYear(bill.date);
    if (fy) fySet.add(fy);
  });

  return Array.from(fySet).sort().reverse();
}
