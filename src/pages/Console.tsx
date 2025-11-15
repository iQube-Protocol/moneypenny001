import { Button } from "@/components/ui/button";
import { WalletDrawer } from "@/components/WalletDrawer";
import { MoneyPennyChat } from "@/components/MoneyPennyChat";
import { OverlayManager } from "@/components/overlays/OverlayManager";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LiveMarketFeed } from "@/components/LiveMarketFeed";
import { useOverlayManager } from "@/hooks/use-overlay-manager";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function Console() {
  const {
    openOverlay
  } = useOverlayManager();
  const [currentStrategy, setCurrentStrategy] = useState<any>(null);
  const handleStrategyUpdate = (strategy: any) => {
    setCurrentStrategy(strategy);
    // Auto-open intent overlay with the strategy
    setTimeout(() => openOverlay('intent-capture'), 300);
  };
  return <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-bold">
              <span className="text-success mr-3">MoneyPenny</span>
              <span className="neon-text">Q¢ HFT Aigent</span>
                
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time high-frequency trading agent powered by Qripto
              </p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <Link to="/profile">
                <Button variant="outline" size="sm">Profile</Button>
              </Link>
              <WalletDrawer />
            </div>
          </div>
        </div>
      </header>

      {/* Main Console - Aigent MoneyPenny */}
      <main className="container mx-auto px-6 py-6">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
            <TabsTrigger value="market">Market Feed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="space-y-6">
            <MoneyPennyChat />
          </TabsContent>
          
          <TabsContent value="market" className="space-y-6">
            <LiveMarketFeed />
          </TabsContent>
        </Tabs>
      </main>

      {/* Overlay Manager */}
      <OverlayManager />
    </div>;
}