/**
 * MoneyPenny Client
 * Extends AgentiQClient with MoneyPenny-specific functionality
 * 
 * This is the main entry point for the MoneyPenny thin client application
 */

import { QueryClient } from '@tanstack/react-query';
import { AgentiQClient } from '../core/client';
import { AgentiQConfig } from '../core/types';
import { TavilyAdapter } from '../core/adapters/tavily';
import { RedisAdapter } from '../core/adapters/redis';
import { AuthModule } from './modules/auth';
import { X402Module } from './modules/x402';
import { FIOModule } from './modules/fio';
import { StorageModule } from './modules/storage';
import { AggregatesModule } from './modules/aggregates';
import { MemoriesModule } from './modules/memories';
import { AnchorsModule } from './modules/anchors';
import { AgentsModule } from './modules/agents';
import { QuotesModule } from './modules/quotes';
import { ExecutionModule } from './modules/execution';
import { OraclesModule } from './modules/oracles';

export class MoneyPennyClient extends AgentiQClient {
  // External adapters (optional)
  public tavily: TavilyAdapter | null = null;
  public redis: RedisAdapter | null = null;

  // Modules (Phase 3)
  public auth: AuthModule;
  public x402: X402Module;
  public fio: FIOModule;
  public storage: StorageModule;
  public aggregates: AggregatesModule;
  public memories: MemoriesModule;
  public quotes: QuotesModule;
  public execution: ExecutionModule;
  public oracles: OraclesModule;
  public anchors: AnchorsModule;
  public agents: AgentsModule;

  constructor(config: AgentiQConfig, queryClient: QueryClient) {
    super(config, queryClient);

    // Initialize external adapters if configured
    if (config.tavilyApiKey) {
      try {
        this.tavily = new TavilyAdapter(config.tavilyApiKey);
        console.log('Tavily adapter initialized');
      } catch (error) {
        console.warn('Tavily initialization failed:', error);
      }
    }

    if (config.redisUrl) {
      try {
        this.redis = new RedisAdapter(config.redisUrl);
        this.redis.connect().catch((error) => {
          console.warn('Redis connection failed:', error);
        });
        console.log('Redis adapter initialized');
      } catch (error) {
        console.warn('Redis initialization failed:', error);
      }
    }

    // Initialize all modules (Phase 3)
    this.auth = new AuthModule(this);
    this.x402 = new X402Module(this);
    this.fio = new FIOModule(this);
    this.storage = new StorageModule(this);
    this.aggregates = new AggregatesModule(this);
    this.memories = new MemoriesModule(this);
    this.anchors = new AnchorsModule(this);
    this.agents = new AgentsModule(this);
    this.quotes = new QuotesModule(this);
    this.execution = new ExecutionModule(this);
    this.oracles = new OraclesModule(this);

    console.log('MoneyPenny client initialized', {
      agentClass: config.agentClass,
      tenantId: config.tenantId,
      enableA2A: config.enableA2A,
      hasTavily: !!this.tavily,
      hasRedis: !!this.redis,
      modulesLoaded: 11,
    });
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'ok' | 'degraded' | 'error';
    services: Record<string, boolean>;
  }> {
    const services: Record<string, boolean> = {
      core: true, // Core client always available
      tavily: !!this.tavily,
      redis: this.redis?.isConnected() || false,
    };

    const allOk = Object.values(services).every(v => v);
    const someOk = Object.values(services).some(v => v);

    return {
      status: allOk ? 'ok' : someOk ? 'degraded' : 'error',
      services,
    };
  }
}

// Singleton instance
let moneyPennyClient: MoneyPennyClient | null = null;

export function initMoneyPenny(config: AgentiQConfig, queryClient: QueryClient): MoneyPennyClient {
  if (moneyPennyClient) {
    console.warn('MoneyPenny client already initialized, returning existing instance');
    return moneyPennyClient;
  }

  moneyPennyClient = new MoneyPennyClient(config, queryClient);
  return moneyPennyClient;
}

export function getMoneyPenny(): MoneyPennyClient {
  if (!moneyPennyClient) {
    throw new Error('MoneyPenny client not initialized. Call initMoneyPenny() first.');
  }
  return moneyPennyClient;
}

// Hook for React components
export function useMoneyPenny(): MoneyPennyClient {
  return getMoneyPenny();
}
