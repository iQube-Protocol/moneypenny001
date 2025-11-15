import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, BellOff, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { useState } from 'react';

export function NotificationStatus() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isConnected, connect, disconnect } = useRealtimeNotifications(notificationsEnabled);

  const toggleNotifications = () => {
    if (notificationsEnabled) {
      disconnect();
      setNotificationsEnabled(false);
    } else {
      setNotificationsEnabled(true);
      connect();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {notificationsEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {isConnected && notificationsEnabled && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Real-time Notifications</h3>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {notificationsEnabled ? (
              <p>
                You'll receive instant notifications for:
              </p>
            ) : (
              <p>
                Notifications are currently disabled
              </p>
            )}
          </div>

          {notificationsEnabled && (
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• X402 claim settlements</li>
              <li>• Custody account changes</li>
              <li>• FIO payment requests</li>
              <li>• Execution fills</li>
            </ul>
          )}

          <Button
            onClick={toggleNotifications}
            variant={notificationsEnabled ? 'destructive' : 'default'}
            className="w-full"
            size="sm"
          >
            {notificationsEnabled ? (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Disable Notifications
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
