import { Button } from "@/components/ui/button";
import { WalletDrawer } from "@/components/WalletDrawer";
import { MoneyPennyChat } from "@/components/MoneyPennyChat";
import { OverlayManager } from "@/components/overlays/OverlayManager";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Link } from "react-router-dom";

export default function Console() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border glass-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold neon-text">Console</h1>
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
        <MoneyPennyChat />
      </main>

      {/* Overlay Manager */}
      <OverlayManager />
    </div>
  );
}
