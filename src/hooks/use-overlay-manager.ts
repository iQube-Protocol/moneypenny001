import { create } from 'zustand';

export type OverlayType = 'portfolio' | 'intent-capture' | 'live-insights' | 'profile' | 'metavatar' | 'research' | null;

interface OverlayState {
  activeOverlay: OverlayType;
  openOverlay: (overlay: OverlayType) => void;
  closeOverlay: () => void;
}

export const useOverlayManager = create<OverlayState>((set) => ({
  activeOverlay: null,
  openOverlay: (overlay) => set({ activeOverlay: overlay }),
  closeOverlay: () => set({ activeOverlay: null }),
}));
