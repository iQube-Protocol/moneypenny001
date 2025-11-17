import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface ExecutionFeedItem {
  id: string;
  executionId: string;
  chain: string;
  side: 'BUY' | 'SELL';
  asset: string;
  qtyFilled: number;
  avgPrice: number;
  captureBps: number;
  timestamp: Date;
}

interface ExecutionFeedProps {
  maxItems?: number;
  showSound?: boolean;
}

export const ExecutionFeed = ({ maxItems = 20, showSound = true }: ExecutionFeedProps) => {
  const [executions, setExecutions] = useState<ExecutionFeedItem[]>([]);

  useEffect(() => {
    // Load initial executions from database
    const loadInitialExecutions = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_executions')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(maxItems);

        if (error) throw error;

        if (data) {
          const items: ExecutionFeedItem[] = data.map((exec) => ({
            id: exec.execution_id,
            executionId: exec.execution_id,
            chain: exec.chain,
            side: exec.side as 'BUY' | 'SELL',
            asset: 'QC', // Default asset
            qtyFilled: exec.qty_filled,
            avgPrice: exec.avg_price,
            captureBps: exec.capture_bps,
            timestamp: new Date(exec.timestamp),
          }));
          setExecutions(items);
        }
      } catch (error) {
        console.error('Failed to load initial executions:', error);
      }
    };

    loadInitialExecutions();

    // Subscribe to real-time database changes on trading_executions table
    const dbChannel = supabase
      .channel('execution-feed-db')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_executions',
        },
        (payload) => {
          console.log('ExecutionFeed: New execution from database:', payload);
          
          const exec = payload.new as any;
          const newExecution: ExecutionFeedItem = {
            id: exec.execution_id,
            executionId: exec.execution_id,
            chain: exec.chain,
            side: exec.side as 'BUY' | 'SELL',
            asset: 'QC',
            qtyFilled: exec.qty_filled,
            avgPrice: exec.avg_price,
            captureBps: exec.capture_bps,
            timestamp: new Date(exec.timestamp),
          };
          
          setExecutions(prev => [newExecution, ...prev].slice(0, maxItems));
          
          if (showSound) {
            playExecutionSound(exec.side === 'BUY');
          }
        }
      )
      .subscribe();

    // Also subscribe to broadcast notifications from execution engine
    const broadcastChannel = supabase
      .channel('notifications')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill') {
          console.log('ExecutionFeed: Broadcast execution:', notification);
          const d = notification.data;
          const newExecution: ExecutionFeedItem = {
            id: d.execution_id,
            executionId: d.execution_id,
            chain: d.chain,
            side: d.side as 'BUY' | 'SELL',
            asset: d.asset || 'QC',
            qtyFilled: d.qty_filled,
            avgPrice: d.avg_price,
            captureBps: d.capture_bps,
            timestamp: new Date(notification.timestamp || Date.now()),
          };
          setExecutions(prev => [newExecution, ...prev].slice(0, maxItems));
          if (showSound) playExecutionSound(d.side === 'BUY');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [maxItems, showSound]);

  const playExecutionSound = (isBuy: boolean) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different pitches for buy vs sell
      oscillator.frequency.value = isBuy ? 880 : 660;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('Could not play execution sound:', e);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="font-semibold text-lg">Live Execution Feed</h3>
        {executions.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {executions.length} {executions.length === 1 ? 'trade' : 'trades'}
          </Badge>
        )}
      </div>

      <ScrollArea className="h-[500px] pr-4">
        {executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Zap className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Waiting for trade executions...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((execution, index) => (
              <Card 
                key={execution.id}
                className="p-3 animate-fade-in border-l-4 hover:shadow-md transition-shadow"
                style={{
                  borderLeftColor: execution.side === 'BUY' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))',
                  animationDelay: `${index * 0.05}s`
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-1 ${execution.side === 'BUY' ? 'text-chart-2' : 'text-chart-1'}`}>
                      {execution.side === 'BUY' ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={execution.side === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {execution.side}
                        </Badge>
                        <span className="text-sm font-medium">
                          {execution.qtyFilled.toFixed(4)} {execution.asset}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {execution.chain.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>@ ${execution.avgPrice.toFixed(2)}</span>
                        <span className={execution.captureBps >= 0 ? 'text-chart-2' : 'text-chart-1'}>
                          {execution.captureBps >= 0 ? '+' : ''}{execution.captureBps.toFixed(1)} bps
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(execution.timestamp)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
