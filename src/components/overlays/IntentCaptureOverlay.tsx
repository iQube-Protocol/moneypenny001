import { AdvancedIntentForm } from "@/components/AdvancedIntentForm";
import { CaptureSparkline } from "@/components/CaptureSparkline";
import { FillsTicker } from "@/components/FillsTicker";

const chains = ["eth", "arb", "base", "op", "poly", "btc", "sol"];

interface IntentCaptureOverlayProps {
  suggestedStrategy?: any;
}

export function IntentCaptureOverlay({ suggestedStrategy }: IntentCaptureOverlayProps) {
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">Intent & Capture</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create trading intents and monitor capture rates
        </p>
      </div>

      <AdvancedIntentForm availableChains={chains} suggestedStrategy={suggestedStrategy} />
      
      <div className="grid grid-cols-1 gap-4 mt-4">
        <CaptureSparkline />
        <FillsTicker fills={[]} />
      </div>
    </div>
  );
}
