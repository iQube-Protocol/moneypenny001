import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  console.log('[quotes] Request:', req.method, path, url.search);

  // GET /sim/stream - SSE stream for simulated quotes
  if (path.endsWith('/sim/stream') && req.method === 'GET') {
    const chains = url.searchParams.get('chains')?.split(',') || ['ethereum', 'arbitrum', 'base'];
    const scope = url.searchParams.get('scope') || 'default';

    console.log('[quotes/sim/stream] Starting SSE for chains:', chains, 'scope:', scope);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const send = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          try {
            controller.enqueue(encoder.encode(message));
          } catch (e) {
            console.error('[quotes/sim] Error sending:', e);
          }
        };

        let tickCount = 0;
        let pnlCount = 0;

        // Simulate market activity
        const interval = setInterval(() => {
          tickCount++;

          // Random chain from the list
          const chain = chains[Math.floor(Math.random() * chains.length)];
          
          // QUOTE event (every tick)
          const edgeBps = 0.5 + Math.random() * 4.5; // 0.5 to 5 bps
          const floorBps = edgeBps * 0.8;
          const priceUsdc = 0.009 + Math.random() * 0.002; // ~$0.009-0.011
          const qtyQc = Math.floor(1000 + Math.random() * 9000); // 1k-10k Q¢

          const quote = {
            status: 'QUOTE',
            chain,
            edge_bps: edgeBps,
            floor_bps: floorBps,
            price_usdc: priceUsdc,
            qty_qc: qtyQc,
            ts: new Date().toISOString(),
          };

          console.log('[quotes/sim] QUOTE:', chain, edgeBps.toFixed(2), 'bps');
          send(quote);

          // FILL event (10-15% chance)
          if (Math.random() < 0.125) {
            const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
            const qtyQct = Math.floor(500 + Math.random() * 2000);
            const captureBps = 0.3 + Math.random() * 3; // 0.3 to 3.3 bps
            const notionalUsd = qtyQct * priceUsdc;

            const fill = {
              status: 'FILL',
              chain,
              side,
              qty_qct: qtyQct,
              price_usdc: priceUsdc,
              capture_bps: captureBps,
              notional_usd: notionalUsd,
              ts: new Date().toISOString(),
            };

            console.log('[quotes/sim] FILL:', side, qtyQct, 'Q¢ @', captureBps.toFixed(2), 'bps');
            send(fill);
          }

          // P&L event (every ~2 seconds, assuming 700-1000ms ticks)
          pnlCount++;
          if (pnlCount >= 2) {
            pnlCount = 0;
            const captureBps = 1.2 + Math.random() * 2.5; // 1.2-3.7 bps
            const turnoverUsd = 5000 + Math.random() * 15000;
            const pegUsd = 0.01;

            const pnl = {
              status: 'P&L',
              capture_bps: captureBps,
              turnover_usd: turnoverUsd,
              peg_usd: pegUsd,
              ts: new Date().toISOString(),
            };

            console.log('[quotes/sim] P&L:', captureBps.toFixed(2), 'bps, $', turnoverUsd.toFixed(0));
            send(pnl);
          }
        }, 700 + Math.random() * 300); // 700-1000ms

        // Cleanup on close
        req.signal.addEventListener('abort', () => {
          console.log('[quotes/sim] Client disconnected, stopping interval');
          clearInterval(interval);
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Fallback 404
  console.log('[quotes] 404 not found:', path);
  return new Response(
    JSON.stringify({ error: 'Not found', path }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});