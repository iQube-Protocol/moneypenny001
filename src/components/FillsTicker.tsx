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
export function FillsTicker({
  fills
}: FillsTickerProps) {
  if (!fills || fills.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-3">Recent Fills</h3>
        <div className="space-y-2">
          {fills.slice(0, 5).map((fill, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {fill.side === "BUY" ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <ChainChip chain={fill.chain} />
                <span className="font-mono">{fill.qty.toFixed(2)} Q¢</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">
                  ${fill.price.toFixed(4)}
                </span>
                <span className="font-mono text-primary">
                  {fill.captureBps.toFixed(2)} bps
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}