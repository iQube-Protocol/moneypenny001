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

// Default to a known working pair; add more via config later
const TRACKED_PAIRS = [
  { chain: 'ethereum', address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', label: 'ETH/USDC' },
  // Example Solana pair (replace with a valid pool address when ready):
  // { chain: 'solana', address: 'REPLACE_WITH_VALID_PAIR', label: 'SOL/USDC' },
];

export function LiveDexFeed() {
  const [dexData, setDexData] = useState<DexData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDexData = async () => {
    try {
      const dexPromises = TRACKED_PAIRS.map(pair =>
        supabase.functions.invoke(`oracle-dex/${pair.chain}/${pair.address}`)
          .catch(err => {
            console.warn(`Failed to fetch ${pair.label}:`, err);
            return { data: null, error: err };
          })
      );
      
      const results = await Promise.all(dexPromises);
      
      const newData: DexData[] = [];
      results.forEach(({ data, error }, idx) => {
        if (!error && data) {
          newData.push(data);
        } else {
          console.warn(`Skipping ${TRACKED_PAIRS[idx].label} - no data available`);
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
        {dexData.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No DEX data available
          </div>
        ) : (
          dexData.map((data) => {
            const pair = TRACKED_PAIRS.find(p => 
              p.chain === data.chain && p.address === data.pair_address
            );
            
            return (
              <div key={data.pair_address} className="space-y-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChainChip chain={data.chain} />
                    <span className="text-sm font-medium text-foreground">{pair?.label || 'Unknown'}</span>
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
          })
        )}
      </div>
    </Card>
  );
}
