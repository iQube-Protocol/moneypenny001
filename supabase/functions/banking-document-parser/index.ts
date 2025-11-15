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
}

interface Statement {
  transactions: Transaction[];
  closingBalance: number;
  periodStart: string;
  periodEnd: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseBankStatement(text: string): Statement {
  // Simple CSV/text parser for bank statements
  // Looks for patterns like: date, description, amount
  const lines = text.split('\n');
  const transactions: Transaction[] = [];
  let closingBalance = 0;
  
  for (const line of lines) {
    // Try to extract date (YYYY-MM-DD or MM/DD/YYYY), amount, description
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
    const amountMatch = line.match(/[-+]?\$?\s*([\d,]+\.\d{2})/);
    
    if (dateMatch && amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      transactions.push({
        date: dateMatch[1],
        amount: amount,
        category: 'general'
      });
    }
    
    // Look for closing balance
    if (line.toLowerCase().includes('closing balance') || line.toLowerCase().includes('ending balance')) {
      const balanceMatch = line.match(/\$?\s*([\d,]+\.\d{2})/);
      if (balanceMatch) {
        closingBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));
      }
    }
  }
  
  return {
    transactions,
    closingBalance,
    periodStart: transactions[0]?.date || '',
    periodEnd: transactions[transactions.length - 1]?.date || ''
  };
}

function extractFeatures(statement: Statement) {
  const { transactions, closingBalance } = statement;
  
  if (transactions.length === 0) {
    return {
      avg_daily_surplus: 0,
      surplus_volatility: 0,
      closing_balance: closingBalance,
      cash_buffer_days: 0
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
  
  return {
    avg_daily_surplus: avg,
    surplus_volatility: volatility,
    closing_balance: closingBalance,
    cash_buffer_days: cashBufferDays
  };
}

function generateRecommendations(features: ReturnType<typeof extractFeatures>) {
  const { avg_daily_surplus, surplus_volatility, closing_balance } = features;
  
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
  
  const inventoryBand = clamp(avg_daily_surplus / 25, 0.5, 3.0);
  
  return {
    inventory_band: {
      min: Math.round(inventoryMin * 100) / 100,
      max: Math.round(inventoryMax * 100) / 100
    },
    min_edge_bps_baseline: 1.0,
    daily_loss_limit_bps: Math.round(dailyLossLimit * 10) / 10,
    max_notional_usd_day: Math.round(maxNotional * 100) / 100
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { bucket_id, file_ids, user_id } = await req.json();
    
    if (!bucket_id || !file_ids || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: bucket_id, file_ids, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statements: Statement[] = [];
    
    // Download and parse each file
    for (const fileId of file_ids) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket_id)
        .download(fileId);
      
      if (downloadError) {
        console.error("Download error:", downloadError);
        continue;
      }
      
      const text = await fileData.text();
      const statement = parseBankStatement(text);
      statements.push(statement);
    }
    
    if (statements.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid statements could be parsed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Aggregate features across all statements
    const allTransactions = statements.flatMap(s => s.transactions);
    const latestClosingBalance = statements[statements.length - 1].closingBalance;
    
    const aggregatedStatement: Statement = {
      transactions: allTransactions,
      closingBalance: latestClosingBalance,
      periodStart: statements[0].periodStart,
      periodEnd: statements[statements.length - 1].periodEnd
    };
    
    const features = extractFeatures(aggregatedStatement);
    const recommendations = generateRecommendations(features);
    
    // Store in cache_store table
    const cacheKey = `banking_aggregates:${user_id}`;
    const aggregateData = {
      surplus_mean_daily: features.avg_daily_surplus,
      surplus_vol_daily: features.surplus_volatility,
      closing_balance_last: features.closing_balance,
      cash_buffer_days: features.cash_buffer_days,
      proposed_overrides: recommendations
    };
    
    const { error: cacheError } = await supabase
      .from("cache_store")
      .upsert({
        key: cacheKey,
        value: JSON.stringify(aggregateData),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      });
    
    if (cacheError) {
      console.error("Cache store error:", cacheError);
      throw cacheError;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        features,
        recommendations,
        statements_processed: statements.length
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
