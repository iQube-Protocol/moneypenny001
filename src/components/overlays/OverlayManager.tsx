import { Sheet, SheetContent, SheetOverlay } from "@/components/ui/sheet";
import { useOverlayManager } from "@/hooks/use-overlay-manager";
import { PortfolioOverlay } from "./PortfolioOverlay";
import { IntentCaptureOverlay } from "./IntentCaptureOverlay";
import { LiveInsightsOverlay } from "./LiveInsightsOverlay";
import { ProfileOverlay } from "./ProfileOverlay";
import { MetaVatarOverlay } from "./MetaVatarOverlay";
import { ResearchOverlay } from "./ResearchOverlay";

interface OverlayManagerProps {
  currentStrategy?: any;
  onStrategyChange?: (strategy: any) => void;
}

export function OverlayManager({ currentStrategy, onStrategyChange }: OverlayManagerProps) {
  const { activeOverlay, closeOverlay, openOverlay } = useOverlayManager();

  const renderOverlay = () => {
    switch (activeOverlay) {
      case 'portfolio':
        return <PortfolioOverlay />;
      case 'intent-capture':
        return <IntentCaptureOverlay suggestedStrategy={currentStrategy} />;
      case 'live-insights':
        return <LiveInsightsOverlay />;
      case 'profile':
        return <ProfileOverlay />;
      case 'metavatar':
        return <MetaVatarOverlay />;
      case 'research':
        return <ResearchOverlay onStrategyUpdate={(strategy) => {
          if (onStrategyChange) {
            onStrategyChange(strategy);
          }
          setTimeout(() => openOverlay('intent-capture'), 300);
        }} />;
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
