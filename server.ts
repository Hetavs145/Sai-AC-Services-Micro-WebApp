import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser with 50MB limit for high-res photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
