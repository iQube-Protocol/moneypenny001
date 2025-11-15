import { Button } from "@/components/ui/button";
import { WalletDrawer } from "@/components/WalletDrawer";
import { MoneyPennyChat } from "@/components/MoneyPennyChat";
import { OverlayManager } from "@/components/overlays/OverlayManager";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LivePriceTicker } from "@/components/LivePriceTicker";
import { LiveDexFeed } from "@/components/LiveDexFeed";
import { Link } from "react-router-dom";
export default function Console() {
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
                Real-time trading console powered by AI
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <LivePriceTicker />
          </div>
          <div>
            <LiveDexFeed />
          </div>
        </div>
        
        <MoneyPennyChat />
      </main>

      {/* Overlay Manager */}
      <OverlayManager />
    </div>;
}