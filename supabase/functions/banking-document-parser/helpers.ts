// Helper functions for banking document parser

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type?: string;
  category?: string;
}

interface StructuredBankData {
  statement_period: { start: string; end: string };
  opening_balance: number;
  closing_balance: number;
  transactions: Transaction[];
}

export async function extractStructuredData(text: string, apiKey: string): Promise<StructuredBankData | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a banking document parser. Extract structured transaction data from bank statements.",
          },
          {
            role: "user",
            content: `Extract all transactions from this bank statement text. Return the data in the specified format.\n\nStatement text:\n${text.slice(0, 10000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_bank_data",
              description: "Extract structured banking data from statement text",
              parameters: {
                type: "object",
                properties: {
                  statement_period: {
                    type: "object",
                    properties: {
                      start: { type: "string", description: "Statement start date in YYYY-MM-DD format" },
                      end: { type: "string", description: "Statement end date in YYYY-MM-DD format" },
                    },
                  },
                  opening_balance: { type: "number", description: "Opening balance amount" },
                  closing_balance: { type: "number", description: "Closing balance amount" },
                  transactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "Transaction date in YYYY-MM-DD format" },
                        description: { type: "string", description: "Transaction description" },
                        amount: { type: "number", description: "Transaction amount (negative for debits, positive for credits)" },
                        type: { type: "string", enum: ["debit", "credit", "fee", "transfer"] },
                        category: { type: "string", description: "Transaction category" },
                      },
                      required: ["date", "description", "amount"],
                    },
                  },
                },
                required: ["closing_balance", "transactions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_bank_data" } },
      }),
    });

    if (!response.ok) {
      console.error("AI extraction failed:", response.status, await response.text());
      return fallbackExtraction(text);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function.name === "extract_bank_data") {
      const extracted = JSON.parse(toolCall.function.arguments);
      console.log("Structured extraction successful:", extracted.transactions.length, "transactions");
      return extracted;
    }

    return fallbackExtraction(text);
  } catch (error) {
    console.error("Error in structured extraction:", error);
    return fallbackExtraction(text);
  }
}

function fallbackExtraction(text: string): StructuredBankData | null {
  console.log("Using fallback regex extraction");
  
  const transactions: Transaction[] = [];
  const lines = text.split("\n");
  
  const datePatterns = [
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(\w{3}\s+\d{1,2},?\s+\d{4})/i,
  ];

  const amountPatterns = [
    /[-+]?\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    /\((\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\)/,
  ];

  for (const line of lines) {
    let date = null;
    let amount = null;

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = normalizeDate(match[1]);
        break;
      }
    }

    if (!date) continue;

    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, "");
        amount = parseFloat(amountStr);
        if (match[0].includes("(") || line.toLowerCase().includes("debit")) {
          amount = -Math.abs(amount);
        }
        break;
      }
    }

    if (date && amount !== null) {
      const description = line.replace(/\d+/g, "").replace(/[$,()]/g, "").trim();
      transactions.push({ date, description, amount });
    }
  }

  const closingBalanceMatch = text.match(/closing\s+balance[:\s]+\$?\s*([\d,]+\.?\d*)/i);
  const closingBalance = closingBalanceMatch
    ? parseFloat(closingBalanceMatch[1].replace(/,/g, ""))
    : transactions.reduce((sum, t) => sum + t.amount, 0);

  console.log("Fallback extraction found:", transactions.length, "transactions");

  return {
    statement_period: { start: "", end: "" },
    opening_balance: 0,
    closing_balance: closingBalance,
    transactions,
  };
}

function normalizeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
    return date.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export function categorizeTransaction(description: string, amount: number): string {
  const desc = description.toLowerCase();
  
  if (amount > 0) {
    if (desc.includes("salary") || desc.includes("payroll") || desc.includes("income")) return "income";
    if (desc.includes("refund") || desc.includes("credit")) return "refund";
    return "deposit";
  }
  
  if (desc.includes("grocery") || desc.includes("supermarket") || desc.includes("food")) return "groceries";
  if (desc.includes("restaurant") || desc.includes("cafe") || desc.includes("dining")) return "dining";
  if (desc.includes("gas") || desc.includes("fuel") || desc.includes("petrol")) return "transport";
  if (desc.includes("amazon") || desc.includes("shop") || desc.includes("store")) return "shopping";
  if (desc.includes("rent") || desc.includes("mortgage")) return "housing";
  if (desc.includes("utility") || desc.includes("electric") || desc.includes("water") || desc.includes("internet")) return "utilities";
  if (desc.includes("insurance")) return "insurance";
  if (desc.includes("medical") || desc.includes("health") || desc.includes("pharmacy")) return "healthcare";
  if (desc.includes("transfer")) return "transfer";
  if (desc.includes("fee") || desc.includes("charge")) return "fees";
  
  return "general";
}