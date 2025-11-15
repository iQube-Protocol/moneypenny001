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
      case 'metavatar':
        return <div className="space-y-4 h-full overflow-y-auto"><h2 className="text-2xl font-bold neon-text">MetaVatar</h2><p className="text-sm text-muted-foreground mt-1">AI-powered avatar interface</p></div>;
      default:
        return null;
    }
  };

  return (
    <Sheet open={!!activeOverlay} onOpenChange={(open) => !open && closeOverlay()}>
      <SheetOverlay className="bg-transparent" />
      <SheetContent 
        side="left" 
        className="!left-14 !right-0 !w-auto !max-w-none h-[600px] top-auto bottom-[4.5rem] bg-background/20 backdrop-blur-sm border-r border-primary/20 p-6"
      >
        {renderOverlay()}
      </SheetContent>
    </Sheet>
  );
}
