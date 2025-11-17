import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedText {
  file_path: string;
  text: string;
  name: string;
}

interface ParsedAggregates {
  closing_balance: number;
  period_start: string | null;
  period_end: string | null;
  transaction_count: number;
  estimated_daily_surplus: number;
  estimated_volatility: number;
}

function parseAggregatesFromText(text: string): ParsedAggregates {
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
  
  // Estimate transaction count
  const transactionMarkers = text.match(/\$\s*[\d,]+\.?\d{0,2}/g) || [];
  const transaction_count = Math.max(1, Math.floor(transactionMarkers.length / 3));
  
  // Estimate daily surplus and volatility from balance
  const estimated_daily_surplus = closing_balance > 0 ? closing_balance / 30 : 100;
  const estimated_volatility = estimated_daily_surplus * 0.35;
  
  return {
    closing_balance,
    period_start,
    period_end,
    transaction_count,
    estimated_daily_surplus,
    estimated_volatility,
  };
}

function computeAggregates(balance: number, estimatedDailySurplus: number, estimatedVolatility: number) {
  return {
    avg_daily_surplus: estimatedDailySurplus,
    surplus_volatility: estimatedVolatility,
    closing_balance: balance,
    cash_buffer_days: balance / Math.abs(estimatedDailySurplus),
    confidence_score: 75,
  };
}

function generateRecommendations(agg: any) {
  function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
  }
  
  // Max Notional: 35% of daily surplus, capped at 20% of balance
  const max_notional_usd = clamp(
    0.35 * agg.avg_daily_surplus,
    25,
    0.20 * agg.closing_balance
  );
  
  // Daily Loss Limit: 3x volatility in bps (8-40 range)
  const vol_bps = (agg.surplus_volatility / 0.01) * 10000;
  const daily_loss_limit_bps = clamp(3 * vol_bps, 8, 40);
  
  // Inventory Band: $25 per unit (0.5-3.0 range)
  const inventory_band = clamp(agg.avg_daily_surplus / 25, 0.5, 3.0);
  
  return {
    inventory_min: 0,
    inventory_max: Math.round(inventory_band * 1000 * 100) / 100,
    min_edge_bps: 1.0,
    max_notional_usd: Math.round(max_notional_usd * 100) / 100,
    daily_loss_limit_bps: Math.round(daily_loss_limit_bps * 10) / 10,
    reasoning: `Based on daily surplus of $${agg.avg_daily_surplus.toFixed(2)} and volatility of $${agg.surplus_volatility.toFixed(2)}. Max notional limited to 35% of daily surplus or 20% of balance.`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_paths, user_id, extracted_texts } = await req.json();

    if (!extracted_texts || extracted_texts.length === 0) {
      throw new Error("No extracted texts provided");
    }

    console.log(`📄 Processing ${extracted_texts.length} documents for user: ${user_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process each document
    const allAggregates: any[] = [];
    let totalTransactions = 0;

    for (const extracted of extracted_texts as ExtractedText[]) {
      console.log(`📑 Processing: ${extracted.name}`);
      
      const parsed = parseAggregatesFromText(extracted.text);
      
      console.log(`💰 Balance: $${parsed.closing_balance}, Estimated transactions: ${parsed.transaction_count}`);
      
      totalTransactions += parsed.transaction_count;
      
      const agg = computeAggregates(
        parsed.closing_balance,
        parsed.estimated_daily_surplus,
        parsed.estimated_volatility
      );
      
      allAggregates.push(agg);
      
      // Save bank statement metadata
      const { error: stmtError } = await supabase.from("bank_statements").insert({
        user_id,
        file_name: extracted.name,
        file_path: extracted.file_path,
        closing_balance: parsed.closing_balance,
        period_start: parsed.period_start,
        period_end: parsed.period_end,
        parsed_at: new Date().toISOString(),
      });

      if (stmtError) {
        console.error(`⚠️ Failed to save statement metadata for ${extracted.name}:`, stmtError);
      }
    }

    console.log(`📊 Total: ${totalTransactions} estimated transactions`);

    if (totalTransactions === 0) {
      console.log("⚠️ No transactions found, skipping aggregates");
      return new Response(
        JSON.stringify({ 
          error: "No transactions extracted",
          statements_processed: extracted_texts.length 
        }),
        { 
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Merge aggregates (simple average for multi-month)
    const merged = {
      avg_daily_surplus: allAggregates.reduce((sum, a) => sum + a.avg_daily_surplus, 0) / allAggregates.length,
      surplus_volatility: allAggregates.reduce((sum, a) => sum + a.surplus_volatility, 0) / allAggregates.length,
      closing_balance: allAggregates[allAggregates.length - 1].closing_balance,
      cash_buffer_days: allAggregates.reduce((sum, a) => sum + a.cash_buffer_days, 0) / allAggregates.length,
      confidence_score: 75,
    };

    console.log(`📈 Aggregates: ${JSON.stringify(merged, null, 2)}`);

    // Generate recommendations
    const recommendations = generateRecommendations(merged);
    console.log(`💡 Recommendations: ${JSON.stringify(recommendations, null, 2)}`);

    // Upsert aggregates
    const { data: aggData, error: aggError } = await supabase
      .from("financial_aggregates")
      .upsert({
        user_id,
        avg_daily_surplus: merged.avg_daily_surplus,
        surplus_volatility: merged.surplus_volatility,
        closing_balance: merged.closing_balance,
        cash_buffer_days: merged.cash_buffer_days,
        confidence_score: merged.confidence_score,
        top_categories: [],
        computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (aggError) {
      console.error("❌ Failed to upsert aggregates:", aggError);
      throw new Error(`Aggregate upsert failed: ${aggError.message}`);
    }
    console.log("✅ Aggregates saved successfully");

    // Upsert recommendations
    const { data: recData, error: recError } = await supabase
      .from("trading_recommendations")
      .upsert({
        user_id,
        inventory_min: recommendations.inventory_min,
        inventory_max: recommendations.inventory_max,
        min_edge_bps: recommendations.min_edge_bps,
        max_notional_usd: recommendations.max_notional_usd,
        daily_loss_limit_bps: recommendations.daily_loss_limit_bps,
        reasoning: recommendations.reasoning,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (recError) {
      console.error("❌ Failed to upsert recommendations:", recError);
      throw new Error(`Recommendation upsert failed: ${recError.message}`);
    }
    console.log("✅ Recommendations saved successfully");

    // Insert into history
    const { error: histError } = await supabase.from("recommendation_history").insert({
      user_id,
      recommendation_id: recData?.id,
      inventory_min: recommendations.inventory_min,
      inventory_max: recommendations.inventory_max,
      min_edge_bps: recommendations.min_edge_bps,
      max_notional_usd: recommendations.max_notional_usd,
      daily_loss_limit_bps: recommendations.daily_loss_limit_bps,
      reasoning: recommendations.reasoning,
      confidence_score: merged.confidence_score,
    });

    if (histError) {
      console.error("⚠️ Failed to save recommendation history:", histError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        statements_processed: extracted_texts.length,
        features: merged,
        recommendations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Parser error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
