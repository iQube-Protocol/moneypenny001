import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Symbol to CoinGecko ID mapping
const SYMBOL_MAP: Record<string, string> = {
  'eth': 'ethereum',
  'btc': 'bitcoin',
  'sol': 'solana',
  'matic': 'matic-network',
  'arb': 'arbitrum',
  'op': 'optimism',
  'avax': 'avalanche-2',
  'link': 'chainlink',
  'uni': 'uniswap',
  'aave': 'aave',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.pathname.split('/').pop()?.toLowerCase() || '';

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const coingeckoId = SYMBOL_MAP[symbol];
    if (!coingeckoId) {
      return new Response(JSON.stringify({ error: `Unknown symbol: ${symbol}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try Redis cache first
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const cacheKey = `oracle:refprice:${symbol}`;
    
    // Check cache (stored in a simple KV table or use in-memory for now)
    const { data: cached } = await supabase
      .from('cache_store')
      .select('value, expires_at')
      .eq('key', cacheKey)
      .single();

    if (cached && new Date(cached.expires_at) > new Date()) {
      console.log(`Cache hit for ${symbol}`);
      return new Response(cached.value, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from CoinGecko with retry logic
    console.log(`Fetching fresh data for ${symbol} from CoinGecko`);
    
    let cgResponse: Response;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      cgResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
      );
      
      if (cgResponse.ok) break;
      
      if (cgResponse.status === 429) {
        // Rate limited - if we have expired cache, return that
        if (cached) {
          console.log(`Rate limited, returning stale cache for ${symbol}`);
          return new Response(cached.value, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache-Status': 'stale'
            },
          });
        }
        
        // Exponential backoff
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${retries + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
        continue;
      }
      
      throw new Error(`CoinGecko API error: ${cgResponse.status}`);
    }
    
    if (!cgResponse!.ok) {
      throw new Error(`CoinGecko API error after ${maxRetries} retries`);
    }

    const cgData = await cgResponse!.json();
    const priceUsd = cgData[coingeckoId]?.usd;

    if (!priceUsd) {
      throw new Error('Price not found in CoinGecko response');
    }

    // Build normalized response
    const response = {
      symbol: symbol.toUpperCase(),
      price_usd: priceUsd,
      ts: new Date().toISOString(),
      source: 'coingecko',
    };

    const responseJson = JSON.stringify(response);

    // Cache for 5 minutes (CoinGecko free tier has strict limits)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
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
    console.error('oracle-refprice error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
