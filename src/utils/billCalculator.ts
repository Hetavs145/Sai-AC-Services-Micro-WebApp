import { BillItem } from '../types';

export function extractNumericQty(qtyStr: string | number): number {
  if (typeof qtyStr === 'number') {
    return isNaN(qtyStr) ? 0 : qtyStr;
  }
  if (!qtyStr) return 0;
  // Match digits and optional decimal
  const match = String(qtyStr).match(/[\d.]+/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateItemAmount(qty: string | number, rate: number): number {
  const numericQty = extractNumericQty(qty);
  const safeRate = typeof rate === 'number' && !isNaN(rate) ? rate : (parseFloat(String(rate)) || 0);
  const total = numericQty * safeRate;
  return isNaN(total) ? 0 : Math.round(total * 100) / 100;
}

export interface TotalsResult {
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateBillTotals(
  items: BillItem[] = [],
  cgstPercent = 9,
  sgstPercent = 9,
  igstPercent = 0,
  roundToNearestRupee = true,
  isGst = true
): TotalsResult {
  const actualCgst = isGst ? (Number(cgstPercent) || 0) : 0;
  const actualSgst = isGst ? (Number(sgstPercent) || 0) : 0;
  const actualIgst = isGst ? (Number(igstPercent) || 0) : 0;

  const subtotal = (items || []).reduce((sum, item) => {
    let amt = 0;
    if (typeof item.amount === 'number' && !isNaN(item.amount)) {
      amt = item.amount;
    } else {
      const safeRate = typeof item.rate === 'number' ? item.rate : (parseFloat(String(item.rate)) || 0);
      amt = calculateItemAmount(item.qty, safeRate);
    }
    return sum + (Number(amt) || 0);
  }, 0);

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const cgstAmount = Math.round(roundedSubtotal * (actualCgst / 100) * 100) / 100;
  const sgstAmount = Math.round(roundedSubtotal * (actualSgst / 100) * 100) / 100;
  const igstAmount = Math.round(roundedSubtotal * (actualIgst / 100) * 100) / 100;
  
  const rawGrandTotal = roundedSubtotal + cgstAmount + sgstAmount + igstAmount;
  let grandTotal = Math.round(rawGrandTotal * 100) / 100;
  let roundOff = 0;

  if (roundToNearestRupee) {
    const rounded = Math.round(rawGrandTotal);
    roundOff = Math.round((rounded - rawGrandTotal) * 100) / 100;
    grandTotal = rounded;
  }

  return {
    subtotal: isNaN(roundedSubtotal) ? 0 : roundedSubtotal,
    cgstAmount: isNaN(cgstAmount) ? 0 : cgstAmount,
    sgstAmount: isNaN(sgstAmount) ? 0 : sgstAmount,
    igstAmount: isNaN(igstAmount) ? 0 : igstAmount,
    roundOff: isNaN(roundOff) ? 0 : roundOff,
    grandTotal: isNaN(grandTotal) ? 0 : grandTotal,
  };
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '');
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

/**
 * Converts a positive number to Indian Currency Words (e.g. 22798 -> "Twenty Two Thousand Seven Hundred Ninety Eight Only")
 */
export function numberToIndianWords(amount: number): string {
  if (amount === 0 || amount === null || amount === undefined) {
    return 'Zero Rupees Only';
  }
  const safeAmount = Number(amount);
  if (isNaN(safeAmount) || safeAmount <= 0) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.round(safeAmount * 100) / 100;
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100);

  let n = integerPart;
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    parts.push(convertBelowThousand(crore) + ' Crore');
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    parts.push(convertBelowThousand(lakh) + ' Lakh');
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    parts.push(convertBelowThousand(thousand) + ' Thousand');
  }

  if (n > 0) {
    parts.push(convertBelowThousand(n));
  }

  let words = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!words) {
    words = 'Zero';
  }
  if (decimalPart > 0) {
    const decimalWords = convertBelowThousand(decimalPart);
    words += ` and ${decimalWords} Paise`;
  }
  return `${words} Only`;
}
