/**
 * Wallet Adapter Interface
 * Unified interface for all wallet types (X402, MetaMask, UniSat, Phantom)
 */

// Type declarations for wallet providers
declare global {
  interface Window {
    ethereum?: any;
    unisat?: any;
    phantom?: {
      solana?: any;
    };
  }
}

export type WalletKind = "x402" | "metamask" | "unisat" | "phantom";

export interface WalletState {
  kind: WalletKind;
  connected: boolean;
  address: string | null;
  chainId?: string;
}

export interface WalletBalance {
  asset: string;
  amount: string;
  usdValue?: number;
}

export interface WalletAdapter {
  kind: WalletKind;
  address?: string;
  
  // Connection lifecycle
  connect(): Promise<WalletState>;
  disconnect(): Promise<void>;
  getState(): Promise<WalletState>;
  
  // Transactions
  signTx(tx: any): Promise<string>;
  sendTx(tx: any): Promise<string>;
  
  // Balances
  getBalances(): Promise<WalletBalance[]>;
  
  // Events
  on(event: 'accountsChanged' | 'chainChanged' | 'disconnect', handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

// Wallet detection utilities
export function detectWallets(): WalletKind[] {
  const detected: WalletKind[] = [];
  
  if (typeof window !== 'undefined') {
    if (window.ethereum) detected.push('metamask');
    if ((window as any).unisat) detected.push('unisat');
    if ((window as any).phantom?.solana) detected.push('phantom');
  }
  
  return detected;
}
