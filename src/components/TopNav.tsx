import React from 'react';
import { FileText, Image as ImageIcon, Building2, Moon, Sun, Plus } from 'lucide-react';

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
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors no-print shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            P
          </div>
          <div>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('bill');
              }}
              className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap block"
            >
              Patraka Bill & DocCraft
            </a>
            {activeCompanyName && (
              <span className="text-xs text-neutral-500 font-medium truncate max-w-[160px] sm:max-w-xs block">
                Active: {activeCompanyName}
              </span>
            )}
          </div>
        </div>

        {/* Zone 2: Navigation Links (Single-Line) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => setActiveTab('bill')}
            className={`flex items-center gap-2 px-3 py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'bill'
                ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tax Invoice Maker</span>
          </button>

          <button
            onClick={() => setActiveTab('docStudio')}
            className={`flex items-center gap-2 px-3 py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'docStudio'
                ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo-to-PDF & Word</span>
          </button>

          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-3 py-2 text-xs lg:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'companies'
                ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50'
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
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Bill</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Mobile Subnav for 390px screens */}
      <div className="flex md:hidden items-center justify-around gap-1 mt-2.5 pt-2 border-t border-neutral-100">
        <button
          onClick={() => setActiveTab('bill')}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'bill'
              ? 'bg-neutral-100 text-neutral-900 font-semibold'
              : 'text-neutral-500'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bill</span>
        </button>

        <button
          onClick={() => setActiveTab('docStudio')}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'docStudio'
              ? 'bg-neutral-100 text-neutral-900 font-semibold'
              : 'text-neutral-500'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Photo Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
            activeTab === 'companies'
              ? 'bg-neutral-100 text-neutral-900 font-semibold'
              : 'text-neutral-500'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Companies</span>
        </button>
      </div>
    </header>
  );
};
