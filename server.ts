import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser with 50MB limit for high-res photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side cloud persistence (No cost, stored centrally on server)
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const SEED_COMPANIES = [
  {
    id: 'company-sai-ac',
    name: 'SAI AC SERVICES',
    isGst: true,
    address: 'B-1/180 RIDHI SIDHI SOCIETY, B/H PAVANDHAM, SAMTA, VADODARA',
    gstin: '24AOIPS5416G1ZW',
    msme: 'UDHYAM-GJ-24-0088174',
    mobile: '9825184032',
    bankName: 'ICICI Bank',
    accountNo: '000305016085',
    branch: 'Vadodara Main Branch',
    ifsc: 'ICIC0000003',
    isDefault: true,
    createdAt: '2024-10-07T10:00:00.000Z',
  },
  {
    id: 'company-hetav-shah',
    name: 'HETAV SHAH',
    isGst: false, // Non-GST company
    address: 'B-1/180 RIDHI SIDHI SOCIETY, SAMTA, VADODARA - 390023',
    gstin: '',
    msme: '',
    mobile: '9825184032',
    bankName: 'ICICI Bank',
    accountNo: '000305016085',
    branch: 'Vadodara Main Branch',
    ifsc: 'ICIC0000003',
    isDefault: false,
    createdAt: '2024-10-07T10:00:00.000Z',
  },
  {
    id: 'company-swati-shah',
    name: 'SWATI SHAH',
    isGst: false, // Non-GST company
    address: 'B-1/180 RIDHI SIDHI SOCIETY, SAMTA, VADODARA - 390023',
    gstin: '',
    msme: '',
    mobile: '9825184032',
    bankName: 'ICICI Bank',
    accountNo: '000305016085',
    branch: 'Vadodara Main Branch',
    ifsc: 'ICIC0000003',
    isDefault: false,
    createdAt: '2024-10-07T10:00:00.000Z',
  },
  {
    id: 'company-nensi-shah',
    name: 'NENSI SHAH',
    isGst: false, // Non-GST company
    address: 'B-1/180 RIDHI SIDHI SOCIETY, SAMTA, VADODARA - 390023',
    gstin: '',
    msme: '',
    mobile: '9825184032',
    bankName: 'ICICI Bank',
    accountNo: '000305016085',
    branch: 'Vadodara Main Branch',
    ifsc: 'ICIC0000003',
    isDefault: false,
    createdAt: '2024-10-07T10:00:00.000Z',
  },
];

const SEED_PARTIES = [
  {
    id: 'party-shree-shddhi',
    name: 'SHREE SHDDHI CREATEURS',
    siteAddress: 'Site :-Sanvi Casa, Tarsali Ring road, vadodara. (Block No. 1)',
    gstin: '24ADEFS0224R2ZW',
    phone: '9824012345',
    updatedAt: '2024-10-07T14:30:00.000Z',
  },
  {
    id: 'party-patel-constructions',
    name: 'PATEL CONSTRUCTIONS',
    siteAddress: 'Opp. Reliance Fresh, Manjalpur Main Road, Vadodara',
    gstin: '24AAECP1928K1ZZ',
    phone: '9879554321',
    updatedAt: '2024-10-01T10:00:00.000Z',
  },
];

const SEED_BILLS = [
  {
    id: 'bill-template-28',
    invoiceNo: '28',
    date: '2024-10-07',
    company: SEED_COMPANIES[0],
    partyName: 'SHREE SHDDHI CREATEURS',
    siteAddress: 'Site :-Sanvi Casa, Tarsali Ring road, vadodara. (Block No. 1)',
    partyGstin: '24ADEFS0224R2ZW',
    items: [
      {
        id: 'item-1',
        particulars: 'Copper pipe with insulation.',
        hsnCode: '7411',
        qty: '46rft.',
        rate: 200,
        amount: 9200,
      },
      {
        id: 'item-2',
        particulars: '4 core cable.',
        hsnCode: '8544',
        qty: '46rft.',
        rate: 40,
        amount: 1840,
      },
      {
        id: 'item-3',
        particulars: 'UPVC drainpipe.',
        hsnCode: '3917',
        qty: '80rft.',
        rate: 50,
        amount: 4000,
      },
      {
        id: 'item-4',
        particulars: 'Jari Work',
        hsnCode: '-',
        qty: '107rft.',
        rate: 40,
        amount: 4280,
      },
    ],
    subtotal: 19320,
    cgstPercent: 9,
    cgstAmount: 1738.80,
    sgstPercent: 9,
    sgstAmount: 1738.80,
    igstPercent: 0,
    igstAmount: 0,
    grandTotal: 22798.00,
    amountInWords: 'Twenty Two Thousand Seven Hundred Ninety Eight Only',
    notes: 'Material delivered at site as per specifications.',
    createdAt: '2024-10-07T14:30:00.000Z',
    updatedAt: '2024-10-07T14:30:00.000Z',
  },
];

function readServerStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial = {
        companies: SEED_COMPANIES,
        parties: SEED_PARTIES,
        bills: SEED_BILLS,
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure the 4 companies are always present
    SEED_COMPANIES.forEach((seedComp) => {
      const exists = parsed.companies?.some((c: any) => c.name.toLowerCase() === seedComp.name.toLowerCase());
      if (!exists) {
        parsed.companies = [...(parsed.companies || []), seedComp];
      }
    });
    return parsed;
  } catch (err) {
    console.error('Error reading server store:', err);
    return {
      companies: SEED_COMPANIES,
      parties: SEED_PARTIES,
      bills: SEED_BILLS,
    };
  }
}

function writeServerStore(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server store:', err);
  }
}

// REST endpoints for cloud storage (Centralized on server, 0 cost)
app.get('/api/data', (req, res) => {
  const store = readServerStore();
  res.json({ success: true, ...store });
});

// Upsert party
app.post('/api/parties', (req, res) => {
  try {
    const party = req.body;
    if (!party || !party.name) {
      return res.status(400).json({ error: 'Party name is required' });
    }

    const store = readServerStore();
    const parties = store.parties || [];
    const existingIndex = parties.findIndex(
      (p: any) => p.id === party.id || p.name.trim().toLowerCase() === party.name.trim().toLowerCase()
    );

    const updatedParty = {
      ...party,
      id: party.id || `party-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      parties[existingIndex] = { ...parties[existingIndex], ...updatedParty };
    } else {
      parties.unshift(updatedParty);
    }

    store.parties = parties;
    writeServerStore(store);
    res.json({ success: true, party: updatedParty, parties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert bill & auto-save party
app.post('/api/bills', (req, res) => {
  try {
    const bill = req.body;
    if (!bill || !bill.id) {
      return res.status(400).json({ error: 'Bill data is invalid' });
    }

    const store = readServerStore();
    const bills = store.bills || [];
    const existingIndex = bills.findIndex((b: any) => b.id === bill.id);

    const savedBill = {
      ...bill,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      bills[existingIndex] = savedBill;
    } else {
      bills.unshift(savedBill);
    }
    store.bills = bills;

    // Automatically add or update Party in parties dropdown
    if (bill.partyName && bill.partyName.trim()) {
      const parties = store.parties || [];
      const partyIndex = parties.findIndex(
        (p: any) => p.name.trim().toLowerCase() === bill.partyName.trim().toLowerCase()
      );

      const partyData = {
        id: partyIndex >= 0 ? parties[partyIndex].id : `party-${Date.now()}`,
        name: bill.partyName.trim(),
        siteAddress: bill.siteAddress || '',
        gstin: bill.partyGstin || '',
        updatedAt: new Date().toISOString(),
      };

      if (partyIndex >= 0) {
        parties[partyIndex] = { ...parties[partyIndex], ...partyData };
      } else {
        parties.unshift(partyData);
      }
      store.parties = parties;
    }

    writeServerStore(store);
    res.json({ success: true, bill: savedBill, bills: store.bills, parties: store.parties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete bill
app.delete('/api/bills/:id', (req, res) => {
  try {
    const { id } = req.params;
    const store = readServerStore();
    store.bills = (store.bills || []).filter((b: any) => b.id !== id);
    writeServerStore(store);
    res.json({ success: true, bills: store.bills });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete party
app.delete('/api/parties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const store = readServerStore();
    store.parties = (store.parties || []).filter((p: any) => p.id !== id);
    writeServerStore(store);
    res.json({ success: true, parties: store.parties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert company
app.post('/api/companies', (req, res) => {
  try {
    const company = req.body;
    if (!company || !company.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    const store = readServerStore();
    const companies = store.companies || [];
    const existingIndex = companies.findIndex((c: any) => c.id === company.id);

    const updated = {
      ...company,
      id: company.id || `company-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      companies[existingIndex] = { ...companies[existingIndex], ...updated };
    } else {
      companies.push(updated);
    }
    store.companies = companies;
    writeServerStore(store);
    res.json({ success: true, company: updated, companies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete company
app.delete('/api/companies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const store = readServerStore();
    store.companies = (store.companies || []).filter((c: any) => c.id !== id);
    writeServerStore(store);
    res.json({ success: true, companies: store.companies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shared server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Bill & Requirements Vision Extraction Endpoint
app.post('/api/extract-bill', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', textPrompt = '' } = req.body;

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server. Please check the Secrets panel.',
      });
    }

    const contents: any[] = [];

    // Multimodal image part if provided
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const extractionInstructions = `
You are an expert OCR & GST Invoice extraction engine for Indian businesses and contractors.
Carefully examine the uploaded image (bill, handwritten estimate, quotation, delivery challan, or requirement note) and extract all billing details.

Extract strictly according to this schema:
- invoiceNo: invoice number (string, e.g. "28" or "INV-101")
- date: formatted as YYYY-MM-DD or DD/MM/YYYY
- partyName: client / customer or buyer name (e.g. "SHREE SHDDHI CREATEURS")
- siteAddress: site address / project location if mentioned (e.g. "Site :-Sanvi Casa, Tarsali Ring road, vadodara")
- partyGstin: customer's GST number if visible
- items: array of line items with:
    - particulars: item description / specification (e.g. "Copper pipe with insulation")
    - hsnCode: HSN / SAC code (e.g. "7411", or "-" if not stated)
    - qty: quantity with unit (e.g. "46rft.", "80rft.", "2 pcs")
    - rate: unit rate as number
    - amount: line total as number
- cgstPercent: CGST tax percent (default 9 if standard Indian 18% GST split, else extract)
- sgstPercent: SGST tax percent (default 9 if standard Indian 18% GST split, else extract)
- notes: any special note or payment terms

Additional user hint or requirements: "${textPrompt || 'Extract bill lines exactly as seen.'}"
`;

    contents.push({ text: extractionInstructions });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: 'You extract structured Indian tax invoice data. Output strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoiceNo: { type: Type.STRING },
            date: { type: Type.STRING },
            partyName: { type: Type.STRING },
            siteAddress: { type: Type.STRING },
            partyGstin: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  particulars: { type: Type.STRING },
                  hsnCode: { type: Type.STRING },
                  qty: { type: Type.STRING },
                  rate: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER },
                },
                required: ['particulars', 'rate', 'amount'],
              },
            },
            cgstPercent: { type: Type.NUMBER },
            sgstPercent: { type: Type.NUMBER },
            notes: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text || '{}';
    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error in /api/extract-bill:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract bill data from image',
    });
  }
});

// Gujarati / Multilingual Speech-to-Annotation Endpoint
app.post('/api/interpret-voice-annotations', async (req, res) => {
  try {
    const { transcript, totalPages = 1 } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const prompt = `
You are a bilingual Gujarati, Hindi, and English assistant specialized in construction, electrical, AC installation, and site photo documentation.
The user spoke an instruction for adding text annotations to a multi-page photo document.
Transcript: "${transcript}"
Total pages in current document: ${totalPages}

User examples and intent:
- "page 1 par terrace text add kari de, 2 par Bari(window)"
  => Page 1 gets "Terrace Area", Page 2 gets "Bari (Window)"
- "1 ma bathroom piping note lakh, 2 ma ac outdoor unit"
  => Page 1 gets "Bathroom Piping Note", Page 2 gets "AC Outdoor Unit"
- "page 1 par dining area measurement 12x14"
  => Page 1 gets "Dining Area 12x14"

Return an array of annotations with:
- pageNumber: 1-based integer (1, 2, 3...)
- text: Clean, professional label in English or clear bilingual Gujarati-English format
- style: 'badge' | 'callout' | 'stamp' | 'tag'
- xPercent: suggested X position percentage (10 to 80)
- yPercent: suggested Y position percentage (15 to 85)
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            annotations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: { type: Type.INTEGER },
                  text: { type: Type.STRING },
                  style: { type: Type.STRING },
                  xPercent: { type: Type.NUMBER },
                  yPercent: { type: Type.NUMBER },
                },
                required: ['pageNumber', 'text'],
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"annotations": []}');
    return res.json({ success: true, annotations: parsed.annotations || [] });
  } catch (error: any) {
    console.error('Error in /api/interpret-voice-annotations:', error);
    return res.status(500).json({
      error: error.message || 'Failed to interpret voice annotations',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (dev: ${!isProd})`);
  });
}

startServer();
