import { createWorker } from 'tesseract.js';

export interface ReceiptOCRResult {
  amount: string | null;
  vendor: string | null;
  date: string | null;
  rawText: string;
  confidence: number;
}

export async function extractReceiptData(imageUrl: string): Promise<ReceiptOCRResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

  try {
    worker = await createWorker('eng');
    
    const { data } = await worker.recognize(imageUrl);
    const rawText = data.text;
    const tesseractConfidence = data.confidence;

    const amount = extractAmount(rawText);
    const vendor = extractVendor(rawText);
    const date = extractDate(rawText);

    const fieldsExtracted = [amount, vendor, date].filter(Boolean).length;
    const fieldConfidence = (fieldsExtracted / 3) * 100;
    const combinedConfidence = Math.round((tesseractConfidence * 0.6) + (fieldConfidence * 0.4));

    return {
      amount,
      vendor,
      date,
      rawText,
      confidence: combinedConfidence,
    };
  } catch (error) {
    console.error('[OCR] Failed to process receipt image:', error);
    
    return {
      amount: null,
      vendor: null,
      date: null,
      rawText: '',
      confidence: 0,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

function extractAmount(text: string): string | null {
  const lines = text.split('\n');
  
  const amountKeywords = ['TOTAL', 'AMOUNT', 'SUBTOTAL', 'BALANCE', 'DUE', 'PAYMENT'];
  
  for (const line of lines) {
    const upperLine = line.trim().toUpperCase();
    
    for (const keyword of amountKeywords) {
      if (upperLine.includes(keyword)) {
        const amountMatch = line.match(/\$?\s*(\d{1,6}[,.]?\d{0,3}\.?\d{2})/);
        if (amountMatch) {
          const rawAmount = amountMatch[1].replace(/[,\s]/g, '');
          if (parseFloat(rawAmount) > 0 && parseFloat(rawAmount) < 999999) {
            return rawAmount;
          }
        }
      }
    }
  }
  
  const currencyPatterns = [
    /\$\s*(\d{1,6}[,.]?\d{0,3}\.\d{2})/g,
    /(\d{1,6}\.\d{2})\s*USD/gi,
    /TOTAL[:\s]+\$?\s*(\d{1,6}[,.]?\d{0,3}\.\d{2})/gi,
  ];
  
  for (const pattern of currencyPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const amount = lastMatch[1].replace(/[,\s]/g, '');
      if (parseFloat(amount) > 0 && parseFloat(amount) < 999999) {
        return amount;
      }
    }
  }
  
  return null;
}

function extractVendor(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) return null;
  
  const topLines = lines.slice(0, 5);
  
  for (const line of topLines) {
    if (line.match(/^\d/) || line.match(/\d{3,}/) || line.toLowerCase().includes('receipt')) {
      continue;
    }
    
    const words = line.split(/\s+/).filter(w => w.length > 1);
    
    const capitalizedWords = words.filter(word => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      if (cleanWord.length < 2) return false;
      
      const isAllCaps = cleanWord === cleanWord.toUpperCase() && cleanWord.length >= 2;
      const isCapitalized = cleanWord[0] === cleanWord[0].toUpperCase();
      
      return isAllCaps || isCapitalized;
    });
    
    if (capitalizedWords.length >= 1 && capitalizedWords.length <= 4) {
      const vendor = capitalizedWords.slice(0, 3).join(' ');
      if (vendor.length >= 3 && vendor.length <= 50) {
        return vendor;
      }
    }
  }
  
  return null;
}

function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[1].trim();
      
      if (dateStr.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/)) {
        const parts = dateStr.split(/[-/]/);
        const year = parseInt(parts[2]);
        const fullYear = year < 100 ? (year >= 70 ? 1900 + year : 2000 + year) : year;
        dateStr = `${parts[0]}/${parts[1]}/${fullYear}`;
      }
      
      return dateStr;
    }
  }
  
  return null;
}
