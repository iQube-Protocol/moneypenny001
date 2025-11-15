import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PriceData {
  symbol: string;
  price_usd: number;
  ts: string;
  source: string;
}

const TRACKED_SYMBOLS = ['eth', 'btc', 'sol'];

export function LivePriceTicker() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});

  const fetchPrices = async () => {
    try {
      const pricePromises = TRACKED_SYMBOLS.map(symbol =>
        supabase.functions.invoke(`oracle-refprice/${symbol}`)
      );
      
      const results = await Promise.all(pricePromises);
      
      const newPrices: Record<string, PriceData> = {};
      results.forEach(({ data, error }) => {
        if (!error && data) {
          newPrices[data.symbol.toLowerCase()] = data;
        }
      });
      
      setPreviousPrices(prev => {
        const updated: Record<string, number> = {};
        Object.keys(newPrices).forEach(symbol => {
          updated[symbol] = prices[symbol]?.price_usd || newPrices[symbol].price_usd;
        });
        return updated;
      });
      
      setPrices(newPrices);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Refresh every 60s (reduced to avoid rate limits)
    return () => clearInterval(interval);
  }, []);

  const getPriceChange = (symbol: string) => {
    const current = prices[symbol]?.price_usd;
    const previous = previousPrices[symbol];
    if (!current || !previous) return null;
    return current > previous ? 'up' : current < previous ? 'down' : null;
  };

  if (loading) {
    return (
      <Card className="glass-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading live prices...
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Prices</h3>
        <span className="text-xs text-muted-foreground">CoinGecko</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-3">
        {TRACKED_SYMBOLS.map(symbol => {
          const data = prices[symbol];
          const change = getPriceChange(symbol);
          
          return (
            <div key={symbol} className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {symbol}
                </span>
                {change === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
                {change === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
              </div>
              {data ? (
                <div className="text-lg font-bold text-foreground">
                  ${data.price_usd.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">--</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
