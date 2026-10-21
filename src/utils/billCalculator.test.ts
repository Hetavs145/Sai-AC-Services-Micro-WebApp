import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractNumericQty,
  calculateItemAmount,
  calculateBillTotals,
  numberToIndianWords,
} from './billCalculator';
import { BillItem } from '../types';

test('extractNumericQty extracts numbers from units', () => {
  assert.equal(extractNumericQty('46rft.'), 46);
  assert.equal(extractNumericQty('80rft.'), 80);
  assert.equal(extractNumericQty('10.5 kg'), 10.5);
  assert.equal(extractNumericQty(15), 15);
  assert.equal(extractNumericQty(''), 0);
});

test('calculateItemAmount computes quantity times rate', () => {
  assert.equal(calculateItemAmount('46rft.', 200), 9200);
  assert.equal(calculateItemAmount('46rft.', 40), 1840);
  assert.equal(calculateItemAmount('80rft.', 50), 4000);
  assert.equal(calculateItemAmount('107rft.', 40), 4280);
});

test('calculateBillTotals matches user template Sai AC Services invoice #28', () => {
  const items: BillItem[] = [
    { id: '1', particulars: 'Copper pipe with insulation', hsnCode: '7411', qty: '46rft.', rate: 200, amount: 9200 },
    { id: '2', particulars: '4 core cable', hsnCode: '8544', qty: '46rft.', rate: 40, amount: 1840 },
    { id: '3', particulars: 'UPVC drainpipe', hsnCode: '3917', qty: '80rft.', rate: 50, amount: 4000 },
    { id: '4', particulars: 'Jari Work', hsnCode: '-', qty: '107rft.', rate: 40, amount: 4280 },
  ];

  const totals = calculateBillTotals(items, 9, 9, 0);

  assert.equal(totals.subtotal, 19320);
  assert.equal(totals.cgstAmount, 1738.80);
  assert.equal(totals.sgstAmount, 1738.80);
  assert.equal(totals.grandTotal, 22798.00);
});

test('calculateBillTotals zeroes taxes for Non-GST companies (Hetav Shah, Swati Shah, Nensi Shah)', () => {
  const items: BillItem[] = [
    { id: '1', particulars: 'AC Installation and Service', hsnCode: '', qty: '1', rate: 1500, amount: 1500 },
    { id: '2', particulars: 'Gas Refilling R32', hsnCode: '', qty: '1', rate: 2200, amount: 2200 },
  ];

  // isGst = false
  const totals = calculateBillTotals(items, 9, 9, 0, true, false);

  assert.equal(totals.subtotal, 3700);
  assert.equal(totals.cgstAmount, 0);
  assert.equal(totals.sgstAmount, 0);
  assert.equal(totals.igstAmount, 0);
  assert.equal(totals.grandTotal, 3700);
});

test('numberToIndianWords converts Indian currency accurately', () => {
  assert.equal(
    numberToIndianWords(22798),
    'Twenty Two Thousand Seven Hundred Ninety Eight Only'
  );
  assert.equal(
    numberToIndianWords(19320),
    'Nineteen Thousand Three Hundred Twenty Only'
  );
  assert.equal(
    numberToIndianWords(100000),
    'One Lakh Only'
  );
  assert.equal(
    numberToIndianWords(2500050.50),
    'Twenty Five Lakh Fifty and Fifty Paise Only'
  );
});
