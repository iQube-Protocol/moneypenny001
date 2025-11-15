import { useEffect } from 'react';

export function MetaVatarOverlay() {
  useEffect(() => {
    const container = document.getElementById('did-agent-container');
    if (!container) {
      console.error('[MetaVatar] Container not found');
      return;
    }

    // Use iframe directly (more reliable than script tag)
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      mode: 'embed',
      'client-key': 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2',
      'agent-id': 'v2_agt_dY78cKv2',
    });
    iframe.src = `https://agent.d-id.com/v2/index.html?${params.toString()}`;
    iframe.allow = 'microphone; camera; autoplay';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold neon-text">MetaVatar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered avatar interface
        </p>
      </div>
      
      <div className="flex-1 relative min-h-[500px]">
        <div id="did-agent-container" className="absolute inset-0 rounded-lg bg-card/50 overflow-hidden" />
      </div>
    </div>
  );
}
