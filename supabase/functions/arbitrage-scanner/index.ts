import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScanRequest {
  asset?: string;
  minProfitBps: number;
  chains: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset, minProfitBps, chains }: ScanRequest = await req.json();

    // Simulate arbitrage scanning across chains and DEXs
    const opportunities = await scanArbitrageOpportunities(
      asset,
      minProfitBps,
      chains
    );

    return new Response(
      JSON.stringify({ opportunities }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Arbitrage scanner error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function scanArbitrageOpportunities(
  targetAsset: string | undefined,
  minProfitBps: number,
  chains: string[]
): Promise<any[]> {
  const assets = targetAsset ? [targetAsset] : ["USDC", "USDT", "DAI", "ETH", "WBTC"];
  const dexes = ["Uniswap", "SushiSwap", "Curve", "Balancer", "PancakeSwap"];
  const opportunities = [];

  for (const asset of assets) {
    // Generate base price for the asset
    const basePrice = getBasePrice(asset);

    // Simulate price variations across chains and DEXs
    const prices: Array<{
      chain: string;
      dex: string;
      price: number;
    }> = [];

    for (const chain of chains) {
      for (let i = 0; i < 2; i++) {
        // Sample 2 DEXs per chain
        const dex = dexes[Math.floor(Math.random() * dexes.length)];
        // Add random price variation (±0.5%)
        const variation = (Math.random() - 0.5) * 0.01;
        const price = basePrice * (1 + variation);
        prices.push({ chain, dex, price });
      }
    }

    // Find arbitrage opportunities
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const buy = prices[i].price < prices[j].price ? prices[i] : prices[j];
        const sell = prices[i].price < prices[j].price ? prices[j] : prices[i];

        // Calculate spread in basis points
        const spreadBps = ((sell.price - buy.price) / buy.price) * 10000;

        // Estimate gas costs (varies by chain)
        const gasCost = estimateGasCost(buy.chain, sell.chain);

        // Calculate net profit after gas
        const netProfitBps = spreadBps - gasCost;

        // Only include if net profit exceeds minimum threshold
        if (netProfitBps >= minProfitBps) {
          const confidence = calculateConfidence(spreadBps, buy.chain, sell.chain);

          opportunities.push({
            id: crypto.randomUUID(),
            asset,
            buyChain: buy.chain,
            buyDex: buy.dex,
            buyPrice: buy.price,
            sellChain: sell.chain,
            sellDex: sell.dex,
            sellPrice: sell.price,
            spreadBps,
            netProfitBps,
            estimatedGasCost: gasCost,
            confidence,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Sort by net profit (highest first)
  opportunities.sort((a, b) => b.netProfitBps - a.netProfitBps);

  // Return top 10 opportunities
  return opportunities.slice(0, 10);
}

function getBasePrice(asset: string): number {
  const prices: Record<string, number> = {
    USDC: 1.0,
    USDT: 1.0,
    DAI: 1.0,
    ETH: 2500.0,
    WBTC: 45000.0,
  };
  return prices[asset] || 1.0;
}

function estimateGasCost(buyChain: string, sellChain: string): number {
  // Gas cost estimates in basis points of trade value
  const gasCosts: Record<string, number> = {
    eth: 30, // Ethereum is expensive
    polygon: 5,
    arbitrum: 8,
    optimism: 10,
    base: 7,
    avalanche: 12,
    bsc: 6,
  };

  const buyCost = gasCosts[buyChain] || 10;
  const sellCost = gasCosts[sellChain] || 10;

  // Cross-chain requires bridge, add extra cost
  if (buyChain !== sellChain) {
    return buyCost + sellCost + 15; // Bridge cost
  }

  return buyCost + sellCost;
}

function calculateConfidence(spreadBps: number, buyChain: string, sellChain: string): number {
  let confidence = 70; // Base confidence

  // Higher spread = higher confidence
  if (spreadBps > 100) confidence += 15;
  else if (spreadBps > 50) confidence += 10;
  else if (spreadBps > 20) confidence += 5;

  // Same chain = higher confidence (no bridge risk)
  if (buyChain === sellChain) confidence += 10;

  // Eth mainnet = lower confidence (high gas)
  if (buyChain === "eth" || sellChain === "eth") confidence -= 10;

  // Cap confidence between 0-100
  return Math.max(0, Math.min(100, confidence));
}
