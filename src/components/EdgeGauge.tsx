import { Card } from "@/components/ui/card";

interface EdgeGaugeProps {
  floorBps: number;
  minEdgeBps: number;
  liveEdgeBps: number;
}

export function EdgeGauge({ floorBps, minEdgeBps, liveEdgeBps }: EdgeGaugeProps) {
  const maxBps = Math.max(floorBps, minEdgeBps, liveEdgeBps) * 1.5;
  const floorPercent = (floorBps / maxBps) * 100;
  const minPercent = (minEdgeBps / maxBps) * 100;
  const livePercent = (liveEdgeBps / maxBps) * 100;

  return (
    <Card className="glass-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Edge Gauge</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Floor</span>
            <span className="font-mono data-positive">{floorBps.toFixed(2)} bps</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-muted-foreground/50 transition-all duration-500"
              style={{ width: `${floorPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Min Edge</span>
            <span className="font-mono text-warning">{minEdgeBps.toFixed(2)} bps</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-warning transition-all duration-500"
              style={{ width: `${minPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Live Edge</span>
            <span className="font-mono neon-text">{liveEdgeBps.toFixed(2)} bps</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary shadow-lg shadow-primary/50 transition-all duration-500 animate-pulse-slow"
              style={{ width: `${livePercent}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
