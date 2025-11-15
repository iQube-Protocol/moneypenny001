import { Card } from "@/components/ui/card";
import { ChainChip } from "./ChainChip";
import { ArrowUpDown } from "lucide-react";

interface Quote {
  chain: string;
  edgeBps: number;
  price: number;
  qty: number;
  timestamp: string;
}

interface QuotesTableProps {
  quotes: Quote[];
}

export function QuotesTable({ quotes }: QuotesTableProps) {
  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Live Quotes</h3>
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-4 text-xs text-muted-foreground pb-2 border-b border-border">
          <div>Chain</div>
          <div className="text-right">Edge (bps)</div>
          <div className="text-right">Price</div>
          <div className="text-right">Qty Q¢</div>
          <div className="text-right">Time</div>
        </div>

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {quotes.map((quote, idx) => (
            <div
              key={idx}
              className="grid grid-cols-5 gap-4 text-sm py-2 px-2 rounded-lg glass-hover"
            >
              <div>
                <ChainChip chain={quote.chain} />
              </div>
              <div className={`text-right font-mono ${quote.edgeBps > 1 ? 'data-positive' : 'text-warning'}`}>
                {quote.edgeBps.toFixed(2)}
              </div>
              <div className="text-right font-mono">${quote.price.toFixed(5)}</div>
              <div className="text-right font-mono">{quote.qty.toFixed(0)}</div>
              <div className="text-right text-xs text-muted-foreground">
                {new Date(quote.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
