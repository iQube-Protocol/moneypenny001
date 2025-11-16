import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface DataPoint {
  timestamp: string;
  captureBps: number;
}

interface CaptureSparklineProps {
  data?: DataPoint[];
  totalQc?: number;
}

const timeframes = ["1m", "15m", "30m", "1h", "24h", "48h", "1w", "1M"] as const;

export function CaptureSparkline({ data: initialData, totalQc: initialQc }: CaptureSparklineProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<typeof timeframes[number]>("24h");
  const [simulatedData, setSimulatedData] = useState<DataPoint[]>(() => {
    // Initialize with 50 data points
    const now = Date.now();
    return Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(now - (49 - i) * 2000).toISOString(),
      captureBps: Math.random() * 15 + 5 // 5-20 bps capture
    }));
  });
  const [qcBalance, setQcBalance] = useState(1247.83);

  // Simulate HFT trades
  useEffect(() => {
    const interval = setInterval(() => {
      const newCapture = Math.random() * 15 + 5; // 5-20 bps
      const qcEarned = (Math.random() * 0.5 + 0.1); // 0.1-0.6 Q¢ per trade
      
      setSimulatedData(prev => {
        const updated = [...prev.slice(1), {
          timestamp: new Date().toISOString(),
          captureBps: newCapture
        }];
        return updated;
      });
      
      setQcBalance(prev => prev + qcEarned);
    }, 2000); // New trade every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const data = initialData || simulatedData;
  const totalQc = initialQc || qcBalance;

  const maxCapture = Math.max(...data.map(d => d.captureBps), 1);
  const minCapture = Math.min(...data.map(d => d.captureBps), 0);
  const range = maxCapture - minCapture;

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Capture Performance</h3>
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <Badge
              key={tf}
              variant={selectedTimeframe === tf ? "default" : "outline"}
              className="cursor-pointer text-xs px-2 py-0.5"
              onClick={() => setSelectedTimeframe(tf)}
            >
              {tf}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold font-mono neon-text">
          {totalQc.toFixed(2)} Q¢
        </div>
        <div className="text-xs text-muted-foreground">Total Earned</div>
      </div>

      <div className="relative h-32 flex items-end gap-1">
        {data.map((point, idx) => {
          const heightPercent = range > 0 
            ? ((point.captureBps - minCapture) / range) * 100 
            : 50;
          
          return (
            <div
              key={idx}
              className="flex-1 group relative"
            >
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  point.captureBps > 0 
                    ? 'bg-success hover:bg-success/80' 
                    : 'bg-destructive hover:bg-destructive/80'
                }`}
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  <div className="font-mono">{point.captureBps.toFixed(2)} bps</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(point.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
