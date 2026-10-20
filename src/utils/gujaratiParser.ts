export interface ParsedVoiceAction {
  pageNumber: number; // 1-indexed
  pageIndex: number;  // 0-indexed
  text: string;
  style: 'badge' | 'callout' | 'stamp' | 'tag';
  xPercent: number;
  yPercent: number;
  originalClause: string;
}

// Map Gujarati word numbers to integers
const GUJARATI_NUMBERS: Record<string, number> = {
  'એક': 1, 'ek': 1, '1': 1, 'one': 1, 'first': 1,
  'બે': 2, 'be': 2, '2': 2, 'two': 2, 'second': 2,
  'ત્રણ': 3, 'tran': 3, '3': 3, 'three': 3, 'third': 3,
  'ચાર': 4, 'char': 4, '4': 4, 'four': 4,
  'પાંચ': 5, 'panch': 5, '5': 5, 'five': 5,
  'છ': 6, 'chha': 6, '6': 6, 'six': 6,
  'સાત': 7, 'saat': 7, '7': 7, 'seven': 7,
  'આઠ': 8, 'aath': 8, '8': 8, 'eight': 8,
  'નવ': 9, 'nav': 9, '9': 9, 'nine': 9,
  'દસ': 10, 'das': 10, '10': 10, 'ten': 10,
};

// Common architectural and site terms transliteration / enhancement
const VOCABULARY_ENHANCER: Record<string, string> = {
  'bari': 'Bari (Window)',
  'baari': 'Bari (Window)',
  'બારી': 'Bari (Window)',
  'window': 'Window',
  'terrace': 'Terrace Area',
  'ટેરેસ': 'Terrace Area',
  'dhabu': 'Terrace / Roof Slab',
  'ધાબું': 'Terrace / Roof Slab',
  'darwajo': 'Door / Entrance',
  'દરવાજો': 'Door / Entrance',
  'rasodu': 'Kitchen Area',
  'રસોડું': 'Kitchen Area',
  'kitchen': 'Kitchen Area',
  'bathroom': 'Bathroom / Washroom',
  'બાથરૂમ': 'Bathroom / Washroom',
  'bedroom': 'Bedroom Area',
  'બેડરૂમ': 'Bedroom Area',
  'hall': 'Living Room / Hall',
  'wiring': 'Electrical Wiring',
  'વાઇરિંગ': 'Electrical Wiring',
  'piping': 'Drainpipe / Piping',
  'પાઈપ': 'Drainpipe / Piping',
  'balcony': 'Balcony Area',
  'ગેલેરી': 'Balcony Area',
};

/**
 * Splits text into clauses based on conjunctions and punctuation
 */
function splitClauses(input: string): string[] {
  // Replace Gujarati conjunctions and commas
  const normalized = input
    .replace(/(\r\n|\n|\r)/gm, ', ')
    .replace(/(ane|અને|tatha|તથા|plus|\+)/gi, ', ')
    .replace(/;\s*/g, ', ');

  return normalized
    .split(/[,.]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Parses user voice transcription (in Gujarati, Hinglish, or English)
 * Examples:
 * - "page 1 par terrace text add kari de, 2 par Bari(window)"
 * - "Page 1: living room 12x14, 2 par kitchen slab"
 */
export function parseVoiceAnnotationCommands(transcript: string): ParsedVoiceAction[] {
  if (!transcript || !transcript.trim()) return [];

  const clauses = splitClauses(transcript);
  const actions: ParsedVoiceAction[] = [];
  let currentPage = 1;

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    if (!clause) continue;

    // Detect page number
    // Patterns: "page 1", "page 2 par", "2 par", "પેજ ૧", "1 ma", "page 2:"
    const pageMatch = clause.match(
      /(?:page|પેજ|panu|પાનું)?\s*([0-9]+|એક|બે|ત્રણ|ચાર|પાંચ|છ|સાત|આઠ|નવ|દસ|ek|be|tran|char|panch)\s*(?:par|પર|ma|માં|number|નંબર|:)?/i
    );

    let pageNum = currentPage;
    if (pageMatch && pageMatch[1]) {
      const token = pageMatch[1].toLowerCase();
      if (GUJARATI_NUMBERS[token]) {
        pageNum = GUJARATI_NUMBERS[token];
        currentPage = pageNum;
      } else if (!isNaN(parseInt(token, 10))) {
        pageNum = parseInt(token, 10);
        currentPage = pageNum;
      }
    }

    // Clean out command filler words
    // e.g. "page 1 par", "text add kari de", "add kari de", "lakh", "lagavo", "muki de"
    let cleanText = clause
      .replace(/(?:page|પેજ|panu|પાનું)\s*([0-9]+|એક|બે|ત્રણ|ચાર|પાંચ|ek|be|tran|char|panch)\s*(?:par|પર|ma|માં|:)?/gi, '')
      .replace(/^([0-9]+)\s*(?:par|પર|ma|માં|:)\s*/gi, '')
      .replace(/(text\s+add\s+kari\s+de|add\s+kari\s+de|add\s+karo|lakh\s+de|lakh|muki\s+de|muko|lakhvu|લખી\s+દો|લખો|ઉમેરો)/gi, '')
      .replace(/(par\s+text|par|પર|ma|માં)/gi, ' ')
      .trim();

    // If cleanText is empty, fall back to the clause
    if (!cleanText) {
      cleanText = clause;
    }

    // Check vocabulary enhancements
    const lowerClean = cleanText.toLowerCase().trim();
    if (VOCABULARY_ENHANCER[lowerClean]) {
      cleanText = VOCABULARY_ENHANCER[lowerClean];
    } else {
      // Check partial matches
      for (const [key, replacement] of Object.entries(VOCABULARY_ENHANCER)) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(cleanText)) {
          cleanText = cleanText.replace(regex, replacement);
          break;
        }
      }
    }

    // Capitalize first letter
    cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);

    // Determine style: 'badge' (standard), 'stamp' if says stamp, 'callout' if note
    let style: 'badge' | 'callout' | 'stamp' | 'tag' = 'badge';
    if (/stamp|સ્ટેમ્પ/i.test(clause)) {
      style = 'stamp';
    } else if (/note|નોંધ|measurement|માપ/i.test(clause)) {
      style = 'callout';
    }

    // Position staggered based on how many annotations exist on this page
    const existingOnPage = actions.filter((a) => a.pageNumber === pageNum).length;
    const yPercent = 20 + (existingOnPage * 18);
    const xPercent = 25 + ((existingOnPage % 2) * 20);

    actions.push({
      pageNumber: pageNum,
      pageIndex: Math.max(0, pageNum - 1),
      text: cleanText,
      style,
      xPercent: Math.min(80, xPercent),
      yPercent: Math.min(80, yPercent),
      originalClause: clause,
    });
  }

  return actions;
}
