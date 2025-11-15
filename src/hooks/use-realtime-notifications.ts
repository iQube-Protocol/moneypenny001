import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getMoneyPenny } from '@/lib/aigent/moneypenny/client';

export interface NotificationEvent {
  type: 'x402_claim' | 'x402_custody' | 'fio_payment' | 'execution_fill';
  action: 'created' | 'updated' | 'settled' | 'closed' | 'paid' | 'rejected';
  data: any;
  timestamp: string;
}

export function useRealtimeNotifications(enabled: boolean = true) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const handleNotification = (event: NotificationEvent) => {
    console.log('Notification received:', event);

    // Show toast based on event type
    switch (event.type) {
      case 'x402_claim':
        if (event.action === 'created') {
          toast({
            title: 'X402 Claim Created',
            description: `New claim for ${event.data.amount} ${event.data.asset}`,
          });
        } else if (event.action === 'settled') {
          toast({
            title: 'X402 Claim Settled',
            description: event.data.tx_hash 
              ? `Settled: ${event.data.tx_hash.slice(0, 10)}...`
              : 'Claim has been settled',
          });
        }
        break;

      case 'x402_custody':
        if (event.action === 'created') {
          toast({
            title: 'Custody Opened',
            description: `Escrow opened for ${event.data.amount} ${event.data.asset}`,
          });
        } else if (event.action === 'closed') {
          toast({
            title: 'Custody Closed',
            description: `Escrow ${event.data.escrow_id.slice(0, 8)}... closed`,
          });
        }
        break;

      case 'fio_payment':
        if (event.action === 'created') {
          toast({
            title: 'Payment Request Received',
            description: `${event.data.from_fio} requests ${event.data.amount} ${event.data.asset}`,
          });
        } else if (event.action === 'paid') {
          toast({
            title: 'Payment Completed',
            description: `Payment to ${event.data.to_fio} completed`,
          });
        }
        break;

      case 'execution_fill':
        toast({
          title: 'Order Filled',
          description: `${event.data.qty_filled} ${event.data.asset} filled on ${event.data.chain}`,
        });
        break;
    }
  };

  const connect = () => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Use project-specific WebSocket URL
      const wsUrl = 'wss://csmytlhrdcnjzqrmimnw.supabase.co/realtime/v1/websocket';
      console.log('Connecting to WebSocket:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Subscribe to notification channels
        const subscribeMessage = {
          type: 'subscribe',
          channels: ['x402_notifications', 'fio_notifications', 'execution_notifications'],
        };
        wsRef.current?.send(JSON.stringify(subscribeMessage));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);

          if (data.type === 'notification') {
            handleNotification(data.event as NotificationEvent);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to real-time notifications',
          variant: 'destructive',
        });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Attempt reconnection with exponential backoff
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  // Simulate notifications for demo purposes (remove in production)
  useEffect(() => {
    if (!enabled) return;

    // Simulate periodic events for demonstration
    const simulateInterval = setInterval(() => {
      const events: NotificationEvent[] = [
        {
          type: 'x402_claim',
          action: 'settled',
          data: { amount: 0.5, asset: 'ETH', tx_hash: '0x' + Math.random().toString(36).substring(7) },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'fio_payment',
          action: 'created',
          data: { from_fio: 'user@aigent', amount: 100, asset: 'USDC' },
          timestamp: new Date().toISOString(),
        },
        {
          type: 'execution_fill',
          action: 'updated',
          data: { qty_filled: 1000, asset: 'QC', chain: 'eth' },
          timestamp: new Date().toISOString(),
        },
      ];

      // Randomly select and trigger an event (10% chance every interval)
      if (Math.random() < 0.1) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        handleNotification(randomEvent);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(simulateInterval);
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]);

  return {
    isConnected,
    connect,
    disconnect,
  };
}
