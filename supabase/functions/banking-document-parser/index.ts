import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Parse multiple date formats to ISO YYYY-MM-DD
function normalizeDate(input: string): string | null {
  const t = input.trim();
  // YYYY-MM-DD
  const ymd = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  // MM/DD/YYYY (assume US format)
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, '0');
    const dd = mdy[2].padStart(2, '0');
    return `${mdy[3]}-${mm}-${dd}`;
  }
  // Mon DD, YYYY
  const mon = t.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (mon) {
    const months: Record<string, string> = {
      january:"01", february:"02", march:"03", april:"04", may:"05", june:"06",
      july:"07", august:"08", september:"09", october:"10", november:"11", december:"12",
      jan:"01", feb:"02", mar:"03", apr:"04", jun:"06", jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12"
    };
    const m = months[mon[1].toLowerCase()];
    if (m) return `${mon[3]}-${m}-${mon[2].padStart(2,'0')}`;
  }
  return null;
}

function parseAmount(raw: string): number | null {
  let s = raw.trim();
  const isNegative = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[()$,+]/g, '');
  const m = s.match(/^-?\d*(?:\.\d{2})?$/);
  if (!m) return null;
  const n = parseFloat(s || '0');
  return isNegative ? -n : n;
}

function extractTransactionsFromText(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Heuristic 1: date ... amount at end of line
  for (const line of lines) {
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\b/);
    const amountMatch = line.match(/(\(?\$?\s*[\d,]+\.\d{2}\)?)$/);
    if (dateMatch && amountMatch) {
      const iso = normalizeDate(dateMatch[1]);
      const amt = parseAmount(amountMatch[1]);
      if (iso && amt !== null) {
        const desc = line
          .replace(dateMatch[1], '')
          .replace(amountMatch[1], '')
          .trim();
        transactions.push({ date: iso, amount: amt, category: 'general', description: desc.slice(0, 120) });
        continue;
      }
    }
  }

  // Heuristic 2: columns split by 2+ spaces => date | description | amount
  if (transactions.length === 0) {
    for (const line of lines) {
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 2) {
        const maybeDate = normalizeDate(parts[0]);
        const maybeAmount = parseAmount(parts[parts.length - 1]);
        if (maybeDate && maybeAmount !== null) {
          const desc = parts.slice(1, parts.length - 1).join(' ').trim();
          transactions.push({ date: maybeDate, amount: maybeAmount, category: 'general', description: desc.slice(0, 120) });
        }
      }
    }
  }

  return transactions;
}

function extractClosingBalance(text: string): number {
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.toLowerCase();
    if (line.includes('closing balance') || line.includes('ending balance') || line.includes('final balance')) {
      const m = raw.match(/(\(?\$?\s*[\d,]+\.\d{2}\)?)/);
      if (m) {
        const n = parseAmount(m[1]);
        if (n !== null) return n;
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
      closing_balance: closingBalance || 0,
      cash_buffer_days: 0,
      confidence_score: 0
    };
  }

  const dailySums = new Map<string, number>();
  for (const tx of transactions) {
    const cur = dailySums.get(tx.date) || 0;
    dailySums.set(tx.date, cur + tx.amount);
  }
  const values = Array.from(dailySums.values());
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const volatility = Math.sqrt(variance);
  const cashBufferDays = avg !== 0 ? (closingBalance || 0) / Math.abs(avg) : 0;
  const confidence = Math.min(transactions.length / 30, 1.0);

  return {
    avg_daily_surplus: avg,
    surplus_volatility: volatility,
    closing_balance: closingBalance || 0,
    cash_buffer_days: cashBufferDays,
    confidence_score: confidence,
  };
}

function generateRecommendations(aggr: ReturnType<typeof computeAggregates>) {
  const { avg_daily_surplus, surplus_volatility, closing_balance } = aggr;
  const inventoryMin = clamp(avg_daily_surplus / 25, 50, 500);
  const inventoryMax = clamp(avg_daily_surplus * 2, 500, 5000);
  const maxNotional = clamp(0.35 * avg_daily_surplus, 25, 0.20 * (closing_balance || 0));
  const volBps = surplus_volatility > 0 ? (surplus_volatility / 0.01) * 10000 : 100;
  const dailyLossLimit = clamp(3 * volBps, 8, 40);
  return {
    inventory_band: { min: Math.round(inventoryMin * 100) / 100, max: Math.round(inventoryMax * 100) / 100 },
    min_edge_bps_baseline: 1.0,
    daily_loss_limit_bps: Math.round(dailyLossLimit * 10) / 10,
    max_notional_usd_day: Math.round(maxNotional * 100) / 100,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase environment variables");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { file_paths, user_id } = await req.json();

    if (!file_paths || !Array.isArray(file_paths) || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: file_paths (array), user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allTransactions: Transaction[] = [];
    let latestClosingBalance = 0;
    let totalStatements = 0;

    for (const filePath of file_paths) {
      const { data: blob, error } = await supabase.storage.from('banking-documents').download(filePath);
      if (error) {
        console.error('Download error:', error);
        continue;
      }

      // Try to get text. Some PDFs will not yield useful text; heuristics may still capture data.
      let text = '';
      try {
        text = await blob.text();
      } catch {
        const buf = await blob.arrayBuffer();
        text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
      }

      const txs = extractTransactionsFromText(text);
      const bal = extractClosingBalance(text);
      if (bal !== 0) latestClosingBalance = bal;

      // Determine period from transactions if any
      const dates = txs.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
      const periodStart = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
      const periodEnd = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

      // Store statement and capture id
      const { data: stmt, error: stmtErr } = await supabase
        .from('bank_statements')
        .insert({
          user_id,
          file_name: filePath.split('/').pop(),
          file_path: filePath,
          period_start: periodStart ? periodStart.toISOString().slice(0,10) : null,
          period_end: periodEnd ? periodEnd.toISOString().slice(0,10) : null,
          closing_balance: bal || null,
        })
        .select('id')
        .maybeSingle();

      if (stmtErr) {
        console.error('Store statement error:', stmtErr);
      }

      if (txs.length > 0 && stmt?.id) {
        const { error: txErr } = await supabase.from('transactions').insert(
          txs.map(t => ({
            statement_id: stmt.id,
            user_id,
            transaction_date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
          }))
        );
        if (txErr) {
          console.error('Store transactions error:', txErr);
        } else {
          allTransactions.push(...txs);
        }
      }

      totalStatements += 1;
    }

    // Compute aggregates even if zero; never 400 to avoid breaking flow
    const aggregates = computeAggregates(allTransactions, latestClosingBalance);
    const recommendations = generateRecommendations(aggregates);

    const { error: aggErr } = await supabase.from('financial_aggregates').upsert({
      user_id,
      avg_daily_surplus: aggregates.avg_daily_surplus,
      surplus_volatility: aggregates.surplus_volatility,
      closing_balance: aggregates.closing_balance,
      cash_buffer_days: aggregates.cash_buffer_days,
      confidence_score: aggregates.confidence_score,
      updated_at: new Date().toISOString(),
    });
    if (aggErr) console.error('Upsert aggregates error:', aggErr);

    const { error: recErr } = await supabase.from('trading_recommendations').upsert({
      user_id,
      inventory_min: recommendations.inventory_band.min,
      inventory_max: recommendations.inventory_band.max,
      min_edge_bps: recommendations.min_edge_bps_baseline,
      daily_loss_limit_bps: recommendations.daily_loss_limit_bps,
      max_notional_usd: recommendations.max_notional_usd_day,
      reasoning: `Auto-generated from ${allTransactions.length} transactions`,
      updated_at: new Date().toISOString(),
    });
    if (recErr) console.error('Upsert recs error:', recErr);

    return new Response(
      JSON.stringify({
        success: true,
        statements_processed: totalStatements,
        transactions_extracted: allTransactions.length,
        features: {
          avg_daily_surplus: aggregates.avg_daily_surplus,
          surplus_volatility: aggregates.surplus_volatility,
          closing_balance: aggregates.closing_balance,
          cash_buffer_days: aggregates.cash_buffer_days,
        },
        recommendations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Banking document parser error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
