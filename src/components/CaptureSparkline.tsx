import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useMoneyPenny } from "@/lib/aigent/moneypenny/client";
import { supabase } from "@/integrations/supabase/client";

interface DataPoint {
  timestamp: string;
  captureBps: number;
}
interface CaptureSparklineProps {
  data?: DataPoint[];
  totalQc?: number;
}

export function CaptureSparkline({
  data: initialData,
  totalQc: initialQc
}: CaptureSparklineProps) {
  const moneyPenny = useMoneyPenny();
  const [realData, setRealData] = useState<DataPoint[]>([]);
  const [totalQcEarned, setTotalQcEarned] = useState(0);

  // Fetch real execution data and aggregate by 20-minute buckets
  useEffect(() => {
    const loadExecutionData = async () => {
      console.log('[CaptureSparkline] moneyPenny:', moneyPenny);
      if (!moneyPenny) {
        console.log('[CaptureSparkline] No moneyPenny client');
        return;
      }
      
      try {
        console.log('[CaptureSparkline] Fetching executions...');
        // Get last 24 hours of executions
        const executions = await moneyPenny.execution.listExecutions(500);
        console.log('[CaptureSparkline] Executions received:', executions);
        
        if (executions.length === 0) return;

        // Filter last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentExecutions = executions.filter(exec => 
          new Date(exec.timestamp).getTime() > oneDayAgo
        );

        // Create 20-minute time buckets
        const bucketSizeMs = 20 * 60 * 1000;
        const bucketsMap = new Map<number, { captures: number[], total: number }>();

        recentExecutions.forEach(exec => {
          const timestamp = new Date(exec.timestamp).getTime();
          const bucketKey = Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
          
          if (!bucketsMap.has(bucketKey)) {
            bucketsMap.set(bucketKey, { captures: [], total: 0 });
          }
          
          const bucket = bucketsMap.get(bucketKey)!;
          bucket.captures.push(exec.capture_bps);
          bucket.total += exec.qty_filled;
        });

        // Convert to data points
        const dataPoints: DataPoint[] = [];
        const sortedBuckets = Array.from(bucketsMap.entries()).sort((a, b) => a[0] - b[0]);
        
        sortedBuckets.forEach(([bucketTime, bucket]) => {
          const avgCapture = bucket.captures.reduce((a, b) => a + b, 0) / bucket.captures.length;
          dataPoints.push({
            timestamp: new Date(bucketTime).toISOString(),
            captureBps: avgCapture,
          });
        });

        // Calculate total Q¢ earned
        const totalQc = recentExecutions.reduce((sum, exec) => sum + exec.qty_filled, 0);

        setRealData(dataPoints);
        setTotalQcEarned(totalQc);
      } catch (error) {
        console.error('Failed to load execution data:', error);
      }
    };

    loadExecutionData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('capture-sparkline-updates')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          loadExecutionData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moneyPenny]);

  const data = initialData || (realData.length > 0 ? realData : []);
  const totalQc = initialQc !== undefined ? initialQc : totalQcEarned;
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