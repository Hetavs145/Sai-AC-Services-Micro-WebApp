import { BillItem } from '../types';

export function extractNumericQty(qtyStr: string | number): number {
  if (typeof qtyStr === 'number') return qtyStr;
  if (!qtyStr) return 0;
  // Match digits and optional decimal
  const match = qtyStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function calculateItemAmount(qty: string | number, rate: number): number {
  const numericQty = extractNumericQty(qty);
  const total = numericQty * (rate || 0);
  return Math.round(total * 100) / 100;
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
  items: BillItem[],
  cgstPercent = 9,
  sgstPercent = 9,
  igstPercent = 0,
  roundToNearestRupee = true
): TotalsResult {
  const subtotal = items.reduce((sum, item) => {
    const amt = typeof item.amount === 'number' && !isNaN(item.amount) 
      ? item.amount 
      : calculateItemAmount(item.qty, item.rate);
    return sum + amt;
  }, 0);

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const cgstAmount = Math.round(roundedSubtotal * (cgstPercent / 100) * 100) / 100;
  const sgstAmount = Math.round(roundedSubtotal * (sgstPercent / 100) * 100) / 100;
  const igstAmount = Math.round(roundedSubtotal * (igstPercent / 100) * 100) / 100;
  
  const rawGrandTotal = roundedSubtotal + cgstAmount + sgstAmount + igstAmount;
  let grandTotal = Math.round(rawGrandTotal * 100) / 100;
  let roundOff = 0;

  if (roundToNearestRupee) {
    const rounded = Math.round(rawGrandTotal);
    roundOff = Math.round((rounded - rawGrandTotal) * 100) / 100;
    grandTotal = rounded;
  }

  return {
    subtotal: roundedSubtotal,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    grandTotal,
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
  if (amount === 0) return 'Zero Rupees Only';
  if (isNaN(amount) || amount < 0) return '';

  const rounded = Math.round(amount * 100) / 100;
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
  if (decimalPart > 0) {
    const decimalWords = convertBelowThousand(decimalPart);
    words += ` and ${decimalWords} Paise`;
  }
  return `${words} Only`;
}
