import React, { useState, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Download,
  Share2,
  Printer,
  Plus,
  Trash2,
  Building,
  Check,
  FileCheck,
  AlertCircle,
  Eye,
  FileDown,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { BillData, BillItem, CompanyProfile } from '../types';
import { calculateBillTotals, calculateItemAmount, numberToIndianWords } from '../utils/billCalculator';
import { generateBillPdf } from '../utils/pdfGenerator';
import { generateBillDocx } from '../utils/docxGenerator';
import { shareBillViaWhatsApp } from '../utils/whatsappShare';

interface BillEditorProps {
  bill: BillData;
  setBill: React.Dispatch<React.SetStateAction<BillData>>;
  companies: CompanyProfile[];
  onSelectCompany: (company: CompanyProfile) => void;
  onSaveToArchive: (bill: BillData) => void;
  onOpenCompanyManager: () => void;
  onResetToTemplate: () => void;
}

export const BillEditor: React.FC<BillEditorProps> = ({
  bill,
  setBill,
  companies,
  onSelectCompany,
  onSaveToArchive,
  onOpenCompanyManager,
  onResetToTemplate,
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/jpeg');
  const [roundToRupee, setRoundToRupee] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recalculate totals whenever items or tax rates change
  const updateBillWithTotals = (updatedItems: BillItem[], cgst = bill.cgstPercent, sgst = bill.sgstPercent, igst = bill.igstPercent) => {
    const totals = calculateBillTotals(updatedItems, cgst, sgst, igst, roundToRupee);
    const words = numberToIndianWords(totals.grandTotal);
    setBill((prev) => ({
      ...prev,
      items: updatedItems,
      subtotal: totals.subtotal,
      cgstPercent: cgst,
      cgstAmount: totals.cgstAmount,
      sgstPercent: sgst,
      sgstAmount: totals.sgstAmount,
      igstPercent: igst,
      igstAmount: totals.igstAmount,
      grandTotal: totals.grandTotal,
      amountInWords: words,
    }));
  };

  // Handle line item field change
  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    const updatedItems = bill.items.map((item) => {
      if (item.id !== id) return item;

      const updated = { ...item };
      if (field === 'rate') {
        const raw = value;
        const numRate = raw === '' ? 0 : parseFloat(raw);
        const safeRate = isNaN(numRate) ? 0 : numRate;
        updated.rate = raw === '' ? ('' as any) : safeRate;
        updated.amount = calculateItemAmount(item.qty, safeRate);
      } else if (field === 'qty') {
        updated.qty = value;
        const safeRate = Number(item.rate) || 0;
        updated.amount = calculateItemAmount(value, safeRate);
      } else {
        (updated as any)[field] = value;
      }
      return updated;
    });

    updateBillWithTotals(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: BillItem = {
      id: `item-${Date.now()}`,
      particulars: '',
      hsnCode: '',
      qty: '1',
      rate: 0,
      amount: 0,
    };
    updateBillWithTotals([...bill.items, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    if (bill.items.length <= 1) return;
    const filtered = bill.items.filter((item) => item.id !== id);
    updateBillWithTotals(filtered);
  };

  // Image Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadedImagePreview(base64);
      setExtractError(null);
      setExtractSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  // Gemini Vision Bill Extraction
  const handleAiExtract = async () => {
    if (!uploadedImagePreview) {
      setExtractError('Please upload a photo of the bill or requirement note first.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    try {
      const res = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadedImagePreview,
          mimeType: uploadedMimeType,
          companyName: bill.company.name,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Extraction failed');
      }

      const data = result.data;
      if (data) {
        // Map extracted items
        const newItems: BillItem[] = Array.isArray(data.items) && data.items.length > 0
          ? data.items.map((it: any, idx: number) => ({
              id: `item-${Date.now()}-${idx}`,
              particulars: it.particulars || 'Item description',
              hsnCode: it.hsnCode || '-',
              qty: String(it.qty || '1'),
              rate: Number(it.rate) || 0,
              amount: Number(it.amount) || calculateItemAmount(it.qty || '1', it.rate || 0),
            }))
          : bill.items;

        const cgst = typeof data.cgstPercent === 'number' ? data.cgstPercent : bill.cgstPercent;
        const sgst = typeof data.sgstPercent === 'number' ? data.sgstPercent : bill.sgstPercent;
        const totals = calculateBillTotals(newItems, cgst, sgst, 0, roundToRupee);

        setBill((prev) => ({
          ...prev,
          invoiceNo: data.invoiceNo || prev.invoiceNo,
          date: data.date || prev.date,
          partyName: data.partyName || prev.partyName,
          siteAddress: data.siteAddress || prev.siteAddress,
          partyGstin: data.partyGstin || prev.partyGstin,
          items: newItems,
          subtotal: totals.subtotal,
          cgstPercent: cgst,
          cgstAmount: totals.cgstAmount,
          sgstPercent: sgst,
          sgstAmount: totals.sgstAmount,
          grandTotal: totals.grandTotal,
          amountInWords: numberToIndianWords(totals.grandTotal),
          notes: data.notes || prev.notes,
        }));

        setExtractSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      setExtractError(err.message || 'Error communicating with AI service. You can still fill fields manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Export handlers
  const handleDownloadPdf = () => {
    const doc = generateBillPdf(bill);
    const fileName = `Invoice_${bill.invoiceNo || 'Draft'}_${bill.partyName.replace(/\s+/g, '_') || 'Customer'}.pdf`;
    doc.save(fileName);
  };

  const handleDownloadDocx = async () => {
    const blob = await generateBillDocx(bill);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${bill.invoiceNo || 'Draft'}_${bill.partyName.replace(/\s+/g, '_') || 'Customer'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    const pdfDoc = generateBillPdf(bill);
    const pdfBlob = pdfDoc.output('blob');
    shareBillViaWhatsApp(bill, pdfBlob);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    onSaveToArchive(bill);
    setSaveStatus('Bill saved to archive!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Company Selector & Switcher Header Bar */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-neutral-600 dark:text-neutral-400 shrink-0" />
            <div>
              <label htmlFor="company-select" className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                Issuing Company / Organization
              </label>
              <select
                id="company-select"
                value={bill.company.id}
                onChange={(e) => {
                  const selected = companies.find((c) => c.id === e.target.value);
                  if (selected) onSelectCompany(selected);
                }}
                className="mt-0.5 text-sm sm:text-base font-bold text-neutral-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:underline"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id} className="text-neutral-900 bg-white dark:bg-neutral-800 dark:text-white">
                    {comp.name} {comp.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCompanyManager}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors whitespace-nowrap"
            >
              Manage Companies
            </button>
            <button
              onClick={onResetToTemplate}
              className="text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors whitespace-nowrap"
            >
              Load Default Template
            </button>
          </div>
        </div>

        {/* Company Summary line */}
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <span>GSTIN: <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{bill.company.gstin || 'None'}</span></span>
          <span>·</span>
          <span>Bank: <span className="font-medium text-neutral-800 dark:text-neutral-200">{bill.company.bankName} ({bill.company.accountNo})</span></span>
          <span>·</span>
          <span>Phone: <span className="font-mono text-neutral-800 dark:text-neutral-200">{bill.company.mobile}</span></span>
        </div>
      </div>

      {/* AI Photo & Requirement Extraction Card */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Smart Bill & Requirement Photo Scanner</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Upload a photo of an invoice, estimate, hand-written measurement, or requirement sheet to automatically extract line items into this template.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Private & Confidential</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Upload Dropzone */}
          <div className="md:col-span-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
              id="bill-file-upload"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all bg-neutral-50/50 dark:bg-neutral-850/50 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
              <div className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Click to browse or take photo of bill / note
              </div>
              <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Supports JPG, PNG, WEBP, or site photo captures
              </div>
            </div>
          </div>

          {/* Action & Preview */}
          <div className="md:col-span-4 flex flex-col gap-2">
            {uploadedImagePreview ? (
              <div className="relative border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden h-24 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                <img
                  src={uploadedImagePreview}
                  alt="Bill preview"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  onClick={handleAiExtract}
                  disabled={isExtracting}
                  className="absolute inset-0 bg-neutral-950/70 hover:bg-neutral-950/80 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-80"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Extracting with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Extract Line Items</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Bill Photo</span>
              </button>
            )}

            {extractSuccess && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4" />
                <span>Data extracted & added to template!</span>
              </div>
            )}

            {extractError && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="line-clamp-2">{extractError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill Form Fields */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs border-b border-neutral-100 dark:border-neutral-700/60 pb-2">
          Invoice & Party Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={bill.invoiceNo}
              onChange={(e) => setBill({ ...bill, invoiceNo: e.target.value })}
              placeholder="e.g. 28"
              className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
              Invoice Date
            </label>
            <input
              type="text"
              value={bill.date}
              onChange={(e) => setBill({ ...bill, date: e.target.value })}
              placeholder="e.g. 7/10/24 or YYYY-MM-DD"
              className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
              Party / Client Name
            </label>
            <input
              type="text"
              value={bill.partyName}
              onChange={(e) => setBill({ ...bill, partyName: e.target.value })}
              placeholder="e.g. SHREE SHDDHI CREATEURS"
              className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
              Site / Project Location
            </label>
            <input
              type="text"
              value={bill.siteAddress}
              onChange={(e) => setBill({ ...bill, siteAddress: e.target.value })}
              placeholder="e.g. Site :-Sanvi Casa, Tarsali Ring road, vadodara. (Block No. 1)"
              className="w-full px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
              Party GST NO
            </label>
            <input
              type="text"
              value={bill.partyGstin}
              onChange={(e) => setBill({ ...bill, partyGstin: e.target.value })}
              placeholder="e.g. 24ADEFS0224R2ZW"
              className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>
        </div>

        {/* Particulars Line Items Table */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Particulars (Descriptions & Specifications)
            </h4>
            <button
              onClick={handleAddItem}
              className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th className="py-2 px-2.5">Description & Specification</th>
                  <th className="py-2 px-2 w-24">HSN</th>
                  <th className="py-2 px-2 w-24">Qty / Unit</th>
                  <th className="py-2 px-2 w-28 text-right">Rate (₹)</th>
                  <th className="py-2 px-2.5 w-32 text-right">Amount (₹)</th>
                  <th className="py-2 px-1.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/60">
                {bill.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850">
                    <td className="py-2 px-2 text-center text-neutral-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={item.particulars}
                        onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                        placeholder="Item description"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-white rounded bg-transparent text-neutral-900 dark:text-white"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                        placeholder="HSN"
                        className="w-full px-2 py-1 text-xs font-mono text-center border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-white rounded bg-transparent text-neutral-900 dark:text-white"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                        placeholder="e.g. 46rft."
                        className="w-full px-2 py-1 text-xs font-mono text-center border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-white rounded bg-transparent text-neutral-900 dark:text-white"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono text-right border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-white rounded bg-transparent text-neutral-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-semibold tabular-nums text-neutral-900 dark:text-white">
                      {(Number(item.amount) || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-1.5 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={bill.items.length <= 1}
                        aria-label="Delete line item"
                        className="p-1 text-neutral-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Taxes & Totals Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Bank summary review */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1">
            <div className="font-semibold text-neutral-700 dark:text-neutral-300">
              Bank Details (Populated from {bill.company.name}):
            </div>
            <div className="text-neutral-600 dark:text-neutral-400 font-mono">
              {bill.company.bankName} · A/C: {bill.company.accountNo} · IFSC: {bill.company.ifsc}
            </div>
            <div className="pt-2 flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundToRupee}
                  onChange={(e) => {
                    setRoundToRupee(e.target.checked);
                    const totals = calculateBillTotals(bill.items, bill.cgstPercent, bill.sgstPercent, bill.igstPercent, e.target.checked);
                    setBill((prev) => ({
                      ...prev,
                      grandTotal: totals.grandTotal,
                      amountInWords: numberToIndianWords(totals.grandTotal),
                    }));
                  }}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  Round Grand Total to nearest Rupee
                </span>
              </label>
            </div>
          </div>

          {/* Tax breakdown inputs */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">Subtotal:</span>
              <span className="font-mono font-bold tabular-nums text-neutral-900 dark:text-white">
                ₹{bill.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-600 dark:text-neutral-400">CGST Rate (%):</span>
                <input
                  type="number"
                  value={bill.cgstPercent}
                  onChange={(e) => updateBillWithTotals(bill.items, parseFloat(e.target.value) || 0, bill.sgstPercent, bill.igstPercent)}
                  className="w-14 px-1.5 py-0.5 text-xs font-mono text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>
              <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                ₹{bill.cgstAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-600 dark:text-neutral-400">SGST Rate (%):</span>
                <input
                  type="number"
                  value={bill.sgstPercent}
                  onChange={(e) => updateBillWithTotals(bill.items, bill.cgstPercent, parseFloat(e.target.value) || 0, bill.igstPercent)}
                  className="w-14 px-1.5 py-0.5 text-xs font-mono text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>
              <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                ₹{bill.sgstAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-2 font-bold text-sm">
              <span className="text-neutral-900 dark:text-white">Grand Total:</span>
              <span className="font-mono tabular-nums text-base text-neutral-950 dark:text-white">
                ₹{bill.grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
              {bill.amountInWords}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Toolbar */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* Download Word (.docx) */}
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-650 rounded-lg transition-colors whitespace-nowrap"
            title="Download editable Microsoft Word format"
          >
            <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Word (.docx)</span>
          </button>

          {/* WhatsApp Direct Share Button with official WhatsApp icon */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] rounded-lg shadow-xs transition-colors whitespace-nowrap"
            title="Share bill details directly via WhatsApp"
          >
            {/* WhatsApp SVG Icon */}
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* Save to Archive */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Save Bill</span>
          </button>

          {saveStatus && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {saveStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
