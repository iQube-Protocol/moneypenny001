/**
 * Core AgentiQ Client
 * Base class for all thin client agent classes (MoneyPenny, Nakamoto, Kn0w1)
 * 
 * Provides:
 * - Unified auth (A2A DiDQube + wallet fallbacks)
 * - HTTP fetch with automatic auth headers
 * - SSE stream management
 * - Error handling and retry logic
 */

import { QueryClient } from '@tanstack/react-query';
import { AgentiQConfig, StreamOptions, FetchOptions } from './types';
import { WalletAdapter } from './adapters/wallet';

export abstract class AgentiQClient {
  protected config: AgentiQConfig;
  protected queryClient: QueryClient;
  protected authToken: string | null = null;
  protected personaDid: string | null = null;
  protected walletAdapter: WalletAdapter | null = null;

  constructor(config: AgentiQConfig, queryClient: QueryClient) {
    this.config = config;
    this.queryClient = queryClient;
  }

  // Base fetch with automatic auth headers
  protected async fetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Agent-Class': this.config.agentClass,
      ...fetchOptions.headers,
    };

    // Add tenant ID if present
    if (this.config.tenantId) {
      headers['X-Tenant-Id'] = this.config.tenantId;
    }

    // Add authentication headers (unless skipped)
    if (!skipAuth) {
      // A2A authentication (preferred)
      if (this.config.enableA2A && this.personaDid) {
        headers['X-Persona-DID'] = this.personaDid;
        if (this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }
      }
      // Wallet fallback authentication
      else if (this.walletAdapter) {
        const state = await this.walletAdapter.getState();
        if (state.connected && state.address) {
          headers['X-Wallet-Address'] = state.address;
          if (state.chainId) {
            headers['X-Chain-Id'] = state.chainId;
          }
          headers['X-Wallet-Kind'] = this.walletAdapter.kind;
        }
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // SSE stream connection with automatic auth
  protected createEventSource(url: string, options: StreamOptions): EventSource {
    const urlWithAuth = new URL(url);
    
    // Add auth parameters to SSE URL
    if (this.config.enableA2A && this.personaDid) {
      urlWithAuth.searchParams.set('persona', this.personaDid);
    } else if (this.walletAdapter && this.walletAdapter.address) {
      urlWithAuth.searchParams.set('wallet', this.walletAdapter.address);
      urlWithAuth.searchParams.set('wallet_kind', this.walletAdapter.kind);
    }

    const eventSource = new EventSource(urlWithAuth.toString());

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        options.onMessage(data);
      } catch (error) {
        console.error('SSE parse error:', error);
        options.onError?.(error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      options.onError?.(error);
    };

    return eventSource;
  }

  // Getters
  getConfig(): AgentiQConfig {
    return this.config;
  }

  getPersonaDid(): string | null {
    return this.personaDid;
  }

  getWalletAdapter(): WalletAdapter | null {
    return this.walletAdapter;
  }

  isAuthenticated(): boolean {
    return !!(this.personaDid || (this.walletAdapter && this.walletAdapter.address));
  }

  getAuthMode(): 'a2a' | 'wallet' | 'none' {
    if (this.personaDid) return 'a2a';
    if (this.walletAdapter && this.walletAdapter.address) return 'wallet';
    return 'none';
  }

  // Setters
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  setPersonaDid(did: string | null): void {
    this.personaDid = did;
  }

  setWalletAdapter(adapter: WalletAdapter | null): void {
    this.walletAdapter = adapter;
  }

  // Scope identifier (for backend queries)
  getScope(): string | null {
    return this.personaDid || this.walletAdapter?.address || null;
  }
}
