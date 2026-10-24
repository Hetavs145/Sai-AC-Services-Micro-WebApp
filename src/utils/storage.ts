import { CompanyProfile, BillData, PartyProfile } from '../types';
import { THE_FOUR_COMPANIES, INITIAL_PARTIES, DEFAULT_BILL } from './defaultData';
import { calculateFinancialYear } from './financialYear';
import {
  saveCompanyToFirestore,
  deleteCompanyFromFirestore,
  savePartyToFirestore,
  deletePartyFromFirestore,
  saveBillToFirestore,
  deleteBillFromFirestore,
  subscribeToCompanies,
  subscribeToParties,
  subscribeToBills,
} from './firebase';

const LS_COMPANIES_KEY = 'patraka_companies_cache';
const LS_PARTIES_KEY = 'patraka_parties_cache';
const LS_BILLS_KEY = 'patraka_bills_cache';
const LS_ACTIVE_COMP_KEY = 'patraka_active_company_id';

// Read local cache helper
function readLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Local storage write warning:', e);
  }
}

// In-memory cache for synchronous React state access
let cachedCompanies: CompanyProfile[] = readLocalCache<CompanyProfile[]>(LS_COMPANIES_KEY, [
  ...THE_FOUR_COMPANIES,
]);
let cachedParties: PartyProfile[] = readLocalCache<PartyProfile[]>(LS_PARTIES_KEY, [
  ...INITIAL_PARTIES,
]);
let cachedBills: BillData[] = readLocalCache<BillData[]>(LS_BILLS_KEY, [
  {
    ...DEFAULT_BILL,
    financialYear: calculateFinancialYear(DEFAULT_BILL.date),
  },
]);

let activeCompanyId: string =
  localStorage.getItem(LS_ACTIVE_COMP_KEY) || THE_FOUR_COMPANIES[0].id;

export const storage = {
  // Sync Getters
  getCompanies(): CompanyProfile[] {
    return cachedCompanies;
  },

  getActiveCompany(): CompanyProfile {
    return (
      cachedCompanies.find((c) => c.id === activeCompanyId) ||
      cachedCompanies[0] ||
      THE_FOUR_COMPANIES[0]
    );
  },

  setActiveCompanyId(id: string) {
    activeCompanyId = id;
    try {
      localStorage.setItem(LS_ACTIVE_COMP_KEY, id);
    } catch {}
  },

  getParties(): PartyProfile[] {
    return cachedParties;
  },

  getBills(): BillData[] {
    return cachedBills;
  },

  // Save company (Multi-tier: Firestore Realtime + Server Cloud + LocalStorage)
  saveCompany(company: CompanyProfile): CompanyProfile[] {
    const existingIndex = cachedCompanies.findIndex((c) => c.id === company.id);
    if (existingIndex >= 0) {
      cachedCompanies[existingIndex] = { ...company };
    } else {
      cachedCompanies.push({ ...company });
    }

    writeLocalCache(LS_COMPANIES_KEY, cachedCompanies);

    // 1. Persist to Firestore Realtime DB for instant cross-platform sync
    saveCompanyToFirestore(company);

    // 2. Persist to Server Cloud Store backup
    fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) {
          cachedCompanies = data.companies;
          writeLocalCache(LS_COMPANIES_KEY, cachedCompanies);
        }
      })
      .catch((err) => console.warn('Cloud sync error for company:', err));

    return [...cachedCompanies];
  },

  deleteCompany(id: string): CompanyProfile[] {
    cachedCompanies = cachedCompanies.filter((c) => c.id !== id);
    writeLocalCache(LS_COMPANIES_KEY, cachedCompanies);

    // 1. Delete from Firestore Realtime DB
    deleteCompanyFromFirestore(id);

    // 2. Delete from Server Cloud Store
    fetch(`/api/companies/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) {
          cachedCompanies = data.companies;
          writeLocalCache(LS_COMPANIES_KEY, cachedCompanies);
        }
      })
      .catch((err) => console.warn('Cloud delete error for company:', err));

    return [...cachedCompanies];
  },

  // Save party (Firestore Realtime + Server Cloud + LocalStorage)
  saveParty(party: PartyProfile): PartyProfile[] {
    const existingIndex = cachedParties.findIndex(
      (p) => p.id === party.id || p.name.trim().toLowerCase() === party.name.trim().toLowerCase()
    );
    const updated = {
      ...party,
      id: party.id || `party-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      cachedParties[existingIndex] = updated;
    } else {
      cachedParties.unshift(updated);
    }

    writeLocalCache(LS_PARTIES_KEY, cachedParties);

    // 1. Persist to Firestore
    savePartyToFirestore(updated);

    // 2. Persist to Server
    fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.parties) {
          cachedParties = data.parties;
          writeLocalCache(LS_PARTIES_KEY, cachedParties);
        }
      })
      .catch((err) => console.warn('Cloud sync error for party:', err));

    return [...cachedParties];
  },

  deleteParty(id: string): PartyProfile[] {
    cachedParties = cachedParties.filter((p) => p.id !== id);
    writeLocalCache(LS_PARTIES_KEY, cachedParties);

    // 1. Delete from Firestore
    deletePartyFromFirestore(id);

    // 2. Delete from Server
    fetch(`/api/parties/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.parties) {
          cachedParties = data.parties;
          writeLocalCache(LS_PARTIES_KEY, cachedParties);
        }
      })
      .catch((err) => console.warn('Cloud delete error for party:', err));

    return [...cachedParties];
  },

  // Save bill with Financial Year calculation (1 FY & historical archive retention)
  saveBill(bill: BillData): BillData[] {
    const financialYear = bill.financialYear || calculateFinancialYear(bill.date);
    const updatedBill: BillData = {
      ...bill,
      financialYear,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = cachedBills.findIndex((b) => b.id === bill.id);
    if (existingIndex >= 0) {
      cachedBills[existingIndex] = updatedBill;
    } else {
      cachedBills.unshift(updatedBill);
    }

    writeLocalCache(LS_BILLS_KEY, cachedBills);

    // Auto-update party record locally
    if (bill.partyName && bill.partyName.trim()) {
      const pName = bill.partyName.trim();
      const pIdx = cachedParties.findIndex(
        (p) => p.name.trim().toLowerCase() === pName.toLowerCase()
      );
      const pData: PartyProfile = {
        id: pIdx >= 0 ? cachedParties[pIdx].id : `party-${Date.now()}`,
        name: pName,
        siteAddress: bill.siteAddress || '',
        gstin: bill.partyGstin || '',
        updatedAt: new Date().toISOString(),
      };
      if (pIdx >= 0) {
        cachedParties[pIdx] = { ...cachedParties[pIdx], ...pData };
      } else {
        cachedParties.unshift(pData);
      }
      writeLocalCache(LS_PARTIES_KEY, cachedParties);
      savePartyToFirestore(pData);
    }

    // 1. Persist to Firestore Realtime Database
    saveBillToFirestore(updatedBill);

    // 2. Persist to Server Cloud Store
    fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBill),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.bills) {
          cachedBills = data.bills;
          writeLocalCache(LS_BILLS_KEY, cachedBills);
        }
        if (data.parties) {
          cachedParties = data.parties;
          writeLocalCache(LS_PARTIES_KEY, cachedParties);
        }
      })
      .catch((err) => console.warn('Cloud save error for bill:', err));

    return [...cachedBills];
  },

  // Delete bill from all stores (Firestore + Server + LocalStorage)
  deleteBill(id: string): BillData[] {
    cachedBills = cachedBills.filter((b) => b.id !== id);
    writeLocalCache(LS_BILLS_KEY, cachedBills);

    // 1. Delete from Firestore Realtime Database
    deleteBillFromFirestore(id);

    // 2. Delete from Server Cloud Store
    fetch(`/api/bills/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.bills) {
          cachedBills = data.bills;
          writeLocalCache(LS_BILLS_KEY, cachedBills);
        }
      })
      .catch((err) => console.warn('Cloud delete error for bill:', err));

    return [...cachedBills];
  },

  // Subscribe to live Firestore updates across platforms
  initRealtimeSync(callbacks: {
    onCompanies?: (companies: CompanyProfile[]) => void;
    onParties?: (parties: PartyProfile[]) => void;
    onBills?: (bills: BillData[]) => void;
  }) {
    const unsubCompanies = subscribeToCompanies((companies) => {
      cachedCompanies = companies;
      writeLocalCache(LS_COMPANIES_KEY, companies);
      callbacks.onCompanies?.(companies);
    });

    const unsubParties = subscribeToParties((parties) => {
      cachedParties = parties;
      writeLocalCache(LS_PARTIES_KEY, parties);
      callbacks.onParties?.(parties);
    });

    const unsubBills = subscribeToBills((bills) => {
      cachedBills = bills;
      writeLocalCache(LS_BILLS_KEY, bills);
      callbacks.onBills?.(bills);
    });

    return () => {
      unsubCompanies();
      unsubParties();
      unsubBills();
    };
  },

  // Fetch initial cloud data from server on app load
  async fetchCloudData(): Promise<{
    companies: CompanyProfile[];
    parties: PartyProfile[];
    bills: BillData[];
  }> {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch from server');
      const data = await res.json();
      if (data.companies?.length) {
        cachedCompanies = data.companies;
        writeLocalCache(LS_COMPANIES_KEY, cachedCompanies);
      }
      if (data.parties?.length) {
        cachedParties = data.parties;
        writeLocalCache(LS_PARTIES_KEY, cachedParties);
      }
      if (data.bills?.length) {
        cachedBills = data.bills.map((b: any) => ({
          ...b,
          financialYear: b.financialYear || calculateFinancialYear(b.date),
        }));
        writeLocalCache(LS_BILLS_KEY, cachedBills);
      }

      return {
        companies: cachedCompanies,
        parties: cachedParties,
        bills: cachedBills,
      };
    } catch (err) {
      console.warn('Using default seed / cached fallback:', err);
      return {
        companies: cachedCompanies,
        parties: cachedParties,
        bills: cachedBills,
      };
    }
  },
};
