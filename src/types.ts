export interface PartyProfile {
  id: string;
  name: string;
  siteAddress: string;
  gstin: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  isGst: boolean; // true only for SAI AC SERVICES, false for HETAV SHAH, SWATI SHAH, NENSI SHAH
  address: string;
  gstin: string;
  msme: string;
  mobile: string;
  bankName: string;
  accountNo: string;
  branch: string;
  ifsc: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface BillItem {
  id: string;
  particulars: string;
  hsnCode: string;
  qty: string;
  rate: number;
  amount: number;
}

export interface BillData {
  id: string;
  invoiceNo: string;
  date: string;
  financialYear?: string; // e.g. "FY 2024-25", "FY 2026-27"
  company: CompanyProfile;
  partyName: string;
  siteAddress: string;
  partyGstin: string;
  items: BillItem[];
  subtotal: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  grandTotal: number;
  amountInWords: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocAnnotation {
  id: string;
  text: string;
  xPercent: number; // 0 - 100% position on image
  yPercent: number; // 0 - 100% position on image
  style: 'badge' | 'callout' | 'stamp' | 'tag';
  color: string;
  pageIndex: number;
  gujaratiOriginal?: string;
}

export interface DocPage {
  id: string;
  pageNumber: number;
  imageDataUrl: string;
  imageName: string;
  title: string;
  caption: string;
  annotations: DocAnnotation[];
}

export interface DocProject {
  id: string;
  title: string;
  companyName: string;
  clientName: string;
  date: string;
  pages: DocPage[];
  notes: string;
}
