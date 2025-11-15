import { AdvancedIntentForm } from "@/components/AdvancedIntentForm";
import { CaptureSparkline } from "@/components/CaptureSparkline";
import { FillsTicker } from "@/components/FillsTicker";

const chains = ["eth", "arb", "base", "op", "poly", "btc", "sol"];

interface IntentCaptureOverlayProps {
  suggestedStrategy?: any;
}

export function IntentCaptureOverlay({ suggestedStrategy }: IntentCaptureOverlayProps) {
  const captureData = [];
  const fills = [];
  const totalQc = 0;

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
        <CaptureSparkline data={captureData} totalQc={totalQc} />
        <FillsTicker fills={fills} />
      </div>
    </div>
  );
}
