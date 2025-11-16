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
export function CaptureSparkline({
  data: initialData,
  totalQc: initialQc
}: CaptureSparklineProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<typeof timeframes[number]>("24h");
  const [simulatedData, setSimulatedData] = useState<DataPoint[]>(() => {
    // Initialize with 72 data points (24 hours at 20-minute intervals for better performance)
    const now = Date.now();
    const pointsCount = 72;
    const interval = 20 * 60 * 1000; // 20 minutes in milliseconds

    return Array.from({
      length: pointsCount
    }, (_, i) => {
      const timestamp = now - (pointsCount - 1 - i) * interval;
      // Simulate varying capture rates with some randomness
      const baseCapture = 12; // Average 12 bps
      const variance = Math.sin(i / 10) * 5; // Add wave pattern
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
      const qcEarned = Math.random() * 0.5 + 0.1; // 0.1-0.6 Q¢ per period

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
    <Card className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">24-Hour Trade History</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{data.length} periods</Badge>
          <Badge variant="default" className="text-xs">{totalQc.toFixed(2)} Q¢</Badge>
        </div>
      </div>
      <div className="relative h-32 flex items-end gap-px">
        {data.map((point, idx) => {
          const heightPercent = range > 0 ? ((point.captureBps - minCapture) / range) * 100 : 50;
          return (
            <div
              key={idx}
              className="flex-1 bg-primary/60 hover:bg-primary transition-all rounded-t"
              style={{ height: `${Math.max(heightPercent, 3)}%` }}
              title={`${point.captureBps.toFixed(2)} bps`}
            />
          );
        })}
      </div>
    </Card>
  );
}