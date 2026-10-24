import React, { useState } from 'react';
import {
  FileText,
  Download,
  Share2,
  Trash2,
  Edit3,
  Search,
  Building2,
  Calendar,
  Copy,
  FileDown,
  CalendarRange,
} from 'lucide-react';
import { BillData, CompanyProfile } from '../types';
import { generateBillPdf } from '../utils/pdfGenerator';
import { generateBillDocx } from '../utils/docxGenerator';
import { shareBillViaWhatsApp } from '../utils/whatsappShare';
import { calculateFinancialYear, getAvailableFinancialYears } from '../utils/financialYear';

interface BillsArchiveProps {
  bills: BillData[];
  companies: CompanyProfile[];
  onEditBill: (bill: BillData) => void;
  onDuplicateBill: (bill: BillData) => void;
  onDeleteBill: (id: string) => void;
}

export const BillsArchive: React.FC<BillsArchiveProps> = ({
  bills,
  companies,
  onEditBill,
  onDuplicateBill,
  onDeleteBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [selectedFyFilter, setSelectedFyFilter] = useState('ALL');

  const availableFys = getAvailableFinancialYears(bills);

  const filteredBills = bills.filter((b) => {
    const billFy = b.financialYear || calculateFinancialYear(b.date);

    const matchesSearch =
      (b.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.partyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.company.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      billFy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany =
      selectedCompanyFilter === 'ALL' || b.company.id === selectedCompanyFilter;

    const matchesFy =
      selectedFyFilter === 'ALL' || billFy === selectedFyFilter;

    return matchesSearch && matchesCompany && matchesFy;
  });

  // Calculate total turnover for filtered financial year
  const totalFyTurnover = filteredBills.reduce(
    (sum, b) => sum + (Number(b.grandTotal) || 0),
    0
  );

  const handleDownloadPdf = (bill: BillData) => {
    const doc = generateBillPdf(bill);
    doc.save(`Invoice_${bill.invoiceNo}_${bill.partyName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDownloadDocx = async (bill: BillData) => {
    const blob = await generateBillDocx(bill);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${bill.invoiceNo}_${bill.partyName.replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = (bill: BillData) => {
    const pdfDoc = generateBillPdf(bill);
    const pdfBlob = pdfDoc.output('blob');
    shareBillViaWhatsApp(bill, pdfBlob);
  };

  const handleDeleteWithConfirm = (bill: BillData) => {
    const inv = bill.invoiceNo || 'Draft';
    const client = bill.partyName || 'Customer';
    if (
      window.confirm(
        `Are you sure you want to permanently delete Invoice #${inv} (${client})? This will remove it from the cloud database.`
      )
    ) {
      onDeleteBill(bill.id);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Saved Bills & Invoices Archive</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All bills stored across financial years in cloud database. Re-edit, duplicate, download PDF, share via WhatsApp, or delete.
            </p>
          </div>
        </div>

        {/* Filters: Search + Company + Financial Year */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice, party, or FY..."
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-blue-500 shadow-xs"
          >
            <option value="ALL">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Financial Year Selector */}
          <select
            value={selectedFyFilter}
            onChange={(e) => setSelectedFyFilter(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm border border-blue-300 rounded-lg bg-blue-50/50 text-blue-900 font-semibold focus:ring-1 focus:ring-blue-500 shadow-xs"
            title="Filter bills by Financial Year"
          >
            <option value="ALL">All Financial Years</option>
            {availableFys.map((fy) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Year Summary Bar */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-blue-950 font-semibold">
          <CalendarRange className="w-4 h-4 text-blue-600" />
          <span>
            {selectedFyFilter === 'ALL'
              ? 'Multi-Year Financial Archive (Retained 1+ Financial Years)'
              : `Selected Financial Year: ${selectedFyFilter}`}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-700">
          <span>
            Total Invoices: <strong className="text-slate-900">{filteredBills.length}</strong>
          </span>
          <span>
            Turnover: <strong className="text-blue-700 font-mono text-sm">Rs. {totalFyTurnover.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      {/* Bills Table / List */}
      {filteredBills.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">
            No bills found
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedFyFilter !== 'ALL'
              ? `No bills recorded for ${selectedFyFilter}. Change the financial year filter or create a new bill.`
              : 'Create or save a bill to view it in this company archive.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Issuing Company</th>
                  <th className="py-3 px-4">Party / Client</th>
                  <th className="py-3 px-3">Date & FY</th>
                  <th className="py-3 px-4 text-right">Grand Total (Rs.)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => {
                  const billFy = bill.financialYear || calculateFinancialYear(bill.date);
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{bill.invoiceNo || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div>{bill.company.name}</div>
                        {bill.company.isGst ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            GST
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            Non-GST
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-semibold text-slate-900">{bill.partyName || 'Customer'}</div>
                        {bill.siteAddress && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {bill.siteAddress}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-slate-600">{bill.date}</div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {billFy}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-sm text-slate-900">
                        Rs. {(Number(bill.grandTotal) || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditBill(bill)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                            title="Edit Bill"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDuplicateBill(bill)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Duplicate as New Invoice"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(bill)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleWhatsApp(bill)}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button always available with safe confirmation */}
                          <button
                            onClick={() => handleDeleteWithConfirm(bill)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Bill from Database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
