import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Intent {
  chain: string;
  side: "BUY" | "SELL";
  amount_qc: number;
  min_edge_bps: number;
  max_slippage_bps: number;
  order_type?: "MARKET" | "LIMIT";
  limit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  time_in_force?: "GTC" | "IOC" | "FOK" | "DAY";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    
    // Parse request body for path and data (supports both direct and wrapped formats)
    const body = await req.json();
    const path = body.path || url.pathname.replace("/execution-engine", "");
    const method = body.method || req.method;
    const intentData = body.data;

    // Route: POST /intent/submit
    if (path === "/intent/submit" && method === "POST") {
      const intent: Intent = intentData || body;

      const { data, error } = await supabaseClient
        .from("trading_intents")
        .insert({
          user_id: user.id,
          chain: intent.chain,
          side: intent.side,
          amount_qc: intent.amount_qc,
          min_edge_bps: intent.min_edge_bps,
          max_slippage_bps: intent.max_slippage_bps,
          order_type: intent.order_type || "MARKET",
          limit_price: intent.limit_price,
          stop_loss: intent.stop_loss,
          take_profit: intent.take_profit,
          time_in_force: intent.time_in_force || "GTC",
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to submit intent:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Simulate execution in background (non-blocking)
      simulateExecution(supabaseClient, data).catch(console.error);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /intent/:id
    if (path.startsWith("/intent/") && method === "GET" && !path.includes("/cancel")) {
      const intentId = path.split("/")[2];

      const { data, error } = await supabaseClient
        .from("trading_intents")
        .select()
        .eq("intent_id", intentId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Intent not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /intent (list intents)
    if (path === "/intent" && method === "GET") {
      const status = url.searchParams.get("status");

      let query = supabaseClient
        .from("trading_intents")
        .select()
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /intent/:id/cancel
    if (path.includes("/cancel") && method === "POST") {
      const intentId = path.split("/")[2];

      const { data, error } = await supabaseClient
        .from("trading_intents")
        .update({ status: "cancelled" })
        .eq("intent_id", intentId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ cancelled: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /execution/:id
    if (path.startsWith("/execution/") && method === "GET") {
      const executionId = path.split("/")[2];

      const { data, error } = await supabaseClient
        .from("trading_executions")
        .select()
        .eq("execution_id", executionId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Execution not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /execution (list executions)
    if (path === "/execution" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const { data, error } = await supabaseClient
        .from("trading_executions")
        .select()
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /stats
    if (path === "/stats" && method === "GET") {
      const period = url.searchParams.get("period") || "24h";
      const hours = period === "24h" ? 24 : period === "7d" ? 168 : 720;

      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data: executions, error } = await supabaseClient
        .from("trading_executions")
        .select()
        .eq("user_id", user.id)
        .gte("timestamp", cutoff);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stats = {
        total_fills: executions?.length || 0,
        total_volume_usd:
          executions?.reduce((sum, e) => sum + e.qty_filled * e.avg_price, 0) || 0,
        avg_capture_bps:
          executions?.reduce((sum, e) => sum + e.capture_bps, 0) /
            (executions?.length || 1) || 0,
        chains_traded: [...new Set(executions?.map((e) => e.chain) || [])],
        win_rate:
          ((executions?.filter((e) => e.capture_bps > 0).length || 0) /
            (executions?.length || 1)) *
          100,
      };

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Execution engine error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Simulate trade execution
async function simulateExecution(supabaseClient: any, intent: any) {
  try {
    // Update to quoted status
    await new Promise((resolve) => setTimeout(resolve, 500));
    await supabaseClient
      .from("trading_intents")
      .update({ status: "quoted" })
      .eq("intent_id", intent.intent_id);

    // Update to executing status
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await supabaseClient
      .from("trading_intents")
      .update({ status: "executing" })
      .eq("intent_id", intent.intent_id);

    // Simulate execution parameters
    const basePrice = intent.order_type === "LIMIT" && intent.limit_price 
      ? intent.limit_price 
      : Math.random() * 1000 + 1500;
    const slippage = Math.random() * intent.max_slippage_bps;
    const executionPrice = intent.side === "BUY"
      ? basePrice * (1 + slippage / 10000)
      : basePrice * (1 - slippage / 10000);
    const captureBps = Math.random() * intent.min_edge_bps * 2;
    const dexes = ["Uniswap", "SushiSwap", "Curve", "Balancer", "1inch"];
    const dex = dexes[Math.floor(Math.random() * dexes.length)];

    // Create execution record
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const { data: execution } = await supabaseClient
      .from("trading_executions")
      .insert({
        intent_id: intent.intent_id,
        user_id: intent.user_id,
        chain: intent.chain,
        side: intent.side,
        qty_filled: intent.amount_qc,
        avg_price: executionPrice,
        capture_bps: captureBps,
        tx_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        gas_used: Math.floor(Math.random() * 100000 + 50000),
        dex: dex,
        status: "confirmed",
      })
      .select()
      .single();

    // Update intent to filled
    await supabaseClient
      .from("trading_intents")
      .update({ status: "filled" })
      .eq("intent_id", intent.intent_id);

    // Auto-generate insights and decisions
    await createExecutionMemories(supabaseClient, intent, execution);

    // Broadcast execution fill to all connected clients
    await supabaseClient.channel('notifications').send({
      type: 'broadcast',
      event: 'notification',
      payload: {
        type: 'execution_fill',
        action: 'updated',
        data: {
          intent_id: intent.intent_id,
          execution_id: execution.execution_id,
          qty_filled: execution.qty_filled,
          asset: 'QC',
          chain: execution.chain,
          avg_price: execution.avg_price,
          capture_bps: execution.capture_bps,
          tx_hash: execution.tx_hash,
        },
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`Execution completed for intent ${intent.intent_id}`);
  } catch (error) {
    console.error("Simulation error:", error);
    // Mark intent as failed
    await supabaseClient
      .from("trading_intents")
      .update({ status: "failed" })
      .eq("intent_id", intent.intent_id);
  }
}

// Auto-generate insights and decisions from execution data
async function createExecutionMemories(
  supabaseClient: any,
  intent: any,
  execution: any
) {
  try {
    const memories = [];

    // Generate insight based on capture performance
    let insightContent = "";
    if (execution.capture_bps > 3.0) {
      insightContent = `Excellent capture of ${execution.capture_bps.toFixed(2)} bps on ${intent.chain} ${intent.side} - significantly above target edge of ${intent.min_edge_bps} bps. Market conditions highly favorable.`;
    } else if (execution.capture_bps > 2.0) {
      insightContent = `Good capture of ${execution.capture_bps.toFixed(2)} bps on ${intent.chain} ${intent.side} - solid execution meeting edge target of ${intent.min_edge_bps} bps.`;
    } else if (execution.capture_bps > 1.0) {
      insightContent = `Moderate capture of ${execution.capture_bps.toFixed(2)} bps on ${intent.chain} ${intent.side} - acceptable but below optimal performance.`;
    } else {
      insightContent = `Low capture of ${execution.capture_bps.toFixed(2)} bps on ${intent.chain} ${intent.side} - consider adjusting edge requirements or chain selection.`;
    }

    memories.push({
      user_id: intent.user_id,
      type: 'insight',
      content: insightContent,
      metadata: {
        source: 'execution_engine',
        execution_id: execution.execution_id,
        intent_id: intent.intent_id,
        capture_bps: execution.capture_bps,
        chain: intent.chain,
      },
    });

    // Generate decision log
    const notionalUsd = (execution.qty_filled * execution.avg_price).toFixed(2);
    const decisionContent = `Executed ${intent.side} order for ${execution.qty_filled} Q¢ (~$${notionalUsd}) on ${intent.chain} via ${execution.dex}. Decision: Accepted edge of ${intent.min_edge_bps} bps minimum, achieved ${execution.capture_bps.toFixed(2)} bps capture.`;
    
    memories.push({
      user_id: intent.user_id,
      type: 'decision',
      content: decisionContent,
      metadata: {
        source: 'execution_engine',
        execution_id: execution.execution_id,
        intent_id: intent.intent_id,
        side: intent.side,
        qty_qc: execution.qty_filled,
        dex: execution.dex,
        tx_hash: execution.tx_hash,
      },
    });

    // Insert all memories
    const { error } = await supabaseClient
      .from('agent_memories')
      .insert(memories);

    if (error) {
      console.error('Failed to create execution memories:', error);
    } else {
      console.log(`Created ${memories.length} memories for execution ${execution.execution_id}`);
    }
  } catch (error) {
    console.error('Error creating execution memories:', error);
  }
}
