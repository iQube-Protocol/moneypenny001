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
    // Initialize with 144 data points (24 hours at 10-minute intervals)
    const now = Date.now();
    const pointsCount = 144;
    const interval = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    return Array.from({ length: pointsCount }, (_, i) => {
      const timestamp = now - (pointsCount - 1 - i) * interval;
      // Simulate varying capture rates with some randomness
      const baseCapture = 12; // Average 12 bps
      const variance = Math.sin(i / 20) * 5; // Add wave pattern
      const randomness = (Math.random() - 0.5) * 8;
      
      return {
        timestamp: new Date(timestamp).toISOString(),
        captureBps: Math.max(3, Math.min(20, baseCapture + variance + randomness))
      };
    });
  });
  const [qcBalance, setQcBalance] = useState(1247.83);

  // Simulate HFT trades - add new point every 10 minutes (sped up to 5 seconds for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      const baseCapture = 12;
      const variance = (Math.random() - 0.5) * 8;
      const newCapture = Math.max(3, Math.min(20, baseCapture + variance));
      const qcEarned = (Math.random() * 0.5 + 0.1); // 0.1-0.6 Q¢ per period
      
      setSimulatedData(prev => {
        // Remove oldest, add newest (sliding 24-hour window)
        const updated = [...prev.slice(1), {
          timestamp: new Date().toISOString(),
          captureBps: newCapture
        }];
        return updated;
      });
      
      setQcBalance(prev => prev + qcEarned);
    }, 5000); // Update every 5 seconds to show activity (represents 10-min intervals)

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
