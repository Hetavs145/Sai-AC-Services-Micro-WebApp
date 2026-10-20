import { CompanyProfile, BillData, DocProject } from '../types';
import { SAMPLE_COMPANIES, DEFAULT_COMPANY, DEFAULT_BILL } from './defaultData';

const STORAGE_KEYS = {
  COMPANIES: 'patraka_companies_v1',
  BILLS: 'patraka_bills_v1',
  DOC_PROJECTS: 'patraka_doc_projects_v1',
  ACTIVE_COMPANY_ID: 'patraka_active_company_id_v1',
};

export const storage = {
  // Companies
  getCompanies(): CompanyProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPANIES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(SAMPLE_COMPANIES));
        return SAMPLE_COMPANIES;
      }
      return JSON.parse(data);
    } catch {
      return SAMPLE_COMPANIES;
    }
  },

  saveCompany(company: CompanyProfile): CompanyProfile[] {
    const list = this.getCompanies();
    const existingIndex = list.findIndex((c) => c.id === company.id);
    let updated: CompanyProfile[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = company;
    } else {
      updated = [company, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(updated));
    return updated;
  },

  deleteCompany(id: string): CompanyProfile[] {
    const list = this.getCompanies();
    if (list.length <= 1) {
      // Don't delete last company
      return list;
    }
    const filtered = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(filtered));
    return filtered;
  },

  getActiveCompany(): CompanyProfile {
    const companies = this.getCompanies();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY_ID);
    if (activeId) {
      const found = companies.find((c) => c.id === activeId);
      if (found) return found;
    }
    const defaultComp = companies.find((c) => c.isDefault) || companies[0] || DEFAULT_COMPANY;
    return defaultComp;
  },

  setActiveCompanyId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY_ID, id);
  },

  // Bills Archive
  getBills(): BillData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BILLS);
      if (!data) {
        const initial = [DEFAULT_BILL];
        localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return [DEFAULT_BILL];
    }
  },

  saveBill(bill: BillData): BillData[] {
    const bills = this.getBills();
    const index = bills.findIndex((b) => b.id === bill.id);
    let updated: BillData[];
    if (index >= 0) {
      updated = [...bills];
      updated[index] = { ...bill, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...bill, updatedAt: new Date().toISOString() }, ...bills];
    }
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
    return updated;
  },

  deleteBill(id: string): BillData[] {
    const bills = this.getBills();
    const filtered = bills.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(filtered));
    return filtered;
  },

  // Document Projects
  getDocProjects(): DocProject[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOC_PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveDocProject(proj: DocProject): DocProject[] {
    const projs = this.getDocProjects();
    const index = projs.findIndex((p) => p.id === proj.id);
    let updated: DocProject[];
    if (index >= 0) {
      updated = [...projs];
      updated[index] = proj;
    } else {
      updated = [proj, ...projs];
    }
    localStorage.setItem(STORAGE_KEYS.DOC_PROJECTS, JSON.stringify(updated));
    return updated;
  },
};
