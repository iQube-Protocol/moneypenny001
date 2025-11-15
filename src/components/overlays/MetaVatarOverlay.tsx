import { useEffect } from 'react';

export function MetaVatarOverlay() {
  useEffect(() => {
    // Remove any existing D-ID script
    const existingScript = document.querySelector('script[data-name="did-agent"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and append new script to document body
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://agent.d-id.com/v2/index.js';
    script.setAttribute('data-mode', 'fabio');
    script.setAttribute('data-client-key', 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2');
    script.setAttribute('data-agent-id', 'v2_agt_dY78cKv2');
    script.setAttribute('data-name', 'did-agent');
    script.setAttribute('data-monitor', 'true');
    script.setAttribute('data-orientation', 'horizontal');
    script.setAttribute('data-position', 'right');

    document.body.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[data-name="did-agent"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold neon-text">MetaVatar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered avatar interface
        </p>
      </div>
      
      <div id="did-agent-container" className="w-full h-[calc(100%-5rem)] min-h-[500px] rounded-lg bg-card/50" />
    </div>
  );
}
