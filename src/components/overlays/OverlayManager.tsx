import { Sheet, SheetContent, SheetOverlay } from "@/components/ui/sheet";
import { useOverlayManager } from "@/hooks/use-overlay-manager";
import { PortfolioOverlay } from "./PortfolioOverlay";
import { IntentCaptureOverlay } from "./IntentCaptureOverlay";
import { LiveInsightsOverlay } from "./LiveInsightsOverlay";
import { ProfileOverlay } from "./ProfileOverlay";

export function OverlayManager() {
  const { activeOverlay, closeOverlay } = useOverlayManager();

  const renderOverlay = () => {
    switch (activeOverlay) {
      case 'portfolio':
        return <PortfolioOverlay />;
      case 'intent-capture':
        return <IntentCaptureOverlay />;
      case 'live-insights':
        return <LiveInsightsOverlay />;
      case 'profile':
        return <ProfileOverlay />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={!!activeOverlay} onOpenChange={(open) => !open && closeOverlay()}>
      <SheetOverlay className="bg-background/80 backdrop-blur-sm" />
      <SheetContent 
        side="left" 
        className="w-[calc(100vw-14rem)] left-14 h-[600px] top-auto bottom-[4.5rem] glass-card border-r border-primary/20 p-6"
      >
        {renderOverlay()}
      </SheetContent>
    </Sheet>
  );
}
