import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  Download,
  Printer,
  Plus,
  Trash2,
  Building,
  Check,
  FileCheck,
  AlertCircle,
  FileDown,
  RefreshCw,
  Lock,
  Users,
  Info,
} from 'lucide-react';
import { BillData, BillItem, CompanyProfile, PartyProfile } from '../types';
import { calculateBillTotals, calculateItemAmount, numberToIndianWords } from '../utils/billCalculator';
import { generateBillPdf } from '../utils/pdfGenerator';
import { generateBillDocx } from '../utils/docxGenerator';
import { shareBillViaWhatsApp } from '../utils/whatsappShare';

import { calculateFinancialYear } from '../utils/financialYear';

interface BillEditorProps {
  bill: BillData;
  setBill: React.Dispatch<React.SetStateAction<BillData>>;
  companies: CompanyProfile[];
  parties: PartyProfile[];
  onSelectCompany: (company: CompanyProfile) => void;
  onSaveToArchive: (bill: BillData) => void;
  onDeleteBill?: (id: string) => void;
  onOpenCompanyManager: () => void;
  onResetToTemplate: () => void;
}

export const BillEditor: React.FC<BillEditorProps> = ({
  bill,
  setBill,
  companies,
  parties,
  onSelectCompany,
  onSaveToArchive,
  onDeleteBill,
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
  const [selectedPartyId, setSelectedPartyId] = useState<string>('custom');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedPartyId when bill's partyName matches an existing party
  useEffect(() => {
    if (bill.partyName) {
      const matched = parties.find(
        (p) => p.name.trim().toLowerCase() === bill.partyName.trim().toLowerCase()
      );
      if (matched) {
        setSelectedPartyId(matched.id);
      } else {
        setSelectedPartyId('custom');
      }
    } else {
      setSelectedPartyId('custom');
    }
  }, [bill.partyName, parties]);

  // Handle party dropdown change
  const handlePartySelectChange = (partyId: string) => {
    setSelectedPartyId(partyId);
    if (partyId === 'custom') {
      // User wants to type a new party: clear fields for clean entry
      setBill((prev) => ({
        ...prev,
        partyName: '',
        siteAddress: '',
        partyGstin: '',
      }));
      return;
    }
    const found = parties.find((p) => p.id === partyId);
    if (found) {
      setBill((prev) => ({
        ...prev,
        partyName: found.name,
        siteAddress: found.siteAddress,
        partyGstin: found.gstin || '',
      }));
    }
  };

  // Recalculate totals whenever items or tax rates change
  const updateBillWithTotals = (
    updatedItems: BillItem[],
    cgst = bill.cgstPercent,
    sgst = bill.sgstPercent,
    igst = bill.igstPercent
  ) => {
    const isGst = bill.company?.isGst ?? false;
    const totals = calculateBillTotals(
      updatedItems,
      isGst ? (cgst || 0) : 0,
      isGst ? (sgst || 0) : 0,
      isGst ? (igst || 0) : 0,
      roundToRupee,
      isGst
    );
    const safeGrandTotal = Number(totals.grandTotal) || 0;
    const words = numberToIndianWords(safeGrandTotal);

    setBill((prev) => ({
      ...prev,
      items: updatedItems,
      subtotal: Number(totals.subtotal) || 0,
      cgstPercent: isGst ? (cgst || 0) : 0,
      cgstAmount: Number(totals.cgstAmount) || 0,
      sgstPercent: isGst ? (sgst || 0) : 0,
      sgstAmount: Number(totals.sgstAmount) || 0,
      igstPercent: isGst ? (igst || 0) : 0,
      igstAmount: Number(totals.igstAmount) || 0,
      grandTotal: safeGrandTotal,
      amountInWords: words,
    }));
  };

  // Handle line item field change with complete safety against NaN or blank-out
  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    const updatedItems = bill.items.map((item) => {
      if (item.id !== id) return item;

      const updated = { ...item };
      if (field === 'rate') {
        const raw = value;
        let safeRate = 0;
        if (raw !== '' && raw !== null && raw !== undefined) {
          const parsed = parseFloat(raw);
          if (!isNaN(parsed)) safeRate = parsed;
        }
        updated.rate = raw === '' ? ('' as any) : safeRate;
        updated.amount = calculateItemAmount(item.qty, safeRate);
      } else if (field === 'qty') {
        updated.qty = value;
        const currentRate = typeof item.rate === 'number' ? item.rate : (parseFloat(String(item.rate)) || 0);
        updated.amount = calculateItemAmount(value, currentRate);
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
      hsnCode: bill.company.isGst ? '7411' : '-',
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
        const newItems: BillItem[] = Array.isArray(data.items) && data.items.length > 0
          ? data.items.map((it: any, idx: number) => {
              const safeRate = Number(it.rate) || 0;
              const safeQty = String(it.qty || '1');
              return {
                id: `item-${Date.now()}-${idx}`,
                particulars: it.particulars || 'Item description',
                hsnCode: it.hsnCode || (bill.company.isGst ? '7411' : '-'),
                qty: safeQty,
                rate: safeRate,
                amount: Number(it.amount) || calculateItemAmount(safeQty, safeRate),
              };
            })
          : bill.items;

        const isGst = bill.company.isGst;
        const cgst = isGst ? (typeof data.cgstPercent === 'number' ? data.cgstPercent : 9) : 0;
        const sgst = isGst ? (typeof data.sgstPercent === 'number' ? data.sgstPercent : 9) : 0;
        const totals = calculateBillTotals(newItems, cgst, sgst, 0, roundToRupee, isGst);

        setBill((prev) => ({
          ...prev,
          invoiceNo: data.invoiceNo || prev.invoiceNo,
          date: data.date || prev.date,
          partyName: data.partyName || prev.partyName,
          siteAddress: data.siteAddress || prev.siteAddress,
          partyGstin: isGst ? (data.partyGstin || prev.partyGstin) : '',
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

  // Export handlers (auto-saves party and bill to cloud database)
  const handleDownloadPdf = () => {
    onSaveToArchive(bill);
    const doc = generateBillPdf(bill);
    const fileName = `Invoice_${bill.invoiceNo || 'Draft'}_${bill.partyName.replace(/\s+/g, '_') || 'Customer'}.pdf`;
    doc.save(fileName);
  };

  const handleDownloadDocx = async () => {
    onSaveToArchive(bill);
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
    onSaveToArchive(bill);
    const pdfDoc = generateBillPdf(bill);
    const pdfBlob = pdfDoc.output('blob');
    shareBillViaWhatsApp(bill, pdfBlob);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    onSaveToArchive(bill);
    setSaveStatus('Bill & Party details saved to cloud!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const isCompanyGst = bill.company?.isGst ?? false;

  return (
    <div className="space-y-6">
      {/* 1. Company Selector Header Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <label htmlFor="company-select" className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                Issuing Company / Organization
              </label>
              <select
                id="company-select"
                value={bill.company.id}
                onChange={(e) => {
                  const selected = companies.find((c) => c.id === e.target.value);
                  if (selected) {
                    onSelectCompany(selected);
                    // Recalculate bill with company GST status
                    const isGst = selected.isGst;
                    const cgst = isGst ? 9 : 0;
                    const sgst = isGst ? 9 : 0;
                    const totals = calculateBillTotals(bill.items, cgst, sgst, 0, roundToRupee, isGst);
                    setBill((prev) => ({
                      ...prev,
                      company: selected,
                      cgstPercent: cgst,
                      cgstAmount: totals.cgstAmount,
                      sgstPercent: sgst,
                      sgstAmount: totals.sgstAmount,
                      igstPercent: 0,
                      igstAmount: 0,
                      grandTotal: totals.grandTotal,
                      amountInWords: numberToIndianWords(totals.grandTotal),
                    }));
                  }
                }}
                className="mt-0.5 text-base sm:text-lg font-black text-neutral-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-blue-700"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id} className="text-neutral-900 font-semibold">
                    {comp.name} {comp.isGst ? '(GST Registered)' : '(Non-GST)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCompanyManager}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors whitespace-nowrap"
            >
              Company Profiles
            </button>
            <button
              onClick={onResetToTemplate}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors whitespace-nowrap"
            >
              Default Template
            </button>
          </div>
        </div>

        {/* Company Status Summary Badge */}
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-600">
          <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
            isCompanyGst ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isCompanyGst ? 'GST Active (9% CGST + 9% SGST)' : 'Non-GST Company (Zero Tax)'}
          </span>
          {isCompanyGst && bill.company.gstin && (
            <span>GSTIN: <span className="font-mono font-bold text-neutral-900">{bill.company.gstin}</span></span>
          )}
          <span>Bank: <span className="font-medium text-neutral-900">{bill.company.bankName}</span></span>
          <span>A/C: <span className="font-mono font-medium text-neutral-900">{bill.company.accountNo}</span></span>
          <span>IFSC: <span className="font-mono font-medium text-neutral-900">{bill.company.ifsc}</span></span>
        </div>
      </div>

      {/* 2. Upload Photos & AI Scanner Button (Fixed high-contrast styling) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Smart Bill & Requirement Photo Scanner</span>
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              Upload a photo of an invoice or handwritten measurement note to extract line items directly into this bill.
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0 font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Secure Processing</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Prominent High-Contrast Upload Button */}
          <div className="md:col-span-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
              id="bill-file-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 px-5 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/60 hover:bg-blue-100/70 text-blue-900 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-blue-950 mt-1">
                Upload Bill / Requirement Photo
              </div>
              <div className="text-xs text-blue-700 font-medium">
                Tap to choose image from camera or gallery (JPG, PNG, PDF)
              </div>
            </button>
          </div>

          {/* Action & Preview */}
          <div className="md:col-span-4 flex flex-col gap-2">
            {uploadedImagePreview ? (
              <div className="relative border border-slate-300 rounded-xl overflow-hidden h-28 bg-slate-100 flex items-center justify-center shadow-xs">
                <img
                  src={uploadedImagePreview}
                  alt="Bill preview"
                  className="max-h-full max-w-full object-contain"
                />
                <button
                  onClick={handleAiExtract}
                  disabled={isExtracting}
                  className="absolute inset-0 bg-blue-950/75 hover:bg-blue-950/85 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-80"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Extracting with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Click to Auto-Extract Data</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-28 border border-neutral-200 rounded-xl bg-neutral-50 flex flex-col items-center justify-center p-3 text-center text-xs text-neutral-500">
                <Info className="w-4 h-4 text-neutral-400 mb-1" />
                <span>Upload a bill image on the left to activate auto-extraction</span>
              </div>
            )}

            {extractSuccess && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bill extracted & loaded into template!</span>
              </div>
            )}

            {extractError && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="line-clamp-2">{extractError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Party & Invoice Details Form */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2">
          Invoice & Party Information
        </h3>

        {/* PARTY QUICK SELECT DROPDOWN */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700 shrink-0" />
              <div>
                <label htmlFor="party-select-dropdown" className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                  Select Existing Party / Customer:
                </label>
                <span className="text-[11px] text-blue-800">
                  Select party to auto-fill their details, or choose "+ Add New Party"
                </span>
              </div>
            </div>

            <select
              id="party-select-dropdown"
              value={selectedPartyId}
              onChange={(e) => handlePartySelectChange(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm font-semibold text-neutral-900 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 shadow-xs cursor-pointer min-w-[240px]"
            >
              <option value="custom">+ Add New Party / Custom Customer</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={bill.invoiceNo}
              onChange={(e) => setBill({ ...bill, invoiceNo: e.target.value })}
              placeholder="e.g. 28"
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-neutral-300 rounded-lg bg-neutral-50/50 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700">
                Invoice Date
              </label>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                {calculateFinancialYear(bill.date)}
              </span>
            </div>
            <input
              type="text"
              value={bill.date}
              onChange={(e) => {
                const newDate = e.target.value;
                setBill({
                  ...bill,
                  date: newDate,
                  financialYear: calculateFinancialYear(newDate),
                });
              }}
              placeholder="e.g. 7/10/24 or YYYY-MM-DD"
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-neutral-300 rounded-lg bg-neutral-50/50 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Party / Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bill.partyName}
              onChange={(e) => setBill({ ...bill, partyName: e.target.value })}
              placeholder="e.g. SHREE SHDDHI CREATEURS"
              className="w-full px-3 py-2 text-xs sm:text-sm font-bold border border-neutral-300 rounded-lg bg-neutral-50/50 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className={isCompanyGst ? 'sm:col-span-3' : 'sm:col-span-4'}>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Site / Project Location & Address
            </label>
            <input
              type="text"
              value={bill.siteAddress}
              onChange={(e) => setBill({ ...bill, siteAddress: e.target.value })}
              placeholder="e.g. Site :-Sanvi Casa, Tarsali Ring road, vadodara. (Block No. 1)"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-neutral-300 rounded-lg bg-neutral-50/50 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isCompanyGst && (
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Party GST No
              </label>
              <input
                type="text"
                value={bill.partyGstin}
                onChange={(e) => setBill({ ...bill, partyGstin: e.target.value })}
                placeholder="e.g. 24ADEFS0224R2ZW"
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-neutral-300 rounded-lg bg-neutral-50/50 text-neutral-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* 4. Line Items Table */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
              Particulars (Descriptions & Specifications)
            </h4>
            <button
              onClick={handleAddItem}
              className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-neutral-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-800 font-bold border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description & Specification</th>
                  <th className="py-2.5 px-2 w-24 text-center">{isCompanyGst ? 'HSN Code' : 'Item Code'}</th>
                  <th className="py-2.5 px-2 w-24 text-center">Qty / Unit</th>
                  <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {bill.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-2 px-2 text-center text-neutral-500 font-mono font-semibold">
                      {index + 1}
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={item.particulars}
                        onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                        placeholder="Item description & specification"
                        className="w-full px-2 py-1.5 text-xs border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded bg-transparent text-neutral-900 focus:bg-white"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                        placeholder={isCompanyGst ? 'HSN' : '-'}
                        className="w-full px-2 py-1.5 text-xs font-mono text-center border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded bg-transparent text-neutral-900 focus:bg-white"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                        placeholder="e.g. 46rft."
                        className="w-full px-2 py-1.5 text-xs font-mono text-center border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded bg-transparent text-neutral-900 focus:bg-white"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        step="any"
                        value={(item.rate as any) === '' ? '' : (item.rate ?? 0)}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-xs font-mono text-right font-semibold border border-transparent hover:border-neutral-300 focus:border-blue-500 rounded bg-transparent text-neutral-900 focus:bg-white"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-neutral-950">
                      {(Number(item.amount) || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-1.5 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={bill.items.length <= 1}
                        aria-label="Delete line item"
                        className="p-1.5 text-neutral-400 hover:text-red-600 disabled:opacity-20 transition-colors cursor-pointer"
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

        {/* 5. Taxes & Totals Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Bank Summary Card */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs space-y-1.5">
            <div className="font-bold text-neutral-800">
              Bank Details (Populated from {bill.company.name}):
            </div>
            <div className="text-neutral-700 font-mono text-[11px] leading-relaxed">
              {bill.company.bankName} · A/C: {bill.company.accountNo} · Branch: {bill.company.branch} · IFSC: {bill.company.ifsc}
            </div>
            <div className="pt-2 flex items-center gap-2 border-t border-neutral-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundToRupee}
                  onChange={(e) => {
                    setRoundToRupee(e.target.checked);
                    const isGst = bill.company.isGst;
                    const totals = calculateBillTotals(
                      bill.items,
                      isGst ? bill.cgstPercent : 0,
                      isGst ? bill.sgstPercent : 0,
                      0,
                      e.target.checked,
                      isGst
                    );
                    setBill((prev) => ({
                      ...prev,
                      grandTotal: totals.grandTotal,
                      amountInWords: numberToIndianWords(totals.grandTotal),
                    }));
                  }}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-0"
                />
                <span className="text-xs text-neutral-800 font-medium">
                  Round Grand Total to nearest Rupee
                </span>
              </label>
            </div>
          </div>

          {/* Tax breakdown & Grand Total */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Subtotal:</span>
              <span className="font-mono font-bold tabular-nums text-neutral-900 text-sm">
                Rs. {(Number(bill.subtotal) || 0).toFixed(2)}
              </span>
            </div>

            {/* GST Component: Displayed only for GST companies (Sai AC Services) */}
            {isCompanyGst ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-600">Add : CGST Rate (%):</span>
                    <input
                      type="number"
                      value={bill.cgstPercent}
                      onChange={(e) => updateBillWithTotals(bill.items, parseFloat(e.target.value) || 0, bill.sgstPercent, bill.igstPercent)}
                      className="w-14 px-1.5 py-0.5 text-xs font-mono text-center border border-neutral-300 rounded bg-white text-neutral-900 font-semibold"
                    />
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-neutral-800">
                    Rs. {(Number(bill.cgstAmount) || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-600">Add : SGST Rate (%):</span>
                    <input
                      type="number"
                      value={bill.sgstPercent}
                      onChange={(e) => updateBillWithTotals(bill.items, bill.cgstPercent, parseFloat(e.target.value) || 0, bill.igstPercent)}
                      className="w-14 px-1.5 py-0.5 text-xs font-mono text-center border border-neutral-300 rounded bg-white text-neutral-900 font-semibold"
                    />
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-neutral-800">
                    Rs. {(Number(bill.sgstAmount) || 0).toFixed(2)}
                  </span>
                </div>
              </>
            ) : null}

            <div className="flex items-center justify-between border-t border-neutral-300 pt-2 font-bold text-sm">
              <span className="text-neutral-950 font-black">Grand Total:</span>
              <span className="font-mono tabular-nums text-lg font-black text-neutral-950">
                Rs. {(Number(bill.grandTotal) || 0).toFixed(2)}
              </span>
            </div>

            <div className="text-[11px] text-neutral-600 italic bg-white p-2 rounded border border-neutral-200">
              <span className="font-semibold text-neutral-700 not-italic mr-1">In Words:</span>
              {bill.amountInWords || 'Zero Rupees Only'}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Primary Action Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* Download Word (.docx) */}
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Download editable Microsoft Word format"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
            <span>Word (.docx)</span>
          </button>

          {/* WhatsApp Direct Share Button */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#20BD5A] rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            title="Share bill details directly via WhatsApp"
          >
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Delete Bill button */}
          {onDeleteBill && (
            <button
              type="button"
              onClick={() => {
                const targetName = bill.partyName || 'Customer';
                const inv = bill.invoiceNo || 'Draft';
                if (window.confirm(`Are you sure you want to permanently delete this bill (Invoice #${inv} - ${targetName}) from the cloud database?`)) {
                  onDeleteBill(bill.id);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              title="Delete this bill from cloud database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Bill</span>
            </button>
          )}

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* Save to Archive & Server Cloud Store */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Save Bill</span>
          </button>

          {saveStatus && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded font-semibold animate-pulse">
              {saveStatus}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
