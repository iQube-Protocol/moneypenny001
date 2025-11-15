import { Card } from "@/components/ui/card";
import { ChainChip } from "./ChainChip";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Fill {
  side: "BUY" | "SELL";
  chain: string;
  qty: number;
  price: number;
  captureBps: number;
  timestamp: string;
}

interface FillsTickerProps {
  fills: Fill[];
}

export function FillsTicker({ fills }: FillsTickerProps) {
  return (
    <Card className="glass-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Fills</h3>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {fills.map((fill, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-lg glass-hover"
          >
            <div className="flex-shrink-0">
              {fill.side === "BUY" ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            
            <div className="flex-shrink-0">
              <ChainChip chain={fill.chain} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono">{fill.qty.toFixed(0)} Q¢</span>
                <span className="text-muted-foreground">@</span>
                <span className="font-mono text-xs">${fill.price.toFixed(5)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(fill.timestamp).toLocaleTimeString()}
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <div className={`font-mono text-sm ${fill.captureBps > 0 ? 'data-positive' : 'data-negative'}`}>
                {fill.captureBps > 0 ? '+' : ''}{fill.captureBps.toFixed(2)} bps
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
