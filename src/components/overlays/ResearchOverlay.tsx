import { ResearchPanel } from "@/components/ResearchPanel";
import { LivePriceTicker } from "@/components/LivePriceTicker";
import { LiveDexFeed } from "@/components/LiveDexFeed";

interface ResearchOverlayProps {
  onStrategyUpdate?: (strategy: any) => void;
}

export function ResearchOverlay({ onStrategyUpdate }: ResearchOverlayProps) {
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">Research & Market Data</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Live intelligence, pricing, and venue data
        </p>
      </div>

      <div className="space-y-4">
        <ResearchPanel onStrategyUpdate={onStrategyUpdate} />
        <LivePriceTicker />
        <LiveDexFeed />
      </div>
    </div>
  );
}
