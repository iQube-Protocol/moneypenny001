/**
 * UniSat Wallet Adapter
 * Bitcoin (BTC) support
 * Uses UniSat browser extension API
 */

import { WalletAdapter, WalletKind, WalletState, WalletBalance } from '../../core/adapters/wallet';

export class UniSatAdapter implements WalletAdapter {
  kind: WalletKind = 'unisat';
  address?: string;
  
  private provider: any = null;

  async connect(): Promise<WalletState> {
    if (typeof window === 'undefined' || !(window as any).unisat) {
      throw new Error('UniSat wallet not installed. Please install UniSat extension.');
    }

    this.provider = (window as any).unisat;

    try {
      // Request accounts
      const accounts = await this.provider.requestAccounts();

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.address = accounts[0];

      return {
        kind: 'unisat',
        connected: true,
        address: this.address,
        chainId: 'bitcoin', // BTC mainnet
      };
    } catch (error: any) {
      console.error('UniSat connection error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected connection request');
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // UniSat doesn't have explicit disconnect
    this.provider = null;
    this.address = undefined;
  }

  async getState(): Promise<WalletState> {
    if (!this.provider) {
      return {
        kind: 'unisat',
        connected: false,
        address: null,
      };
    }

    try {
      const accounts = await this.provider.getAccounts();
      this.address = accounts[0] || undefined;

      return {
        kind: 'unisat',
        connected: accounts.length > 0,
        address: accounts[0] || null,
        chainId: 'bitcoin',
      };
    } catch (error) {
      console.error('UniSat state error:', error);
      return {
        kind: 'unisat',
        connected: false,
        address: null,
      };
    }
  }

  async signTx(tx: any): Promise<string> {
    if (!this.provider) {
      throw new Error('UniSat not connected');
    }

    try {
      // UniSat uses PSBT (Partially Signed Bitcoin Transaction) format
      const signedPsbt = await this.provider.signPsbt(tx.psbt, {
        autoFinalized: tx.autoFinalized !== false,
      });
      return signedPsbt;
    } catch (error: any) {
      console.error('UniSat sign error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw error;
    }
  }

  async sendTx(tx: any): Promise<string> {
    if (!this.provider) {
      throw new Error('UniSat not connected');
    }

    try {
      // Push PSBT to network
      const txid = await this.provider.pushPsbt(tx.psbt);
      return txid;
    } catch (error: any) {
      console.error('UniSat send error:', error);
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
      // Get BTC balance
      const balance = await this.provider.getBalance();

      // Balance is in satoshis
      const balanceInBtc = balance.confirmed / 1e8;

      return [
        {
          asset: 'BTC',
          amount: balanceInBtc.toFixed(8),
        },
      ];
    } catch (error) {
      console.error('UniSat balance error:', error);
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

  // UniSat-specific methods

  async getNetwork(): Promise<'livenet' | 'testnet'> {
    if (!this.provider) {
      throw new Error('UniSat not connected');
    }

    try {
      const network = await this.provider.getNetwork();
      return network;
    } catch (error) {
      console.error('UniSat network error:', error);
      return 'livenet';
    }
  }

  async switchNetwork(network: 'livenet' | 'testnet'): Promise<void> {
    if (!this.provider) {
      throw new Error('UniSat not connected');
    }

    try {
      await this.provider.switchNetwork(network);
    } catch (error) {
      console.error('UniSat switch network error:', error);
      throw error;
    }
  }

  async getPublicKey(): Promise<string> {
    if (!this.provider) {
      throw new Error('UniSat not connected');
    }

    try {
      const publicKey = await this.provider.getPublicKey();
      return publicKey;
    } catch (error) {
      console.error('UniSat public key error:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('UniSat not connected');
    }

    try {
      const signature = await this.provider.signMessage(message);
      return signature;
    } catch (error: any) {
      console.error('UniSat sign message error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected message signature');
      }
      throw error;
    }
  }
}
