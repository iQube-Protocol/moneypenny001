/**
 * useWallet Hook
 * React hook for wallet connection and management
 * Supports all wallet types: X402, MetaMask, UniSat, Phantom
 */

import { useState, useEffect, useCallback } from 'react';
import { useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import {
  WalletAdapter,
  WalletKind,
  WalletState,
  WalletBalance,
  detectWallets,
} from '@/lib/aigent/moneypenny/wallets';
import {
  X402Adapter,
  MetaMaskAdapter,
  UniSatAdapter,
  PhantomAdapter,
} from '@/lib/aigent/moneypenny/wallets';
import { useToast } from '@/hooks/use-toast';

export function useWallet() {
  const client = useMoneyPenny();
  const { toast } = useToast();
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletKind[]>([]);

  // Detect available wallets on mount
  useEffect(() => {
    const detected = detectWallets();
    
    // Always include X402 if A2A is enabled
    if (client.getConfig().enableA2A && !detected.includes('x402')) {
      detected.unshift('x402');
    }
    
    setAvailableWallets(detected);
  }, [client]);

  // Update state when wallet changes
  useEffect(() => {
    const updateState = async () => {
      const adapter = client.getWalletAdapter();
      if (adapter) {
        const state = await adapter.getState();
        setWalletState(state);
        
        if (state.connected) {
          await fetchBalances();
        }
      }
    };

    updateState();
  }, [client]);

  // Connect to wallet
  const connect = useCallback(async (kind: WalletKind) => {
    setLoading(true);

    try {
      let adapter: WalletAdapter;

      switch (kind) {
        case 'x402':
          adapter = new X402Adapter(client.getConfig().apiBaseUrl);
          break;
        case 'metamask':
          adapter = new MetaMaskAdapter();
          break;
        case 'unisat':
          adapter = new UniSatAdapter();
          break;
        case 'phantom':
          adapter = new PhantomAdapter();
          break;
        default:
          throw new Error(`Unsupported wallet: ${kind}`);
      }

      const state = await adapter.connect();
      
      // Set adapter in client
      client.setWalletAdapter(adapter);
      setWalletState(state);

      // Set up event listeners
      adapter.on('accountsChanged', handleAccountsChanged);
      adapter.on('chainChanged', handleChainChanged);
      adapter.on('disconnect', handleDisconnect);

      // Fetch balances
      await fetchBalances();

      toast({
        title: 'Wallet Connected',
        description: `Connected to ${kind.toUpperCase()}`,
      });

      return state;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, toast]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    const adapter = client.getWalletAdapter();
    if (!adapter) return;

    try {
      await adapter.disconnect();
      
      client.setWalletAdapter(null);
      setWalletState(null);
      setBalances([]);

      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected',
      });
    } catch (error: any) {
      console.error('Wallet disconnect error:', error);
      
      toast({
        title: 'Disconnect Failed',
        description: error.message || 'Failed to disconnect wallet',
        variant: 'destructive',
      });
    }
  }, [client, toast]);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    const adapter = client.getWalletAdapter();
    if (!adapter) return;

    try {
      const newBalances = await adapter.getBalances();
      setBalances(newBalances);
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  }, [client]);

  // Sign transaction
  const signTransaction = useCallback(async (tx: any): Promise<string> => {
    const adapter = client.getWalletAdapter();
    if (!adapter) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await adapter.signTx(tx);
      return signature;
    } catch (error: any) {
      console.error('Sign transaction error:', error);
      
      toast({
        title: 'Signature Failed',
        description: error.message || 'Failed to sign transaction',
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [client, toast]);

  // Send transaction
  const sendTransaction = useCallback(async (tx: any): Promise<string> => {
    const adapter = client.getWalletAdapter();
    if (!adapter) {
      throw new Error('No wallet connected');
    }

    try {
      const txHash = await adapter.sendTx(tx);
      
      toast({
        title: 'Transaction Sent',
        description: `Transaction hash: ${txHash.slice(0, 10)}...`,
      });
      
      return txHash;
    } catch (error: any) {
      console.error('Send transaction error:', error);
      
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to send transaction',
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [client, toast]);

  // Event handlers
  const handleAccountsChanged = useCallback((accounts: any) => {
    console.log('Accounts changed:', accounts);
    fetchBalances();
  }, [fetchBalances]);

  const handleChainChanged = useCallback((chainId: any) => {
    console.log('Chain changed:', chainId);
    fetchBalances();
  }, [fetchBalances]);

  const handleDisconnect = useCallback(() => {
    console.log('Wallet disconnected');
    setWalletState(null);
    setBalances([]);
    client.setWalletAdapter(null);
  }, [client]);

  return {
    // State
    walletState,
    balances,
    loading,
    availableWallets,
    isConnected: !!walletState?.connected,
    address: walletState?.address || null,
    walletKind: walletState?.kind || null,
    
    // Actions
    connect,
    disconnect,
    fetchBalances,
    signTransaction,
    sendTransaction,
  };
}
