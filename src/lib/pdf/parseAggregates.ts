interface ParsedAggregates {
  closing_balance: number;
  period_start: string | null;
  period_end: string | null;
  transaction_count: number;
  estimated_daily_surplus: number;
  estimated_volatility: number;
}

export function parseAggregates(text: string): ParsedAggregates {
  // Find closing balance
  const balancePatterns = [
    /(?:closing|ending|final)\s+balance[:\s]+\$?\s*([\d,]+\.?\d*)/i,
    /balance[:\s]+\$?\s*([\d,]+\.?\d*)/i,
    /\$\s*([\d,]+\.?\d*)\s+(?:closing|ending)/i,
  ];
  
  let closing_balance = 0;
  for (const pattern of balancePatterns) {
    const match = text.match(pattern);
    if (match) {
      closing_balance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Find date range
  const datePatterns = [
    /(?:statement\s+period|period)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|through|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  
  let period_start: string | null = null;
  let period_end: string | null = null;
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      period_start = match[1];
      period_end = match[2];
      break;
    }
  }
  
  // Estimate transaction count (rough)
  const transactionMarkers = text.match(/\$\s*[\d,]+\.?\d{0,2}/g) || [];
  const transaction_count = Math.max(1, Math.floor(transactionMarkers.length / 3)); // Rough estimate
  
  // Estimate daily surplus and volatility from balance
  // Conservative estimates based on typical patterns
  const estimated_daily_surplus = closing_balance > 0 ? closing_balance / 30 : 100;
  const estimated_volatility = estimated_daily_surplus * 0.35; // 35% of surplus
  
  return {
    closing_balance,
    period_start,
    period_end,
    transaction_count,
    estimated_daily_surplus,
    estimated_volatility,
  };
}
