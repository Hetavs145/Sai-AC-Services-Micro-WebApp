import React from 'react';
import { FileText, Image as ImageIcon, Building2, Plus, Archive } from 'lucide-react';

interface TopNavProps {
  activeTab: 'bill' | 'docStudio' | 'companies' | 'archive';
  setActiveTab: (tab: 'bill' | 'docStudio' | 'companies' | 'archive') => void;
  onNewBill: () => void;
  activeCompanyName?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onNewBill,
  activeCompanyName,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors no-print shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            P
          </div>
          <div>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('bill');
              }}
              className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block"
            >
              Patraka Bill & DocCraft
            </a>
            {activeCompanyName && (
              <span className="text-xs text-slate-500 font-medium truncate max-w-[160px] sm:max-w-xs block">
                Active: <span className="font-semibold text-slate-700">{activeCompanyName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => setActiveTab('bill')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'bill'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tax Invoice Maker</span>
          </button>

          <button
            onClick={() => setActiveTab('docStudio')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'docStudio'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'companies'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Profiles</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onNewBill}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Bill</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Mobile Subnav */}
      <div className="flex md:hidden items-center justify-around gap-1 mt-2.5 pt-2 border-t border-slate-100">
        <button
          onClick={() => setActiveTab('bill')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
            activeTab === 'bill'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bill</span>
        </button>

        <button
          onClick={() => setActiveTab('docStudio')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
            activeTab === 'docStudio'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Photo Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
            activeTab === 'companies'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-600'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Companies</span>
        </button>
      </div>
    </header>
  );
};
