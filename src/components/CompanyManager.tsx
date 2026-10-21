import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, Check, Star, ArrowRight, ShieldCheck, Phone, MapPin, Landmark } from 'lucide-react';
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
      isGst: false,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Company & Organization Profiles</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which company's letterhead, bank details, and GST status format your bills.
            </p>
          </div>
        </div>

        <button
          onClick={startNewCompany}
          className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Company</span>
        </button>
      </div>

      {/* Edit / Create Form Modal / Inline Box */}
      {isEditing && editingCompany && (
        <div className="bg-white border-2 border-blue-500 rounded-xl p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              <span>{editingCompany.name ? `Edit ${editingCompany.name}` : 'New Company Profile'}</span>
            </h3>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingCompany(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  placeholder="e.g. SAI AC SERVICES / HETAV SHAH"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mobile / Contact No
                </label>
                <input
                  type="text"
                  value={editingCompany.mobile}
                  onChange={(e) => setEditingCompany({ ...editingCompany, mobile: e.target.value })}
                  placeholder="e.g. 9825184032"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Business Address
                </label>
                <input
                  type="text"
                  value={editingCompany.address}
                  onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  placeholder="e.g. B-1/180 RIDHI SIDHI SOCIETY, B/H PAVANDHAM, SAMTA, VADODARA"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={editingCompany.gstin}
                  onChange={(e) => setEditingCompany({ ...editingCompany, gstin: e.target.value })}
                  placeholder="e.g. 24AOIPS5416G1ZW (leave blank if non-GST)"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono uppercase border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  MSME Registration No
                </label>
                <input
                  type="text"
                  value={editingCompany.msme}
                  onChange={(e) => setEditingCompany({ ...editingCompany, msme: e.target.value })}
                  placeholder="e.g. UDHYAM-GJ-24-0088174"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={editingCompany.bankName}
                  onChange={(e) => setEditingCompany({ ...editingCompany, bankName: e.target.value })}
                  placeholder="e.g. ICICI Bank"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank A/C Number
                </label>
                <input
                  type="text"
                  value={editingCompany.accountNo}
                  onChange={(e) => setEditingCompany({ ...editingCompany, accountNo: e.target.value })}
                  placeholder="e.g. 000305016085"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={editingCompany.branch}
                  onChange={(e) => setEditingCompany({ ...editingCompany, branch: e.target.value })}
                  placeholder="e.g. Samta, Vadodara"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={editingCompany.ifsc}
                  onChange={(e) => setEditingCompany({ ...editingCompany, ifsc: e.target.value })}
                  placeholder="e.g. ICIC0000003"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono uppercase border border-slate-300 rounded-lg bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCompany.isGst}
                    onChange={(e) => setEditingCompany({ ...editingCompany, isGst: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    GST Registered Firm (Checked for Sai AC Services; Uncheck for Hetav, Swati, Nensi)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCompany.isDefault}
                    onChange={(e) => setEditingCompany({ ...editingCompany, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Set as Primary Default
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((company) => {
          const isActive = company.id === activeCompanyId;
          const companyBillsCount = bills.filter((b) => b.company.id === company.id).length;

          return (
            <div
              key={company.id}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-2 border-blue-600 ring-2 ring-blue-100 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {company.name}
                    </h3>
                    {company.isGst ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        GST Active (18%)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Non-GST Firm
                      </span>
                    )}
                    {company.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditCompany(company)}
                      aria-label="Edit company"
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                      title="Edit company profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {companies.length > 1 && (
                      <button
                        onClick={() => onDeleteCompany(company.id)}
                        aria-label="Delete company"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed">
                    {company.address || 'No address set'}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200/70 rounded-lg p-2.5">
                  {company.gstin && (
                    <div className="font-mono text-[11px] flex items-center justify-between">
                      <span className="text-slate-500 font-sans">GSTIN:</span>
                      <span className="font-semibold text-slate-800">{company.gstin}</span>
                    </div>
                  )}
                  {company.mobile && (
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="font-mono font-medium text-slate-800">{company.mobile}</span>
                    </div>
                  )}
                  {company.bankName && (
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-500">Bank:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">
                        {company.bankName} {company.accountNo ? `(${company.accountNo})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {companyBillsCount} {companyBillsCount === 1 ? 'bill created' : 'bills created'}
                </span>

                {isActive ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    <Check className="w-4 h-4 text-blue-600" />
                    <span>Active in Template</span>
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectCompany(company)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-xs"
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
