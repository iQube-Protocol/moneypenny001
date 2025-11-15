/**
 * Redis Adapter - State, Cache, Pub/Sub
 * Docs: https://redis.io/docs
 * 
 * Patterns:
 * - Session state: agent:session:{scope}
 * - Stream cache: quotes:{scope}, fills:{scope}
 * - Pub/Sub channels: events.quotes, events.fills, events.pnl
 * - Rate limits: rl:{tool}:{scope}
 */

// Simple Redis client interface for browser environment
// In production, this would connect via WebSocket to a Redis proxy
export interface RedisClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, expirySeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  hSet(key: string, field: string, value: string): Promise<void>;
  hGetAll(key: string): Promise<Record<string, string>>;
  lPush(key: string, value: string): Promise<void>;
  lRange(key: string, start: number, stop: number): Promise<string[]>;
  lTrim(key: string, start: number, stop: number): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

export class RedisAdapter {
  private client: RedisClient | null = null;
  private url: string;
  private connected: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      // In browser environment, we'd connect via a Redis proxy API
      // For now, we'll use a mock implementation that stores in memory
      this.client = this.createMockClient();
      await this.client.connect();
      this.connected = true;
      console.log('Redis adapter connected (mock mode)');
    } catch (error) {
      console.error('Redis connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      await this.client.disconnect();
      this.client = null;
      this.connected = false;
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  // Session state management
  async setSessionState(scope: string, state: Record<string, string>): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    
    const key = `agent:session:${scope}`;
    for (const [field, value] of Object.entries(state)) {
      await this.client.hSet(key, field, value);
    }
  }

  async getSessionState(scope: string): Promise<Record<string, string>> {
    if (!this.client) throw new Error('Redis not connected');
    
    const key = `agent:session:${scope}`;
    return await this.client.hGetAll(key);
  }

  // Stream caching
  async cacheQuote(scope: string, quote: any): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    
    const key = `quotes:${scope}`;
    await this.client.lPush(key, JSON.stringify(quote));
    await this.client.lTrim(key, 0, 99); // Keep last 100
  }

  async getCachedQuotes(scope: string, count: number = 20): Promise<any[]> {
    if (!this.client) throw new Error('Redis not connected');
    
    const key = `quotes:${scope}`;
    const quotes = await this.client.lRange(key, 0, count - 1);
    return quotes.map(q => JSON.parse(q));
  }

  async cacheFill(scope: string, fill: any): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    
    const key = `fills:${scope}`;
    await this.client.lPush(key, JSON.stringify(fill));
    await this.client.lTrim(key, 0, 99);
  }

  async getCachedFills(scope: string, count: number = 20): Promise<any[]> {
    if (!this.client) throw new Error('Redis not connected');
    
    const key = `fills:${scope}`;
    const fills = await this.client.lRange(key, 0, count - 1);
    return fills.map(f => JSON.parse(f));
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');
    
    const rlKey = `rl:${key}`;
    const count = await this.client.incr(rlKey);
    
    if (count === 1) {
      await this.client.expire(rlKey, windowSec);
    }
    
    return count <= limit;
  }

  // Simple cache get/set
  async cache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    await this.client.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getCached<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis not connected');
    
    const value = await this.client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  // Mock Redis client for browser environment
  private createMockClient(): RedisClient {
    const storage = new Map<string, any>();
    
    return {
      connect: async () => {},
      disconnect: async () => { storage.clear(); },
      
      get: async (key: string) => {
        const item = storage.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
          storage.delete(key);
          return null;
        }
        return item.value;
      },
      
      set: async (key: string, value: string, expirySeconds?: number) => {
        storage.set(key, {
          value,
          expiry: expirySeconds ? Date.now() + (expirySeconds * 1000) : null,
        });
      },
      
      del: async (key: string) => {
        storage.delete(key);
      },
      
      hSet: async (key: string, field: string, value: string) => {
        const hash = storage.get(key) || { value: {}, expiry: null };
        hash.value[field] = value;
        storage.set(key, hash);
      },
      
      hGetAll: async (key: string) => {
        const item = storage.get(key);
        return item?.value || {};
      },
      
      lPush: async (key: string, value: string) => {
        const list = storage.get(key) || { value: [], expiry: null };
        list.value.unshift(value);
        storage.set(key, list);
      },
      
      lRange: async (key: string, start: number, stop: number) => {
        const item = storage.get(key);
        if (!item) return [];
        return item.value.slice(start, stop + 1);
      },
      
      lTrim: async (key: string, start: number, stop: number) => {
        const item = storage.get(key);
        if (!item) return;
        item.value = item.value.slice(start, stop + 1);
        storage.set(key, item);
      },
      
      incr: async (key: string) => {
        const item = storage.get(key) || { value: '0', expiry: null };
        const newValue = parseInt(item.value) + 1;
        item.value = newValue.toString();
        storage.set(key, item);
        return newValue;
      },
      
      expire: async (key: string, seconds: number) => {
        const item = storage.get(key);
        if (!item) return;
        item.expiry = Date.now() + (seconds * 1000);
        storage.set(key, item);
      },
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
