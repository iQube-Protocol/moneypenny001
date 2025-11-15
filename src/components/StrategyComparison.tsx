import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Strategy {
  action: 'buy' | 'sell' | 'hold';
  instrument: string;
  chain: string;
  size_qc: number;
  min_edge_bps: number;
  rationale: string;
  confidence: number;
}

interface StrategyComparisonProps {
  current: Strategy;
  previous?: Strategy;
  onApply: (strategy: Strategy) => void;
}

export function StrategyComparison({ current, previous, onApply }: StrategyComparisonProps) {
  const getActionIcon = (action: string) => {
    if (action === 'buy') return <TrendingUp className="h-4 w-4" />;
    if (action === 'sell') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action === 'buy') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (action === 'sell') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const hasChanged = previous && (
    previous.action !== current.action ||
    previous.size_qc !== current.size_qc ||
    previous.instrument !== current.instrument
  );

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold neon-text">Strategy Recommendation</h3>
          <Badge variant="outline" className="border-primary/30">
            {current.confidence}% confidence
          </Badge>
        </div>

        {hasChanged && previous && (
          <div className="flex items-center gap-2 text-sm">
            <Badge className={getActionColor(previous.action)}>
              {getActionIcon(previous.action)}
              <span className="ml-1">{previous.action.toUpperCase()}</span>
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge className={getActionColor(current.action)}>
              {getActionIcon(current.action)}
              <span className="ml-1">{current.action.toUpperCase()}</span>
            </Badge>
            <span className="text-muted-foreground ml-2">Strategy changed!</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Action:</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getActionColor(current.action)}>
                {getActionIcon(current.action)}
                <span className="ml-1">{current.action.toUpperCase()}</span>
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Instrument:</span>
            <p className="font-mono mt-1">{current.instrument}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Chain:</span>
            <p className="font-mono mt-1">{current.chain.toUpperCase()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Size:</span>
            <p className="font-mono mt-1">{current.size_qc.toFixed(2)} Q¢</p>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Min Edge:</span>
            <p className="font-mono mt-1">{current.min_edge_bps} bps</p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-sm text-muted-foreground">{current.rationale}</p>
        </div>

        <button
          onClick={() => onApply(current)}
          className="w-full py-2 px-4 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-md text-sm font-medium transition-colors"
        >
          Apply to Intent Form
        </button>
      </div>
    </Card>
  );
}
