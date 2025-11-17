import { Card } from "@/components/ui/card";

interface InventoryGaugeProps {
  inventoryMin: number;
  inventoryMax: number;
  currentInventory: number;
  workingQc: number;
}

export function InventoryGauge({ 
  inventoryMin, 
  inventoryMax, 
  currentInventory,
  workingQc 
}: InventoryGaugeProps) {
  const range = inventoryMax - inventoryMin;
  const minPercent = 0;
  const maxPercent = 100;
  const currentPercent = range > 0 
    ? ((currentInventory - inventoryMin) / range) * 100 
    : 50;
  const workingPercent = range > 0
    ? ((workingQc - inventoryMin) / range) * 100
    : 50;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Inventory Band</span>
        <span className="text-xs font-mono text-muted-foreground">
          {inventoryMin.toFixed(0)} - {inventoryMax.toFixed(0)} Q¢
        </span>
      </div>
      
      <div className="relative h-4 bg-secondary rounded-full overflow-hidden">
        {/* Inventory band (the allowed range) */}
        <div 
          className="absolute top-0 bottom-0 bg-secondary-foreground/20"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        
        {/* Used inventory fill (turquoise) */}
        <div 
          className="absolute top-0 bottom-0 bg-accent/40 transition-all duration-300"
          style={{ left: '0%', width: `${currentPercent}%` }}
        />
        
        {/* Current inventory position needle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-primary z-10 transition-all duration-300"
          style={{ left: `${currentPercent}%` }}
        />
        
        {/* Working Q¢ marker */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-accent z-10 transition-all duration-300"
          style={{ left: `${workingPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-mono">Current: {currentInventory.toFixed(0)} Q¢</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-mono">Working: {workingQc.toFixed(0)} Q¢</span>
        </div>
      </div>
    </div>
  );
}
