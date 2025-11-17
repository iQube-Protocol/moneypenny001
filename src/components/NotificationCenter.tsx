import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Settings,
  X,
  Activity
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'execution' | 'price' | 'risk' | 'fio' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface NotificationSettings {
  executions: boolean;
  priceAlerts: boolean;
  riskAlerts: boolean;
  fioRequests: boolean;
  system: boolean;
  sound: boolean;
}

export const NotificationCenter = () => {
  const moneyPenny = useMoneyPenny();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    executions: true,
    priceAlerts: true,
    riskAlerts: true,
    fioRequests: true,
    system: true,
    sound: false,
  });
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastExecutionCheckRef = useRef<string | null>(null);
  const lastPriceCheckRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Start monitoring
    startMonitoring();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [settings]);

  useEffect(() => {
    // Subscribe to real-time execution fill notifications
    const channel = supabase
      .channel('notifications')
      .on('broadcast', { event: 'notification' }, (payload) => {
        const notification = payload.payload as any;
        if (notification.type === 'execution_fill' && settings.executions) {
          console.log('Real-time execution fill notification:', notification);
          
          const newNotification: Notification = {
            id: `exec-${notification.data.execution_id}-${Date.now()}`,
            type: 'execution',
            title: 'Trade Filled',
            message: `${notification.data.qty_filled} ${notification.data.asset} filled at $${notification.data.avg_price.toFixed(2)} on ${notification.data.chain}. Capture: ${notification.data.capture_bps.toFixed(1)} bps`,
            severity: 'success',
            timestamp: new Date(notification.timestamp),
            read: false,
            data: notification.data,
          };
          
          addNotification(newNotification);
          showToast(newNotification.title, newNotification.message, 'default');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings.executions]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const startMonitoring = () => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // Initial check
    checkForUpdates();
    
    // Poll every 10 seconds
    pollIntervalRef.current = setInterval(checkForUpdates, 10000);
  };

  const checkForUpdates = async () => {
    try {
      // Check executions
      if (settings.executions) {
        await checkExecutions();
      }
      
      // Check price alerts
      if (settings.priceAlerts) {
        await checkPriceAlerts();
      }
      
      // Check FIO requests
      if (settings.fioRequests) {
        await checkFIORequests();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const checkExecutions = async () => {
    try {
      const executions = await moneyPenny.execution.listExecutions(10);
      
      if (executions.length > 0) {
        const latestExecution = executions[0];
        
        // Check if this is a new execution
        if (lastExecutionCheckRef.current !== latestExecution.execution_id) {
          lastExecutionCheckRef.current = latestExecution.execution_id;
          
          // Don't notify on first load
          if (notifications.length > 0 || lastExecutionCheckRef.current) {
            const notification: Notification = {
              id: `exec-${latestExecution.execution_id}`,
              type: 'execution',
              title: 'Trade Executed',
              message: `${latestExecution.side} ${latestExecution.qty_filled.toFixed(4)} on ${latestExecution.chain.toUpperCase()}`,
              severity: latestExecution.status === 'confirmed' ? 'success' : 'info',
              timestamp: new Date(latestExecution.timestamp),
              read: false,
              data: latestExecution,
            };
            
            addNotification(notification);
            
            showToast(
              'Trade Executed',
              `${latestExecution.side} ${latestExecution.qty_filled.toFixed(4)} on ${latestExecution.chain.toUpperCase()}. Capture: ${latestExecution.capture_bps.toFixed(2)} bps`,
              latestExecution.capture_bps > 0 ? 'default' : 'destructive'
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking executions:', error);
    }
  };

  const checkPriceAlerts = async () => {
    try {
      const stats = await moneyPenny.execution.getStats();
      
      // Check if average capture has changed significantly
      if (stats.avg_capture_bps) {
        const prevAvg = lastPriceCheckRef.current['avg_capture'] || stats.avg_capture_bps;
        const change = Math.abs(stats.avg_capture_bps - prevAvg);
        
        // Alert if change is more than 5 bps
        if (change > 5 && lastPriceCheckRef.current['avg_capture'] !== undefined) {
          const isPositive = stats.avg_capture_bps > prevAvg;
          
          const notification: Notification = {
            id: `price-${Date.now()}`,
            type: 'price',
            title: isPositive ? 'Positive Price Movement' : 'Negative Price Movement',
            message: `Average capture ${isPositive ? 'increased' : 'decreased'} by ${change.toFixed(2)} bps`,
            severity: isPositive ? 'success' : 'warning',
            timestamp: new Date(),
            read: false,
          };
          
          addNotification(notification);
          showToast(notification.title, notification.message, isPositive ? 'default' : 'destructive');
        }
        
        lastPriceCheckRef.current['avg_capture'] = stats.avg_capture_bps;
      }
    } catch (error) {
      console.error('Error checking price alerts:', error);
    }
  };

  const checkFIORequests = async () => {
    try {
      const requests = await moneyPenny.fio.listPaymentRequests('received');
      
      // Check for pending requests
      const pendingRequests = requests.filter((r: any) => r.status === 'pending');
      
      if (pendingRequests.length > 0) {
        // Only notify about the most recent one to avoid spam
        const latestRequest = pendingRequests[0];
        const notificationId = `fio-${latestRequest.request_id}`;
        
        // Check if we've already notified about this
        const alreadyNotified = notifications.some(n => n.id === notificationId);
        
        if (!alreadyNotified) {
          const notification: Notification = {
            id: notificationId,
            type: 'fio',
            title: 'Payment Request Received',
            message: `${latestRequest.from_fio} requests ${latestRequest.amount} ${latestRequest.asset}`,
            severity: 'info',
            timestamp: new Date(latestRequest.created_at),
            read: false,
            data: latestRequest,
          };
          
          addNotification(notification);
          showToast(notification.title, notification.message);
        }
      }
    } catch (error) {
      console.error('Error checking FIO requests:', error);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First tone (higher pitch)
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      oscillator1.frequency.value = 800;
      oscillator1.type = 'sine';
      
      gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.3);
      
      // Second tone (slightly lower pitch for pleasant ding-ding)
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.value = 600;
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator2.start(audioContext.currentTime + 0.15);
      oscillator2.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Could not play notification sound:', e);
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 100)); // Keep last 100
    
    if (settings.sound) {
      playNotificationSound();
    }
  };

  const showToast = (title: string, message: string, variant: 'default' | 'destructive' = 'default') => {
    toast({
      title,
      description: message,
      variant,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type'], severity: Notification['severity']) => {
    if (type === 'execution') {
      return severity === 'success' ? 
        <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
        <Activity className="w-4 h-4 text-blue-500" />;
    }
    if (type === 'price') {
      return severity === 'success' ? 
        <TrendingUp className="w-4 h-4 text-green-500" /> : 
        <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    if (type === 'risk') {
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
    if (type === 'fio') {
      return <Wallet className="w-4 h-4 text-purple-500" />;
    }
    return <Bell className="w-4 h-4" />;
  };

  const filterByType = (type: string) => {
    if (type === 'all') return notifications;
    return notifications.filter(n => n.type === type);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <BellRing className="w-5 h-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Real-time alerts for trades, prices, and payments
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="all" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="execution">
              <Activity className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="price">
              <TrendingUp className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="risk">
              <AlertTriangle className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="fio">
              <Wallet className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAll}
              disabled={notifications.length === 0}
            >
              Clear All
            </Button>
          </div>

          {['all', 'execution', 'price', 'risk', 'fio'].map(type => (
            <TabsContent key={type} value={type} className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {filterByType(type).length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No notifications</p>
                    </div>
                  ) : (
                    filterByType(type).map(notification => (
                      <Card 
                        key={notification.id} 
                        className={`p-4 backdrop-blur-sm bg-background/40 border-border/50 ${!notification.read ? 'border-primary/30 bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {getIcon(notification.type, notification.severity)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm text-foreground">{notification.title}</h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mt-1 text-foreground/70 hover:text-foreground"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            <p className="text-sm text-foreground/80 mt-1">
                              {notification.message}
                            </p>
                            
                            <p className="text-xs text-foreground/60 mt-2">
                              {notification.timestamp.toLocaleTimeString()}
                            </p>
                            
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-xs text-primary hover:text-primary/80"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Notification Settings
            </h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="executions">Trade Executions</Label>
              <Switch
                id="executions"
                checked={settings.executions}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, executions: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="priceAlerts">Price Alerts</Label>
              <Switch
                id="priceAlerts"
                checked={settings.priceAlerts}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, priceAlerts: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="riskAlerts">Risk Alerts</Label>
              <Switch
                id="riskAlerts"
                checked={settings.riskAlerts}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, riskAlerts: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="fioRequests">FIO Requests</Label>
              <Switch
                id="fioRequests"
                checked={settings.fioRequests}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, fioRequests: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="sound">Sound</Label>
              <Switch
                id="sound"
                checked={settings.sound}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sound: checked }))}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
