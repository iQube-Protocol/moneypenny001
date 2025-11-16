import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MarketFeedStore {
  selectedChains: string[];
  qcentEarned: number;
  setSelectedChains: (chains: string[]) => void;
  addQcentEarned: (amount: number) => void;
  resetQcentEarned: () => void;
}

export const useMarketFeedStore = create<MarketFeedStore>()(
  persist(
    (set) => ({
      selectedChains: ['ethereum', 'arbitrum', 'base', 'polygon', 'solana'],
      qcentEarned: 0,
      setSelectedChains: (chains) => set({ selectedChains: chains }),
      addQcentEarned: (amount) => set((state) => ({ qcentEarned: state.qcentEarned + amount })),
      resetQcentEarned: () => set({ qcentEarned: 0 }),
    }),
    {
      name: 'market-feed-storage',
    }
  )
);
