import { ExecutionFeed } from "@/components/ExecutionFeed";
import { AgentMemoryPanel } from "@/components/AgentMemoryPanel";
import { ExecutionHistory } from "@/components/ExecutionHistory";

export function LiveInsightsOverlay() {
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">Live Insights</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time execution feed and agent insights
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ExecutionFeed />
        <AgentMemoryPanel />
      </div>
      
      <ExecutionHistory />
    </div>
  );
}
