import React from 'react';
import { BillData } from '../types';

interface BillTemplateViewProps {
  bill: BillData;
}

export const BillTemplateView: React.FC<BillTemplateViewProps> = ({ bill }) => {
  return (
    <div className="w-full bg-white text-neutral-900 border border-neutral-900/80 shadow-md font-sans text-xs sm:text-sm select-text transition-all max-w-[800px] mx-auto">
      {/* Top Banner: TAX INVOICE + INVOICE NO / DATE */}
      <div className="grid grid-cols-12 border-b border-neutral-900">
        <div className="col-span-7 sm:col-span-8 bg-[#EBF0F8] flex items-center justify-center py-2.5 px-3 sm:px-4 border-r border-neutral-900">
          <h1 className="text-sm sm:text-xl font-black tracking-wider text-neutral-950 uppercase whitespace-nowrap">
            TAX INVOICE
          </h1>
        </div>
        <div className="col-span-5 sm:col-span-4 p-2 text-[10px] sm:text-xs flex flex-col justify-center font-bold bg-[#EBF0F8] whitespace-nowrap">
          <div className="flex items-center justify-between gap-1">
            <span>INVOICE NO :</span>
            <span className="font-mono tabular-nums">{bill.invoiceNo || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span>DATE :</span>
            <span className="font-mono tabular-nums">{bill.date || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Company Header Block */}
      <div className="text-center py-4 px-3 sm:px-6 border-b border-neutral-900">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 uppercase mb-1">
          {bill.company.name || 'COMPANY NAME'}
        </h2>
        <p className="text-[11px] sm:text-xs text-neutral-800 leading-snug max-w-xl mx-auto">
          {bill.company.address}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1 text-[11px] sm:text-xs font-semibold text-neutral-800">
          {bill.company.gstin && <span>GSTIN: <span className="font-mono">{bill.company.gstin}</span></span>}
          {bill.company.msme && <span>MSME Registration No.:-<span className="font-mono">{bill.company.msme}</span></span>}
        </div>
        {bill.company.mobile && (
          <p className="text-[11px] sm:text-xs font-medium text-neutral-800 mt-0.5">
            Mobile No.: <span className="font-mono">{bill.company.mobile}</span>
          </p>
        )}
      </div>

      {/* Party / Client Details */}
      <div className="p-3 sm:p-4 border-b border-neutral-900 leading-tight">
        <div className="font-bold text-[11px] sm:text-xs uppercase text-neutral-900">
          PARTY'S NAME:-
        </div>
        <div className="font-black text-sm sm:text-base text-neutral-950 mt-0.5">
          {bill.partyName || 'Customer / Client Name'}
        </div>
        {bill.siteAddress && (
          <div className="text-xs sm:text-sm text-neutral-800 mt-1 whitespace-pre-line">
            {bill.siteAddress}
          </div>
        )}
        {bill.partyGstin && (
          <div className="text-xs font-bold text-neutral-900 mt-1">
            GST NO:- <span className="font-mono">{bill.partyGstin}</span>
          </div>
        )}
      </div>

      {/* Particulars Table */}
      <div className="w-full">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-900 bg-neutral-50 text-[11px] sm:text-xs font-bold">
              <th className="py-2 px-2.5 border-r border-neutral-900 w-[48%]">
                Particulars (Descriptions & Specifications)
              </th>
              <th className="py-2 px-2 border-r border-neutral-900 text-center w-[13%]">
                HSN Code
              </th>
              <th className="py-2 px-2 border-r border-neutral-900 text-center w-[12%]">
                Qty
              </th>
              <th className="py-2 px-2 border-r border-neutral-900 text-right w-[12%]">
                Rate
              </th>
              <th className="py-2 px-2.5 text-right w-[15%]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => (
              <tr key={item.id} className="border-b border-neutral-200 hover:bg-neutral-50/50">
                <td className="py-2 px-2.5 border-r border-neutral-900 text-xs sm:text-sm font-medium align-top">
                  <span className="font-bold mr-1">{index + 1}.</span> {item.particulars}
                </td>
                <td className="py-2 px-2 border-r border-neutral-900 text-center font-mono tabular-nums text-xs align-top">
                  {item.hsnCode || '-'}
                </td>
                <td className="py-2 px-2 border-r border-neutral-900 text-center font-mono tabular-nums text-xs align-top">
                  {item.qty || '-'}
                </td>
                <td className="py-2 px-2 border-r border-neutral-900 text-right font-mono tabular-nums text-xs sm:text-sm align-top">
                  {(Number(item.rate) || 0).toFixed(0)}
                </td>
                <td className="py-2 px-2.5 text-right font-mono tabular-nums text-xs sm:text-sm font-semibold align-top">
                  {(Number(item.amount) || 0).toFixed(2)}
                </td>
              </tr>
            ))}

            {/* Empty padding rows if few items */}
            {bill.items.length < 4 && (
              <tr>
                <td className="py-4 border-r border-neutral-900"></td>
                <td className="py-4 border-r border-neutral-900"></td>
                <td className="py-4 border-r border-neutral-900"></td>
                <td className="py-4 border-r border-neutral-900"></td>
                <td className="py-4"></td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="border-t border-b border-neutral-900 font-bold bg-neutral-50/30">
              <td colSpan={3} className="py-1.5 px-2.5 border-r border-neutral-900 text-right">
                <span className="text-xs text-neutral-500 uppercase tracking-wider mr-2">Total</span>
              </td>
              <td className="py-1.5 px-2 border-r border-neutral-900 text-right font-bold">
                Total
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-xs sm:text-sm font-bold">
                {(Number(bill.subtotal) || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank Details & Tax Grid */}
      <div className="grid grid-cols-12 border-b border-neutral-900">
        {/* Left Side: Bank Details */}
        <div className="col-span-6 sm:col-span-7 p-3 border-r border-neutral-900 flex flex-col justify-between">
          <div>
            <div className="font-bold text-[11px] sm:text-xs uppercase tracking-wide text-neutral-950 mb-1">
              BANK DETAILS:
            </div>
            <div className="text-[11px] sm:text-xs space-y-0.5 text-neutral-800">
              <div><span className="font-medium">Bank Name:</span> {bill.company.bankName || 'N/A'}</div>
              <div><span className="font-medium">A/C No:</span> <span className="font-mono font-semibold">{bill.company.accountNo || 'N/A'}</span></div>
              <div><span className="font-medium">Branch:</span> {bill.company.branch || 'N/A'}</div>
              <div><span className="font-medium">IFSC Code:</span> <span className="font-mono font-semibold">{bill.company.ifsc || 'N/A'}</span></div>
            </div>
          </div>
        </div>

        {/* Right Side: Tax Calculation & Grand Total */}
        <div className="col-span-6 sm:col-span-5 flex flex-col justify-between">
          <div className="divide-y divide-neutral-900 text-[11px] sm:text-xs">
            {/* CGST */}
            <div className="flex items-center justify-between p-1.5 px-2.5">
              <div className="flex items-center gap-2">
                <span>Add : CGST @</span>
                <span className="font-mono font-bold">{bill.cgstPercent}%</span>
              </div>
              <span className="font-mono tabular-nums font-semibold">
                {(Number(bill.cgstAmount) || 0).toFixed(2)}
              </span>
            </div>

            {/* SGST */}
            <div className="flex items-center justify-between p-1.5 px-2.5">
              <div className="flex items-center gap-2">
                <span>Add : SGST @</span>
                <span className="font-mono font-bold">{bill.sgstPercent}%</span>
              </div>
              <span className="font-mono tabular-nums font-semibold">
                {(Number(bill.sgstAmount) || 0).toFixed(2)}
              </span>
            </div>

            {/* IGST if applicable */}
            {bill.igstPercent > 0 && (
              <div className="flex items-center justify-between p-1.5 px-2.5">
                <div className="flex items-center gap-2">
                  <span>Add : IGST @</span>
                  <span className="font-mono font-bold">{bill.igstPercent}%</span>
                </div>
                <span className="font-mono tabular-nums font-semibold">
                  {(Number(bill.igstAmount) || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Grand Total Row */}
          <div className="bg-[#EBF0F8] border-t border-neutral-900 flex items-center justify-between p-2 px-3 font-bold">
            <span className="text-xs sm:text-sm uppercase tracking-wide text-neutral-950">
              Grand Total
            </span>
            <span className="text-sm sm:text-base font-black font-mono tabular-nums text-neutral-950">
              {(Number(bill.grandTotal) || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Amount In Words */}
      <div className="p-2 sm:p-2.5 px-3 sm:px-4 border-b border-neutral-900 text-[11px] sm:text-xs bg-neutral-50/50">
        <span className="font-bold underline italic mr-1">
          Total Amount (INR - In Words):
        </span>
        <span className="font-semibold text-neutral-900">
          {bill.amountInWords || 'Zero Rupees Only.'}
        </span>
      </div>

      {/* Signatory Footer */}
      <div className="p-4 sm:p-6 flex flex-col justify-between min-h-[90px]">
        <div className="font-bold text-xs sm:text-sm text-neutral-950 uppercase">
          FOR {bill.company.name || 'COMPANY'}
        </div>
        <div className="mt-8 text-xs text-neutral-700 italic font-medium">
          Authorized Signatory
        </div>
      </div>
    </div>
  );
};
