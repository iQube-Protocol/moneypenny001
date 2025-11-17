import { AdvancedIntentForm } from "@/components/AdvancedIntentForm";
import { CaptureSparkline } from "@/components/CaptureSparkline";
import { FillsTicker } from "@/components/FillsTicker";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const chains = ["eth", "arb", "base", "op", "poly", "btc", "sol"];

interface IntentCaptureOverlayProps {
  suggestedStrategy?: any;
}

export function IntentCaptureOverlay({ suggestedStrategy }: IntentCaptureOverlayProps) {
  const moneyPenny = useMoneyPenny();
  const [recentFills, setRecentFills] = useState<any[]>([]);

  // Fetch recent executions
  useEffect(() => {
    const loadFills = async () => {
      if (!moneyPenny) return;
      try {
        const executions = await moneyPenny.execution.listExecutions(20);
        const fillsData = executions.map(exec => ({
          side: exec.side as "BUY" | "SELL",
          chain: exec.chain,
          qty: exec.qty_filled,
          price: exec.avg_price,
          captureBps: exec.capture_bps,
          timestamp: exec.timestamp,
        }));
        setRecentFills(fillsData);
      } catch (error) {
        console.error('Failed to load fills:', error);
      }
    };

    loadFills();

    // Subscribe to real-time execution updates
    const channel = supabase
      .channel('intent-capture-fills')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          loadFills(); // Reload fills when new execution arrives
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moneyPenny]);

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
        <FillsTicker fills={recentFills} />
      </div>
    </div>
  );
}
