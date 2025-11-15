/**
 * X402 Wallet Adapter
 * A2A authentication with DiDQube personas and FIO handles
 * Supports 3 settlement types: remote custody, deferred minting, canonical minting
 */

import { WalletAdapter, WalletKind, WalletState, WalletBalance } from '../../core/adapters/wallet';

export class X402Adapter implements WalletAdapter {
  kind: WalletKind = 'x402';
  address?: string;
  
  private apiUrl: string;
  private personaDid: string | null = null;
  private fioHandle: string | null = null;
  private authToken: string | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async connect(): Promise<WalletState> {
    // X402 connection requires persona selection/creation
    // This would typically trigger a persona picker UI
    
    // For now, we'll simulate persona authentication
    try {
      const response = await fetch(`${this.apiUrl}/a2a/auth/session`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.personaDid = data.persona_did;
        this.fioHandle = data.fio_handle;
        this.authToken = data.token;
        this.address = this.fioHandle || this.personaDid;

        return {
          kind: 'x402',
          connected: true,
          address: this.address!,
          chainId: 'multi-chain', // X402 is multi-chain
        };
      }

      throw new Error('No active persona session');
    } catch (error) {
      console.error('X402 connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/a2a/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('X402 disconnect error:', error);
    }

    this.personaDid = null;
    this.fioHandle = null;
    this.authToken = null;
    this.address = undefined;

    this.emit('disconnect', {});
  }

  async getState(): Promise<WalletState> {
    return {
      kind: 'x402',
      connected: !!this.personaDid,
      address: this.address || null,
      chainId: this.personaDid ? 'multi-chain' : undefined,
    };
  }

  async signTx(tx: any): Promise<string> {
    if (!this.personaDid) {
      throw new Error('X402 not connected');
    }

    try {
      const response = await fetch(`${this.apiUrl}/a2a/x402/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          tx,
          persona_did: this.personaDid,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sign failed: ${response.status}`);
      }

      const data = await response.json();
      return data.signature;
    } catch (error) {
      console.error('X402 sign error:', error);
      throw error;
    }
  }

  async sendTx(tx: any): Promise<string> {
    if (!this.personaDid) {
      throw new Error('X402 not connected');
    }

    try {
      const response = await fetch(`${this.apiUrl}/a2a/x402/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          tx,
          persona_did: this.personaDid,
        }),
      });

      if (!response.ok) {
        throw new Error(`Transaction submit failed: ${response.status}`);
      }

      const data = await response.json();
      return data.tx_hash;
    } catch (error) {
      console.error('X402 send error:', error);
      throw error;
    }
  }

  async getBalances(): Promise<WalletBalance[]> {
    if (!this.personaDid) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/a2a/x402/balances?persona=${this.personaDid}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Balance fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data.balances || [];
    } catch (error) {
      console.error('X402 balance error:', error);
      return [];
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.delete(handler);
    }
  }

  private emit(event: string, data: any): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.forEach(handler => handler(data));
    }
  }

  // X402-specific methods
  setPersona(did: string, fioHandle?: string, token?: string): void {
    this.personaDid = did;
    this.fioHandle = fioHandle || null;
    this.authToken = token || null;
    this.address = this.fioHandle || this.personaDid;
    
    this.emit('accountsChanged', { persona: did, fio: fioHandle });
  }

  getPersonaDid(): string | null {
    return this.personaDid;
  }

  getFIOHandle(): string | null {
    return this.fioHandle;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }
}
