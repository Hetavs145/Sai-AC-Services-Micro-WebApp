import React, { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { BillTemplateView } from './components/BillTemplateView';
import { BillEditor } from './components/BillEditor';
import { CompanyManager } from './components/CompanyManager';
import { PhotoDocStudio } from './components/PhotoDocStudio';
import { BillsArchive } from './components/BillsArchive';
import { BillData, CompanyProfile } from './types';
import { storage } from './utils/storage';
import { DEFAULT_BILL, DEFAULT_COMPANY } from './utils/defaultData';
import { calculateBillTotals, numberToIndianWords } from './utils/billCalculator';
import { Eye, Edit3, ArrowLeftRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'bill' | 'docStudio' | 'companies' | 'archive'>('bill');

  const [companies, setCompanies] = useState<CompanyProfile[]>(() => storage.getCompanies());
  const [activeCompany, setActiveCompany] = useState<CompanyProfile>(() => storage.getActiveCompany());
  const [bills, setBills] = useState<BillData[]>(() => storage.getBills());
  
  // Current bill being edited
  const [currentBill, setCurrentBill] = useState<BillData>(() => {
    const savedBills = storage.getBills();
    if (savedBills.length > 0) {
      return savedBills[0];
    }
    return DEFAULT_BILL;
  });

  // Mobile split view toggle: 'editor' vs 'preview'
  const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor');

  // Enforce light mode only across the entire app
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // When active company is switched, update current bill's company
  const handleSelectCompany = (company: CompanyProfile) => {
    setActiveCompany(company);
    storage.setActiveCompanyId(company.id);
    setCurrentBill((prev) => ({
      ...prev,
      company,
    }));
  };

  const handleSaveCompany = (company: CompanyProfile) => {
    const updated = storage.saveCompany(company);
    setCompanies(updated);
    if (company.id === activeCompany.id || company.isDefault) {
      setActiveCompany(company);
      setCurrentBill((prev) => ({
        ...prev,
        company,
      }));
    }
  };

  const handleDeleteCompany = (id: string) => {
    const updated = storage.deleteCompany(id);
    setCompanies(updated);
    if (activeCompany.id === id) {
      const fallback = updated[0] || DEFAULT_COMPANY;
      setActiveCompany(fallback);
      setCurrentBill((prev) => ({ ...prev, company: fallback }));
    }
  };

  // Create clean new bill
  const handleNewBill = () => {
    const nextInvoiceNo = String(bills.length + 101);
    const newBill: BillData = {
      id: `bill-${Date.now()}`,
      invoiceNo: nextInvoiceNo,
      date: new Date().toISOString().split('T')[0],
      company: activeCompany,
      partyName: '',
      siteAddress: '',
      partyGstin: '',
      items: [
        {
          id: `item-${Date.now()}-1`,
          particulars: 'Copper pipe with insulation',
          hsnCode: '7411',
          qty: '46rft.',
          rate: 200,
          amount: 9200,
        },
      ],
      subtotal: 9200,
      cgstPercent: 9,
      cgstAmount: 828,
      sgstPercent: 9,
      sgstAmount: 828,
      igstPercent: 0,
      igstAmount: 0,
      grandTotal: 10856,
      amountInWords: numberToIndianWords(10856),
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentBill(newBill);
    setActiveTab('bill');
    setMobileViewMode('editor');
  };

  const handleResetToTemplate = () => {
    setCurrentBill(DEFAULT_BILL);
    setActiveCompany(DEFAULT_COMPANY);
  };

  const handleSaveBillToArchive = (bill: BillData) => {
    const updated = storage.saveBill(bill);
    setBills(updated);
  };

  const handleDeleteBill = (id: string) => {
    const updated = storage.deleteBill(id);
    setBills(updated);
  };

  const handleEditBillFromArchive = (bill: BillData) => {
    setCurrentBill(bill);
    setActiveCompany(bill.company);
    setActiveTab('bill');
  };

  const handleDuplicateBill = (bill: BillData) => {
    const dup: BillData = {
      ...bill,
      id: `bill-${Date.now()}`,
      invoiceNo: `${bill.invoiceNo}-copy`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveBillToArchive(dup);
    setCurrentBill(dup);
    setActiveTab('bill');
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 transition-colors">
      {/* Universal Top Navigation */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewBill={handleNewBill}
        activeCompanyName={activeCompany.name}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* TAB 1: Tax Invoice Maker */}
        {activeTab === 'bill' && (
          <div className="space-y-4">
            {/* Mobile View Toggle (Sticky below topnav for 390px screens) */}
            <div className="lg:hidden flex items-center justify-between bg-white dark:bg-neutral-800 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xs">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 pl-1">
                View Mode:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMobileViewMode('editor')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    mobileViewMode === 'editor'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Form</span>
                </button>
                <button
                  onClick={() => setMobileViewMode('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    mobileViewMode === 'preview'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Invoice Preview</span>
                </button>
              </div>
            </div>

            {/* 2-Column Split on Desktop, Tabbed on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Form & AI Scanner */}
              <div
                className={`lg:col-span-7 space-y-6 ${
                  mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'
                }`}
              >
                <BillEditor
                  bill={currentBill}
                  setBill={setCurrentBill}
                  companies={companies}
                  onSelectCompany={handleSelectCompany}
                  onSaveToArchive={handleSaveBillToArchive}
                  onOpenCompanyManager={() => setActiveTab('companies')}
                  onResetToTemplate={handleResetToTemplate}
                />
              </div>

              {/* Right Column: Live Rendered Invoice Template Preview */}
              <div
                className={`lg:col-span-5 sticky top-20 ${
                  mobileViewMode === 'editor' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Live Template Output (Exact Print Layout)
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    A4 Proportional
                  </span>
                </div>

                <div className="bg-white/40 dark:bg-neutral-800/40 p-2 sm:p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/80 shadow-xs overflow-auto max-h-[85vh]">
                  <BillTemplateView bill={currentBill} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Photo-to-PDF Studio */}
        {activeTab === 'docStudio' && (
          <PhotoDocStudio activeCompanyName={activeCompany.name} />
        )}

        {/* TAB 3: Company Profiles & Archive */}
        {activeTab === 'companies' && (
          <div className="space-y-10">
            <CompanyManager
              companies={companies}
              activeCompanyId={activeCompany.id}
              bills={bills}
              onSelectCompany={handleSelectCompany}
              onSaveCompany={handleSaveCompany}
              onDeleteCompany={handleDeleteCompany}
            />

            <div className="border-t border-neutral-200 dark:border-neutral-700/80 pt-8">
              <BillsArchive
                bills={bills}
                companies={companies}
                onEditBill={handleEditBillFromArchive}
                onDuplicateBill={handleDuplicateBill}
                onDeleteBill={handleDeleteBill}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Bills Archive standalone */}
        {activeTab === 'archive' && (
          <BillsArchive
            bills={bills}
            companies={companies}
            onEditBill={handleEditBillFromArchive}
            onDuplicateBill={handleDuplicateBill}
            onDeleteBill={handleDeleteBill}
          />
        )}
      </main>
    </div>
  );
}
