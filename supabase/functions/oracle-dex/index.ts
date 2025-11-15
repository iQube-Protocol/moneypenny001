import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Expect: /oracle-dex/{chain}/{pairAddress}
    const chain = pathParts[pathParts.length - 2]?.toLowerCase();
    const pairAddress = pathParts[pathParts.length - 1];

    if (!chain || !pairAddress) {
      return new Response(
        JSON.stringify({ error: 'Chain and pair address required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try cache first
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const cacheKey = `oracle:dex:${chain}:${pairAddress}`;
    
    const { data: cached } = await supabase
      .from('cache_store')
      .select('value, expires_at')
      .eq('key', cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache hit for ${chain}/${pairAddress}`);
      return new Response(cached.value, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from DexScreener
    console.log(`Fetching fresh DEX data for ${chain}/${pairAddress}`);
    const dexResponse = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`
    );

    if (!dexResponse.ok) {
      throw new Error(`DexScreener API error: ${dexResponse.status}`);
    }

    const dexData = await dexResponse.json();
    const pair = dexData.pairs?.[0];

    if (!pair) {
      throw new Error('Pair not found in DexScreener response');
    }

    // Build normalized response
    const response = {
      chain: chain,
      pair_address: pairAddress,
      price_usd: parseFloat(pair.priceUsd || '0'),
      liquidity_usd: parseFloat(pair.liquidity?.usd || '0'),
      volume_24h_usd: parseFloat(pair.volume?.h24 || '0'),
      fee_bps: pair.feeTier ? parseInt(pair.feeTier) : 1,
      ts: new Date().toISOString(),
      source: 'dexscreener',
    };

    const responseJson = JSON.stringify(response);

    // Cache for 10 seconds
    const expiresAt = new Date(Date.now() + 10000).toISOString();
    await supabase
      .from('cache_store')
      .upsert({
        key: cacheKey,
        value: responseJson,
        expires_at: expiresAt,
      });

    return new Response(responseJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('oracle-dex error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
