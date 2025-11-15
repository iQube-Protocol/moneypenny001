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
    <div className="flex items-center gap-4 glass-card p-3">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Edge Gauge</span>
      
      <div className="flex-1 relative h-3 bg-secondary rounded-full overflow-hidden">
        {/* Floor marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50 z-10"
          style={{ left: `${floorPercent}%` }}
        />
        {/* Min Edge marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-warning z-10"
          style={{ left: `${minPercent}%` }}
        />
        {/* Live Edge bar */}
        <div 
          className="h-full bg-primary shadow-lg shadow-primary/50 transition-all duration-500 animate-pulse-slow"
          style={{ width: `${livePercent}%` }}
        />
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-muted-foreground/50">{floorBps.toFixed(2)}</span>
        <span className="text-warning">{minEdgeBps.toFixed(2)}</span>
        <span className="neon-text font-semibold">{liveEdgeBps.toFixed(2)} bps</span>
      </div>
    </div>
  );
}
