import { WalletDrawer } from "@/components/WalletDrawer";
import { MoneyPennyChat } from "@/components/MoneyPennyChat";
import { OverlayManager } from "@/components/overlays/OverlayManager";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LiveMarketFeed } from "@/components/LiveMarketFeed";
import { useOverlayManager } from "@/hooks/use-overlay-manager";
import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export default function Console() {
  const {
    openOverlay
  } = useOverlayManager();
  const [currentStrategy, setCurrentStrategy] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("chat");
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
              <ToggleGroup type="single" value={activeTab} onValueChange={(value) => value && setActiveTab(value)} size="xs">
                <ToggleGroupItem value="chat" aria-label="Chat">
                  Chat
                </ToggleGroupItem>
                <ToggleGroupItem value="market" aria-label="Feed">
                  Feed
                </ToggleGroupItem>
              </ToggleGroup>
              <WalletDrawer />
            </div>
          </div>
        </div>
      </header>

      {/* Main Console - Aigent MoneyPenny */}
      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} className="space-y-6">
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