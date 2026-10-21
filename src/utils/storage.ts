import { CompanyProfile, BillData, PartyProfile } from '../types';
import { THE_FOUR_COMPANIES, INITIAL_PARTIES, DEFAULT_BILL } from './defaultData';

// In-memory cache for synchronous React state access
let cachedCompanies: CompanyProfile[] = [...THE_FOUR_COMPANIES];
let cachedParties: PartyProfile[] = [...INITIAL_PARTIES];
let cachedBills: BillData[] = [DEFAULT_BILL];
let activeCompanyId: string = THE_FOUR_COMPANIES[0].id;

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
  },

  getParties(): PartyProfile[] {
    return cachedParties;
  },

  getBills(): BillData[] {
    return cachedBills;
  },

  // Save company (Optimistic local update + server cloud persist)
  saveCompany(company: CompanyProfile): CompanyProfile[] {
    const existingIndex = cachedCompanies.findIndex((c) => c.id === company.id);
    if (existingIndex >= 0) {
      cachedCompanies[existingIndex] = { ...company };
    } else {
      cachedCompanies.push({ ...company });
    }

    // Persist to server in background
    fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) cachedCompanies = data.companies;
      })
      .catch((err) => console.warn('Cloud sync error for company:', err));

    return [...cachedCompanies];
  },

  deleteCompany(id: string): CompanyProfile[] {
    cachedCompanies = cachedCompanies.filter((c) => c.id !== id);

    fetch(`/api/companies/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) cachedCompanies = data.companies;
      })
      .catch((err) => console.warn('Cloud delete error for company:', err));

    return [...cachedCompanies];
  },

  // Save party
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

    fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.parties) cachedParties = data.parties;
      })
      .catch((err) => console.warn('Cloud sync error for party:', err));

    return [...cachedParties];
  },

  deleteParty(id: string): PartyProfile[] {
    cachedParties = cachedParties.filter((p) => p.id !== id);

    fetch(`/api/parties/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.parties) cachedParties = data.parties;
      })
      .catch((err) => console.warn('Cloud delete error for party:', err));

    return [...cachedParties];
  },

  // Save bill (Also automatically upserts party into party dropdown on cloud server)
  saveBill(bill: BillData): BillData[] {
    const existingIndex = cachedBills.findIndex((b) => b.id === bill.id);
    const updatedBill = {
      ...bill,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      cachedBills[existingIndex] = updatedBill;
    } else {
      cachedBills.unshift(updatedBill);
    }

    // Auto update party locally too
    if (bill.partyName && bill.partyName.trim()) {
      const pName = bill.partyName.trim();
      const pIdx = cachedParties.findIndex((p) => p.name.trim().toLowerCase() === pName.toLowerCase());
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
    }

    // Persist to server cloud store
    fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBill),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.bills) cachedBills = data.bills;
        if (data.parties) cachedParties = data.parties;
      })
      .catch((err) => console.warn('Cloud save error for bill:', err));

    return [...cachedBills];
  },

  deleteBill(id: string): BillData[] {
    cachedBills = cachedBills.filter((b) => b.id !== id);

    fetch(`/api/bills/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.bills) cachedBills = data.bills;
      })
      .catch((err) => console.warn('Cloud delete error for bill:', err));

    return [...cachedBills];
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
      if (data.companies?.length) cachedCompanies = data.companies;
      if (data.parties?.length) cachedParties = data.parties;
      if (data.bills?.length) cachedBills = data.bills;

      return {
        companies: cachedCompanies,
        parties: cachedParties,
        bills: cachedBills,
      };
    } catch (err) {
      console.warn('Using default seed data fallback:', err);
      return {
        companies: cachedCompanies,
        parties: cachedParties,
        bills: cachedBills,
      };
    }
  },
};
