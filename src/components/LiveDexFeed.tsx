import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChainChip } from "@/components/ChainChip";

interface DexData {
  chain: string;
  pair_address: string;
  price_usd: number;
  liquidity_usd: number;
  volume_24h_usd: number;
  fee_bps: number;
  ts: string;
  source: string;
}

// Example pairs to track - replace with real pairs
const TRACKED_PAIRS = [
  { chain: 'solana', address: 'So11111111111111111111111111111111111111112', label: 'SOL/USDC' },
  { chain: 'ethereum', address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', label: 'ETH/USDC' },
];

export function LiveDexFeed() {
  const [dexData, setDexData] = useState<DexData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDexData = async () => {
    try {
      const dexPromises = TRACKED_PAIRS.map(pair =>
        supabase.functions.invoke(`oracle-dex/${pair.chain}/${pair.address}`)
      );
      
      const results = await Promise.all(dexPromises);
      
      const newData: DexData[] = [];
      results.forEach(({ data, error }) => {
        if (!error && data) {
          newData.push(data);
        }
      });
      
      setDexData(newData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch DEX data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDexData();
    const interval = setInterval(fetchDexData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="glass-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading DEX data...
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">DEX Venues</h3>
        <span className="text-xs text-muted-foreground">DexScreener</span>
      </div>
      
      <div className="space-y-3">
        {dexData.map((data, idx) => {
          const pair = TRACKED_PAIRS[idx];
          
          return (
            <div key={data.pair_address} className="space-y-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChainChip chain={data.chain} />
                  <span className="text-sm font-medium text-foreground">{pair.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  ${data.price_usd.toFixed(4)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Liquidity</div>
                  <div className="font-medium text-foreground">
                    ${(data.liquidity_usd / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Vol 24h</div>
                  <div className="font-medium text-foreground">
                    ${(data.volume_24h_usd / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fee</div>
                  <div className="font-medium text-foreground">
                    {data.fee_bps / 100}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
