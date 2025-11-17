import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_paths, user_id } = await req.json();
    console.log("📄 Processing", file_paths.length, "documents for user:", user_id);

    if (!file_paths || !Array.isArray(file_paths)) {
      return new Response(JSON.stringify({ error: "file_paths required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalTransactions = 0;
    let totalBalance = 0;
    const allTransactions: any[] = [];

    for (const path of file_paths) {
      console.log("📑 Processing:", path);
      
      const { data: file, error } = await supabase.storage
        .from("banking-documents")
        .download(path);
        
      if (error) {
        console.error("❌ Download error:", error);
        continue;
      }

      // Convert PDF to base64 for AI vision
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      console.log("🤖 Extracting with Lovable AI...");
      
      // Use Lovable AI vision to read the PDF and extract transactions
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL transactions from this bank statement PDF. For each transaction provide: date (YYYY-MM-DD), description, and amount (negative for expenses/debits, positive for income/credits). Also find the closing balance and statement period dates."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "extract_transactions",
              description: "Extract all transactions and metadata from bank statement",
              parameters: {
                type: "object",
                properties: {
                  transactions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "YYYY-MM-DD format" },
                        description: { type: "string" },
                        amount: { type: "number" }
                      },
                      required: ["date", "description", "amount"]
                    }
                  },
                  closing_balance: { type: "number" },
                  period_start: { type: "string" },
                  period_end: { type: "string" }
                },
                required: ["transactions", "closing_balance"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "extract_transactions" } }
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("❌ AI failed:", aiResponse.status, errorText);
        continue;
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) {
        console.error("❌ No tool call in response");
        continue;
      }

      const extracted = JSON.parse(toolCall.function.arguments);
      console.log("✅ Extracted", extracted.transactions?.length || 0, "transactions");

      // Save bank statement
      const { data: stmt, error: stmtError } = await supabase
        .from("bank_statements")
        .insert({
          user_id,
          file_name: path.split("/").pop() || "unknown",
          file_path: path,
          closing_balance: extracted.closing_balance || 0,
          period_start: extracted.period_start || null,
          period_end: extracted.period_end || null,
          parsed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (stmtError) {
        console.error("❌ Statement insert failed:", stmtError);
        continue;
      }

      // Save transactions
      if (extracted.transactions && extracted.transactions.length > 0) {
        const txsToInsert = extracted.transactions.map((t: any) => ({
          user_id,
          statement_id: stmt.id,
          transaction_date: t.date,
          description: t.description || "Unknown",
          amount: t.amount,
          category: categorize(t.description || "", t.amount)
        }));

        const { error: txError } = await supabase.from("transactions").insert(txsToInsert);

        if (txError) {
          console.error("❌ Transaction insert failed:", txError);
        } else {
          console.log("💾 Saved", txsToInsert.length, "transactions");
          totalTransactions += extracted.transactions.length;
          allTransactions.push(...extracted.transactions);
        }
      }

      totalBalance = extracted.closing_balance || 0;
    }

    console.log("📊 Total:", totalTransactions, "transactions extracted");

    // Compute aggregates
    const agg = computeAgg(allTransactions, totalBalance);
    console.log("📈 Aggregates:", agg);

    // Save aggregates
    await supabase.from("financial_aggregates").upsert({
      user_id,
      ...agg,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    // Generate recommendations
    const recs = generateRecs(agg);
    console.log("💡 Recommendations:", recs);

    const { data: recData } = await supabase.from("trading_recommendations").upsert({
      user_id,
      ...recs,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" }).select().single();

    // Track history
    if (recData) {
      await supabase.from("recommendation_history").insert({
        user_id,
        recommendation_id: recData.id,
        ...recs,
        confidence_score: agg.confidence_score
      });
    }

    return new Response(JSON.stringify({
      success: true,
      statements_processed: file_paths.length,
      transactions_extracted: totalTransactions,
      financial_features: agg,
      recommendations: recs
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("💥 Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function categorize(desc: string, amount: number): string {
  const d = desc.toLowerCase();
  if (amount > 0) {
    if (d.includes("salary") || d.includes("payroll")) return "income";
    if (d.includes("refund")) return "refund";
    return "deposit";
  }
  if (d.includes("grocery") || d.includes("supermarket")) return "groceries";
  if (d.includes("restaurant") || d.includes("cafe")) return "dining";
  if (d.includes("gas") || d.includes("fuel")) return "transport";
  if (d.includes("amazon") || d.includes("shop")) return "shopping";
  if (d.includes("rent") || d.includes("mortgage")) return "housing";
  if (d.includes("utility") || d.includes("electric")) return "utilities";
  return "general";
}

function computeAgg(txs: any[], balance: number) {
  if (txs.length === 0) {
    return {
      closing_balance: balance,
      avg_daily_surplus: 0,
      surplus_volatility: 0,
      cash_buffer_days: 0,
      top_categories: [],
      confidence_score: 0
    };
  }

  const dailyMap = new Map<string, number>();
  txs.forEach(t => {
    dailyMap.set(t.date, (dailyMap.get(t.date) || 0) + t.amount);
  });

  const daily = Array.from(dailyMap.values());
  const avgSurplus = daily.reduce((a, b) => a + b, 0) / daily.length;
  const variance = daily.reduce((s, v) => s + Math.pow(v - avgSurplus, 2), 0) / daily.length;
  const volatility = Math.sqrt(variance);

  const avgSpending = Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0) / daily.length);
  const bufferDays = avgSpending > 0 ? balance / avgSpending : 0;

  const catMap = new Map<string, number>();
  txs.forEach(t => {
    if (t.amount < 0) {
      const cat = categorize(t.description || "", t.amount);
      catMap.set(cat, (catMap.get(cat) || 0) + Math.abs(t.amount));
    }
  });

  const topCats = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, usd]) => ({ cat, usd: Math.round(usd) }));

  return {
    closing_balance: balance,
    avg_daily_surplus: avgSurplus,
    surplus_volatility: volatility,
    cash_buffer_days: bufferDays,
    top_categories: topCats,
    confidence_score: Math.min(100, (txs.length / 30) * 100)
  };
}

function generateRecs(agg: any) {
  const { avg_daily_surplus, surplus_volatility, cash_buffer_days } = agg;
  
  let inv_min = 0, inv_max = 1000;
  let edge = 50, notional = 5000, loss_limit = 100;
  let reason = "Baseline conservative policy. ";

  if (avg_daily_surplus > 500) {
    notional = 20000; edge = 30;
    reason += "Strong surplus → larger positions. ";
  } else if (avg_daily_surplus > 200) {
    notional = 10000; edge = 40;
    reason += "Moderate surplus → medium trades. ";
  }

  if (surplus_volatility > 300) {
    loss_limit = 50; edge += 10;
    reason += "High volatility → tight risk controls. ";
  } else if (surplus_volatility < 100) {
    loss_limit = 150;
    reason += "Low volatility → flexible parameters. ";
  }

  if (cash_buffer_days > 60) {
    inv_max = 5000;
    reason += "Strong buffer → larger inventory. ";
  } else if (cash_buffer_days < 30) {
    inv_max = 500; loss_limit = 75;
    reason += "Limited buffer → conservative limits. ";
  }

  return {
    inventory_min: inv_min,
    inventory_max: inv_max,
    min_edge_bps: edge,
    max_notional_usd: notional,
    daily_loss_limit_bps: loss_limit,
    reasoning: reason.trim()
  };
}