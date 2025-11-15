import { useEffect } from 'react';

export function MetaVatarOverlay() {
  useEffect(() => {
    console.log('[MetaVatar] Initializing D-ID agent...');

    // Ensure container exists
    const container = document.getElementById('did-agent-container');
    if (!container) {
      console.error('[MetaVatar] did-agent-container not found');
      return;
    }

    // Remove any existing D-ID script/iframe
    const existingScript = document.querySelector('script[data-name="did-agent"]');
    if (existingScript) {
      console.log('[MetaVatar] Removing existing script');
      existingScript.remove();
    }
    const existingIframe = container.querySelector('iframe[data-name="did-agent-iframe"]');
    if (existingIframe) existingIframe.remove();

    // Create and append new script to document body
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://agent.d-id.com/v2/index.js';
    script.setAttribute('data-mode', 'embed');
    script.setAttribute('data-client-key', 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2');
    script.setAttribute('data-agent-id', 'v2_agt_dY78cKv2');
    script.setAttribute('data-name', 'did-agent');
    script.setAttribute('data-monitor', 'false');
    script.setAttribute('data-container', '#did-agent-container');
    (script as any).crossOrigin = 'anonymous';

    let fallbackTimer: number | undefined;

    script.onload = () => {
      console.log('[MetaVatar] D-ID script loaded successfully');
      // If the widget hasn't mounted in time, fallback to iframe embed to avoid ORB issues
      fallbackTimer = window.setTimeout(() => {
        if (container.childElementCount === 0) {
          console.warn('[MetaVatar] Widget not mounted yet. Falling back to iframe embed (avoids OpaqueResponseBlocking).');
          const iframe = document.createElement('iframe');
          const params = new URLSearchParams({
            mode: 'embed',
            'client-key': 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2',
            'agent-id': 'v2_agt_dY78cKv2',
          });
          iframe.src = `https://agent.d-id.com/v2/index.html?${params.toString()}`;
          iframe.setAttribute('data-name', 'did-agent-iframe');
          iframe.allow = 'microphone; camera; autoplay';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = '0';
          container.appendChild(iframe);
        }
      }, 2500);
    };

    script.onerror = (error) => {
      console.error('[MetaVatar] Failed to load D-ID script:', error);
      // immediate fallback
      const iframe = document.createElement('iframe');
      const params = new URLSearchParams({
        mode: 'embed',
        'client-key': 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2',
        'agent-id': 'v2_agt_dY78cKv2',
      });
      iframe.src = `https://agent.d-id.com/v2/index.html?${params.toString()}`;
      iframe.setAttribute('data-name', 'did-agent-iframe');
      iframe.allow = 'microphone; camera; autoplay';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      container.appendChild(iframe);
    };

    document.body.appendChild(script);
    console.log('[MetaVatar] D-ID script appended to body');

    return () => {
      console.log('[MetaVatar] Cleaning up D-ID script');
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      const scriptToRemove = document.querySelector('script[data-name="did-agent"]');
      if (scriptToRemove) scriptToRemove.remove();
      const iframeToRemove = container.querySelector('iframe[data-name="did-agent-iframe"]');
      if (iframeToRemove) iframeToRemove.remove();
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
