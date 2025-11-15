/**
 * MetaMask Wallet Adapter
 * EVM chains (ETH, ARB, BASE, OP, POLY)
 * Uses EIP-1193 provider API
 */

import { WalletAdapter, WalletKind, WalletState, WalletBalance } from '../../core/adapters/wallet';

export class MetaMaskAdapter implements WalletAdapter {
  kind: WalletKind = 'metamask';
  address?: string;
  
  private provider: any = null;

  async connect(): Promise<WalletState> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask extension.');
    }

    this.provider = window.ethereum;

    try {
      // Request account access (EIP-1193)
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const chainId = await this.provider.request({
        method: 'eth_chainId',
      });

      this.address = accounts[0];

      return {
        kind: 'metamask',
        connected: true,
        address: this.address,
        chainId: chainId,
      };
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected connection request');
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // MetaMask doesn't have a programmatic disconnect
    // Just clear our internal state
    this.provider = null;
    this.address = undefined;
  }

  async getState(): Promise<WalletState> {
    if (!this.provider) {
      return {
        kind: 'metamask',
        connected: false,
        address: null,
      };
    }

    try {
      const accounts = await this.provider.request({
        method: 'eth_accounts',
      });

      const chainId = await this.provider.request({
        method: 'eth_chainId',
      });

      this.address = accounts[0] || undefined;

      return {
        kind: 'metamask',
        connected: accounts.length > 0,
        address: accounts[0] || null,
        chainId: chainId,
      };
    } catch (error) {
      console.error('MetaMask state error:', error);
      return {
        kind: 'metamask',
        connected: false,
        address: null,
      };
    }
  }

  async signTx(tx: any): Promise<string> {
    if (!this.provider) {
      throw new Error('MetaMask not connected');
    }

    try {
      const signature = await this.provider.request({
        method: 'eth_signTransaction',
        params: [tx],
      });
      return signature;
    } catch (error: any) {
      console.error('MetaMask sign error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw error;
    }
  }

  async sendTx(tx: any): Promise<string> {
    if (!this.provider) {
      throw new Error('MetaMask not connected');
    }

    try {
      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [tx],
      });
      return txHash;
    } catch (error: any) {
      console.error('MetaMask send error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected transaction');
      }
      throw error;
    }
  }

  async getBalances(): Promise<WalletBalance[]> {
    if (!this.provider || !this.address) {
      return [];
    }

    try {
      // Get native ETH balance
      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [this.address, 'latest'],
      });

      const balanceInEth = parseInt(balance, 16) / 1e18;

      // Get chain ID to determine asset name
      const chainId = await this.provider.request({
        method: 'eth_chainId',
      });

      const chainIdNum = parseInt(chainId, 16);
      const assetName = this.getAssetNameForChain(chainIdNum);

      return [
        {
          asset: assetName,
          amount: balanceInEth.toFixed(6),
        },
      ];
    } catch (error) {
      console.error('MetaMask balance error:', error);
      return [];
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.provider) return;
    this.provider.on(event, handler);
  }

  off(event: string, handler: (data: any) => void): void {
    if (!this.provider) return;
    this.provider.removeListener(event, handler);
  }

  // Helper to get asset name based on chain ID
  private getAssetNameForChain(chainId: number): string {
    switch (chainId) {
      case 1: return 'ETH';
      case 42161: return 'ETH'; // Arbitrum
      case 8453: return 'ETH'; // Base
      case 10: return 'ETH'; // Optimism
      case 137: return 'MATIC'; // Polygon
      default: return 'ETH';
    }
  }

  // Switch to specific chain
  async switchChain(chainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error('MetaMask not connected');
    }

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If chain not added, try to add it
      if (error.code === 4902) {
        const chainConfig = this.getChainConfig(chainId);
        if (chainConfig) {
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
        }
      } else {
        throw error;
      }
    }
  }

  // Chain configurations for adding networks
  private getChainConfig(chainId: number): any | null {
    const configs: Record<number, any> = {
      42161: {
        chainId: '0xa4b1',
        chainName: 'Arbitrum One',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io'],
      },
      8453: {
        chainId: '0x2105',
        chainName: 'Base',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
      },
      10: {
        chainId: '0xa',
        chainName: 'Optimism',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.optimism.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
      },
      137: {
        chainId: '0x89',
        chainName: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com'],
      },
    };

    return configs[chainId] || null;
  }
}
