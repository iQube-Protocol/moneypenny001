/**
 * Phantom Wallet Adapter
 * Solana (SOL) support
 * Uses Phantom browser extension API
 */

import { WalletAdapter, WalletKind, WalletState, WalletBalance } from '../../core/adapters/wallet';

export class PhantomAdapter implements WalletAdapter {
  kind: WalletKind = 'phantom';
  address?: string;
  
  private provider: any = null;

  async connect(): Promise<WalletState> {
    if (typeof window === 'undefined' || !(window as any).phantom?.solana) {
      throw new Error('Phantom wallet not installed. Please install Phantom extension.');
    }

    this.provider = (window as any).phantom.solana;

    if (!this.provider.isPhantom) {
      throw new Error('Invalid Phantom provider');
    }

    try {
      // Connect to Phantom
      const response = await this.provider.connect();

      this.address = response.publicKey.toString();

      return {
        kind: 'phantom',
        connected: true,
        address: this.address,
        chainId: 'solana', // Solana mainnet
      };
    } catch (error: any) {
      console.error('Phantom connection error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected connection request');
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (error) {
        console.error('Phantom disconnect error:', error);
      }
    }
    
    this.provider = null;
    this.address = undefined;
  }

  async getState(): Promise<WalletState> {
    if (!this.provider) {
      return {
        kind: 'phantom',
        connected: false,
        address: null,
      };
    }

    try {
      const isConnected = this.provider.isConnected;
      const address = this.provider.publicKey?.toString() || null;
      
      this.address = address || undefined;

      return {
        kind: 'phantom',
        connected: isConnected,
        address: address,
        chainId: 'solana',
      };
    } catch (error) {
      console.error('Phantom state error:', error);
      return {
        kind: 'phantom',
        connected: false,
        address: null,
      };
    }
  }

  async signTx(tx: any): Promise<string> {
    if (!this.provider) {
      throw new Error('Phantom not connected');
    }

    try {
      // Sign transaction (returns signed transaction)
      const signedTx = await this.provider.signTransaction(tx);
      
      // Return signature
      return signedTx.signature?.toString() || '';
    } catch (error: any) {
      console.error('Phantom sign error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw error;
    }
  }

  async sendTx(tx: any): Promise<string> {
    if (!this.provider) {
      throw new Error('Phantom not connected');
    }

    try {
      // Sign and send transaction
      const { signature } = await this.provider.signAndSendTransaction(tx);
      return signature;
    } catch (error: any) {
      console.error('Phantom send error:', error);
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
      // Note: Getting SOL balance requires RPC connection
      // This is a simplified version - in production, you'd use @solana/web3.js
      
      // For now, return placeholder
      // In real implementation, would use:
      // const connection = new Connection(clusterApiUrl('mainnet-beta'));
      // const balance = await connection.getBalance(publicKey);
      
      return [
        {
          asset: 'SOL',
          amount: '0.00', // Placeholder - requires RPC
        },
      ];
    } catch (error) {
      console.error('Phantom balance error:', error);
      return [];
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.provider) return;
    this.provider.on(event, handler);
  }

  off(event: string, handler: (data: any) => void): void {
    if (!this.provider) return;
    this.provider.off(event, handler);
  }

  // Phantom-specific methods

  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    if (!this.provider) {
      throw new Error('Phantom not connected');
    }

    try {
      const encodedMessage = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

      const { signature } = await this.provider.signMessage(encodedMessage, 'utf8');

      return {
        signature,
        publicKey: this.provider.publicKey.toString(),
      };
    } catch (error: any) {
      console.error('Phantom sign message error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected message signature');
      }
      throw error;
    }
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Phantom not connected');
    }

    try {
      const signedTxs = await this.provider.signAllTransactions(transactions);
      return signedTxs;
    } catch (error: any) {
      console.error('Phantom sign all error:', error);
      if (error.code === 4001) {
        throw new Error('User rejected transaction signing');
      }
      throw error;
    }
  }

  getPublicKey(): string | null {
    if (!this.provider || !this.provider.publicKey) {
      return null;
    }

    return this.provider.publicKey.toString();
  }
}
