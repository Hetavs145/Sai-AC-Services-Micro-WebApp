import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CompanyProfile, PartyProfile, BillData } from '../types';
import { calculateFinancialYear } from './financialYear';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db: Firestore =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Connection verification
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, operating with cached and local fallback store.');
    }
  }
}
testConnection();

// Real-time synchronization listeners across devices & tabs
export function subscribeToCompanies(onUpdate: (companies: CompanyProfile[]) => void) {
  try {
    const colRef = collection(db, 'companies');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const companies: CompanyProfile[] = [];
          snapshot.forEach((docSnap) => {
            companies.push(docSnap.data() as CompanyProfile);
          });
          onUpdate(companies);
        }
      },
      (err) => {
        console.warn('Firestore companies subscription notice:', err.message);
      }
    );
  } catch (e) {
    console.warn('Unable to subscribe to companies collection:', e);
    return () => {};
  }
}

export function subscribeToParties(onUpdate: (parties: PartyProfile[]) => void) {
  try {
    const colRef = collection(db, 'parties');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const parties: PartyProfile[] = [];
          snapshot.forEach((docSnap) => {
            parties.push(docSnap.data() as PartyProfile);
          });
          onUpdate(parties);
        }
      },
      (err) => {
        console.warn('Firestore parties subscription notice:', err.message);
      }
    );
  } catch (e) {
    console.warn('Unable to subscribe to parties collection:', e);
    return () => {};
  }
}

export function subscribeToBills(onUpdate: (bills: BillData[]) => void) {
  try {
    const colRef = collection(db, 'bills');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const bills: BillData[] = [];
          snapshot.forEach((docSnap) => {
            const bill = docSnap.data() as BillData;
            // Ensure financialYear is computed if missing
            if (!bill.financialYear && bill.date) {
              bill.financialYear = calculateFinancialYear(bill.date);
            }
            bills.push(bill);
          });
          onUpdate(bills);
        }
      },
      (err) => {
        console.warn('Firestore bills subscription notice:', err.message);
      }
    );
  } catch (e) {
    console.warn('Unable to subscribe to bills collection:', e);
    return () => {};
  }
}

// Write & Delete actions in Firestore
export async function saveCompanyToFirestore(company: CompanyProfile): Promise<void> {
  try {
    const docRef = doc(db, 'companies', company.id);
    await setDoc(docRef, {
      ...company,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore save company notice:', e);
  }
}

export async function deleteCompanyFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'companies', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore delete company notice:', e);
  }
}

export async function savePartyToFirestore(party: PartyProfile): Promise<void> {
  try {
    const docRef = doc(db, 'parties', party.id);
    await setDoc(docRef, {
      ...party,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore save party notice:', e);
  }
}

export async function deletePartyFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'parties', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore delete party notice:', e);
  }
}

export async function saveBillToFirestore(bill: BillData): Promise<void> {
  try {
    const docRef = doc(db, 'bills', bill.id);
    const enrichedBill = {
      ...bill,
      financialYear: bill.financialYear || calculateFinancialYear(bill.date),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, enrichedBill, { merge: true });
  } catch (e) {
    console.warn('Firestore save bill notice:', e);
  }
}

export async function deleteBillFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'bills', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore delete bill notice:', e);
  }
}
