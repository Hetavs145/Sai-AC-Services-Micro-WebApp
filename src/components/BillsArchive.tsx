import React, { useState } from 'react';
import { FileText, Download, Share2, Trash2, Edit3, Search, Building2, Calendar, Copy } from 'lucide-react';
import { BillData, CompanyProfile } from '../types';
import { generateBillPdf } from '../utils/pdfGenerator';
import { generateBillDocx } from '../utils/docxGenerator';
import { shareBillViaWhatsApp } from '../utils/whatsappShare';

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

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      (b.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.partyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.company.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany =
      selectedCompanyFilter === 'ALL' || b.company.id === selectedCompanyFilter;

    return matchesSearch && matchesCompany;
  });

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Saved Bills & Invoices Archive</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            All bills generated and stored under your companies. Re-edit, duplicate, download PDF, or share via WhatsApp.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice or party..."
              className="pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="ALL">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bills Table / List */}
      {filteredBills.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-10 text-center">
          <FileText className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No bills found
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Create or save a bill to view it in this company archive.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-850 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Issuing Company</th>
                  <th className="py-3 px-4">Party / Client</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/60">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-750/50">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                      #{bill.invoiceNo || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                      {bill.company.name}
                    </td>
                    <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      <div className="font-medium">{bill.partyName}</div>
                      {bill.siteAddress && (
                        <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                          {bill.siteAddress}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {bill.date}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-sm text-neutral-900 dark:text-white">
                      ₹{bill.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditBill(bill)}
                          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                          title="Edit Bill"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDuplicateBill(bill)}
                          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                          title="Duplicate as New Invoice"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(bill)}
                          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleWhatsApp(bill)}
                          className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {bills.length > 1 && (
                          <button
                            onClick={() => onDeleteBill(bill.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-neutral-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
