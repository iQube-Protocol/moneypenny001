import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transaction {
  date: string;
  amount: number;
  category: string;
  description?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractTransactionsFromText(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Try to extract date (YYYY-MM-DD or MM/DD/YYYY), amount, description
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
    const amountMatch = line.match(/[-+]?\$?\s*([\d,]+\.\d{2})/);
    
    if (dateMatch && amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      transactions.push({
        date: dateMatch[1],
        amount: amount,
        category: 'general',
        description: line.substring(0, 100) // Store first 100 chars as description
      });
    }
  }
  
  return transactions;
}

function extractClosingBalance(text: string): number {
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('closing balance') || 
        line.toLowerCase().includes('ending balance') ||
        line.toLowerCase().includes('final balance')) {
      const balanceMatch = line.match(/\$?\s*([\d,]+\.\d{2})/);
      if (balanceMatch) {
        return parseFloat(balanceMatch[1].replace(/,/g, ''));
      }
    }
  }
  return 0;
}

function computeAggregates(transactions: Transaction[], closingBalance: number) {
  if (transactions.length === 0) {
    return {
      avg_daily_surplus: 0,
      surplus_volatility: 0,
      closing_balance: closingBalance,
      cash_buffer_days: 0,
      confidence_score: 0
    };
  }
  
  // Group by date and sum daily amounts
  const dailySums = new Map<string, number>();
  for (const tx of transactions) {
    const current = dailySums.get(tx.date) || 0;
    dailySums.set(tx.date, current + tx.amount);
  }
  
  const values = Array.from(dailySums.values());
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  // Calculate volatility (standard deviation)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const volatility = Math.sqrt(variance);
  
  const cashBufferDays = avg !== 0 ? closingBalance / Math.abs(avg) : 0;
  const confidence = Math.min(transactions.length / 30, 1.0); // More transactions = more confidence
  
  return {
    avg_daily_surplus: avg,
    surplus_volatility: volatility,
    closing_balance: closingBalance,
    cash_buffer_days: cashBufferDays,
    confidence_score: confidence
  };
}

function generateRecommendations(aggregates: ReturnType<typeof computeAggregates>) {
  const { avg_daily_surplus, surplus_volatility, closing_balance } = aggregates;
  
  // Calculate trading limits based on financial features
  const inventoryMin = clamp(avg_daily_surplus / 25, 50, 500);
  const inventoryMax = clamp(avg_daily_surplus * 2, 500, 5000);
  
  const maxNotional = clamp(
    0.35 * avg_daily_surplus,
    25,
    0.20 * closing_balance
  );
  
  const surplusVolBps = surplus_volatility > 0 
    ? (surplus_volatility / 0.01) * 10000 
    : 100;
  
  const dailyLossLimit = clamp(3 * surplusVolBps, 8, 40);
  
  return {
    inventory_min: Math.round(inventoryMin * 100) / 100,
    inventory_max: Math.round(inventoryMax * 100) / 100,
    min_edge_bps: 1.0,
    daily_loss_limit_bps: Math.round(dailyLossLimit * 10) / 10,
    max_notional_usd: Math.round(maxNotional * 100) / 100,
    reasoning: `Based on ${aggregates.confidence_score > 0.5 ? 'significant' : 'limited'} transaction history. ` +
               `Average daily flow: $${avg_daily_surplus.toFixed(2)}, ` +
               `Volatility: $${surplus_volatility.toFixed(2)}, ` +
               `Buffer: ${aggregates.cash_buffer_days.toFixed(1)} days`
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { file_paths, user_id } = await req.json();
    
    if (!file_paths || !Array.isArray(file_paths) || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: file_paths (array), user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allTransactions: Transaction[] = [];
    let latestClosingBalance = 0;
    const statementIds: string[] = [];
    
    // Process each file
    for (const filePath of file_paths) {
      console.log(`Processing file: ${filePath}`);
      
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('banking-documents')
        .download(filePath);
      
      if (downloadError) {
        console.error("Download error:", downloadError);
        continue;
      }
      
      let extractedText = '';
      
      // Check if it's a PDF (try to parse with Lovable AI)
      if (filePath.toLowerCase().endsWith('.pdf') && lovableApiKey) {
        console.log("Parsing PDF with Lovable AI...");
        
        try {
          // Convert blob to base64
          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          // Call Lovable AI to extract text from PDF
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: 'You are a bank statement parser. Extract all transaction data in a structured format. For each transaction, provide: date (YYYY-MM-DD), amount (as decimal number), description. Also identify the closing/ending balance. Format as: Date | Amount | Description on each line.'
                },
                {
                  role: 'user',
                  content: `Parse this bank statement PDF and extract all transactions and the closing balance. Return in format: Date | Amount | Description`
                }
              ],
              // Note: Gemini doesn't support direct file upload in this format, so we'll use text extraction
            }),
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            extractedText = aiData.choices[0].message.content;
            console.log("AI extracted text length:", extractedText.length);
          } else {
            console.error("AI parsing failed, falling back to text extraction");
            extractedText = await fileData.text();
          }
        } catch (aiError) {
          console.error("AI parsing error:", aiError);
          extractedText = await fileData.text();
        }
      } else {
        // Plain text file
        extractedText = await fileData.text();
      }
      
      // Extract transactions and balance
      const transactions = extractTransactionsFromText(extractedText);
      const closingBalance = extractClosingBalance(extractedText);
      
      if (closingBalance > 0) {
        latestClosingBalance = closingBalance;
      }
      
      // Determine period from transactions
      const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
      const periodStart = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const periodEnd = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
      
      // Store statement record
      const { data: statementData, error: statementError } = await supabase
        .from('bank_statements')
        .insert({
          user_id,
          file_name: filePath.split('/').pop(),
          file_path: filePath,
          period_start: periodStart?.toISOString().split('T')[0],
          period_end: periodEnd?.toISOString().split('T')[0],
          closing_balance: closingBalance,
        })
        .select()
        .single();
      
      if (statementError) {
        console.error("Error storing statement:", statementError);
        continue;
      }
      
      const statementId = statementData.id;
      statementIds.push(statementId);
      
      // Store transactions
      if (transactions.length > 0) {
        const transactionRecords = transactions.map(tx => ({
          statement_id: statementId,
          user_id,
          transaction_date: tx.date,
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
        }));
        
        const { error: txError } = await supabase
          .from('transactions')
          .insert(transactionRecords);
        
        if (txError) {
          console.error("Error storing transactions:", txError);
        } else {
          allTransactions.push(...transactions);
        }
      }
    }
    
    if (allTransactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid transactions could be parsed from the provided files" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Compute aggregates
    const aggregates = computeAggregates(allTransactions, latestClosingBalance);
    
    // Store aggregates
    const { error: aggError } = await supabase
      .from('financial_aggregates')
      .upsert({
        user_id,
        avg_daily_surplus: aggregates.avg_daily_surplus,
        surplus_volatility: aggregates.surplus_volatility,
        closing_balance: aggregates.closing_balance,
        cash_buffer_days: aggregates.cash_buffer_days,
        confidence_score: aggregates.confidence_score,
        updated_at: new Date().toISOString(),
      });
    
    if (aggError) {
      console.error("Error storing aggregates:", aggError);
    }
    
    // Generate recommendations
    const recommendations = generateRecommendations(aggregates);
    
    // Store recommendations
    const { error: recError } = await supabase
      .from('trading_recommendations')
      .upsert({
        user_id,
        inventory_min: recommendations.inventory_min,
        inventory_max: recommendations.inventory_max,
        min_edge_bps: recommendations.min_edge_bps,
        daily_loss_limit_bps: recommendations.daily_loss_limit_bps,
        max_notional_usd: recommendations.max_notional_usd,
        reasoning: recommendations.reasoning,
        updated_at: new Date().toISOString(),
      });
    
    if (recError) {
      console.error("Error storing recommendations:", recError);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        statements_processed: file_paths.length,
        transactions_extracted: allTransactions.length,
        aggregates,
        recommendations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Banking document parser error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
