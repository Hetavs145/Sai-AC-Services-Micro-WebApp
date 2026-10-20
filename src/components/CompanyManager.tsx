import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, Check, Star, ArrowRight, ShieldCheck } from 'lucide-react';
import { CompanyProfile, BillData } from '../types';

interface CompanyManagerProps {
  companies: CompanyProfile[];
  activeCompanyId: string;
  bills: BillData[];
  onSelectCompany: (company: CompanyProfile) => void;
  onSaveCompany: (company: CompanyProfile) => void;
  onDeleteCompany: (id: string) => void;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({
  companies,
  activeCompanyId,
  bills,
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null);

  const startNewCompany = () => {
    const newComp: CompanyProfile = {
      id: `company-${Date.now()}`,
      name: '',
      address: '',
      gstin: '',
      msme: '',
      mobile: '',
      bankName: '',
      accountNo: '',
      branch: '',
      ifsc: '',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    setEditingCompany(newComp);
    setIsEditing(true);
  };

  const startEditCompany = (comp: CompanyProfile) => {
    setEditingCompany({ ...comp });
    setIsEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editingCompany.name.trim()) return;
    onSaveCompany(editingCompany);
    setIsEditing(false);
    setEditingCompany(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <span>Company & Organization Profiles</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Save company details once (GSTIN, MSME, Bank Accounts). Select any company to instantly format your bill template.
          </p>
        </div>

        <button
          onClick={startNewCompany}
          className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Company</span>
        </button>
      </div>

      {/* Edit / Create Form Modal / Inline Box */}
      {isEditing && editingCompany && (
        <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-100 rounded-xl p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700 mb-4">
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
              {editingCompany.name ? `Edit ${editingCompany.name}` : 'New Company Profile'}
            </h3>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingCompany(null);
              }}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  placeholder="e.g. SAI AC SERVICES"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm font-semibold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Mobile / Contact No
                </label>
                <input
                  type="text"
                  value={editingCompany.mobile}
                  onChange={(e) => setEditingCompany({ ...editingCompany, mobile: e.target.value })}
                  placeholder="e.g. 9825184032"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Full Business Address
                </label>
                <input
                  type="text"
                  value={editingCompany.address}
                  onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  placeholder="e.g. B-1/180 RIDHI SIDHI SOCIETY, B/H PAVANDHAM, SAMTA, VADODARA"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={editingCompany.gstin}
                  onChange={(e) => setEditingCompany({ ...editingCompany, gstin: e.target.value })}
                  placeholder="e.g. 24AOIPS5416G1ZW"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono uppercase border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  MSME Registration No
                </label>
                <input
                  type="text"
                  value={editingCompany.msme}
                  onChange={(e) => setEditingCompany({ ...editingCompany, msme: e.target.value })}
                  placeholder="e.g. UDHYAM-GJ-24-0088174"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={editingCompany.bankName}
                  onChange={(e) => setEditingCompany({ ...editingCompany, bankName: e.target.value })}
                  placeholder="e.g. ICICI Bank"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Bank A/C Number
                </label>
                <input
                  type="text"
                  value={editingCompany.accountNo}
                  onChange={(e) => setEditingCompany({ ...editingCompany, accountNo: e.target.value })}
                  placeholder="e.g. 000305016085"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={editingCompany.branch}
                  onChange={(e) => setEditingCompany({ ...editingCompany, branch: e.target.value })}
                  placeholder="e.g. Vadodara Main Branch"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={editingCompany.ifsc}
                  onChange={(e) => setEditingCompany({ ...editingCompany, ifsc: e.target.value })}
                  placeholder="e.g. ICIC0000003"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono uppercase border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50/50 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCompany.isDefault}
                  onChange={(e) => setEditingCompany({ ...editingCompany, isDefault: e.target.checked })}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Set as Primary / Default Company
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => {
          const isActive = company.id === activeCompanyId;
          const companyBillsCount = bills.filter((b) => b.company.id === company.id).length;

          return (
            <div
              key={company.id}
              className={`bg-white dark:bg-neutral-800 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-neutral-900 dark:border-white shadow-sm ring-1 ring-neutral-900 dark:ring-white'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
                      {company.name}
                    </h3>
                    {company.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditCompany(company)}
                      aria-label="Edit company"
                      className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {companies.length > 1 && (
                      <button
                        onClick={() => onDeleteCompany(company.id)}
                        aria-label="Delete company"
                        className="p-1 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3">
                  {company.address || 'No address set'}
                </p>

                <div className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300 font-mono">
                  {company.gstin && <div>GSTIN: {company.gstin}</div>}
                  {company.mobile && <div>Phone: {company.mobile}</div>}
                  {company.bankName && (
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">
                      Bank: {company.bankName} ({company.accountNo || 'N/A'})
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {companyBillsCount} {companyBillsCount === 1 ? 'bill created' : 'bills created'}
                </span>

                {isActive ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>Active In Template</span>
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectCompany(company)}
                    className="flex items-center gap-1 text-xs font-semibold text-neutral-900 dark:text-white hover:underline"
                  >
                    <span>Use for Bills</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
