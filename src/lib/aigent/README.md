# AgentiQ Thin Client Architecture

This directory contains the thin client implementation for the AgentiQ platform. It follows a class-based architecture that allows for code reuse across different agent types and their tenants.

## Architecture

```
aigent/
├── core/                    # Platform-wide base classes and adapters
│   ├── client.ts           # AgentiQClient base class
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── config.ts           # Configuration factory
│   └── adapters/           # Modular external service adapters
│       ├── wallet.ts       # Wallet adapter interface
│       ├── tavily.ts       # Tavily web search adapter
│       └── redis.ts        # Redis state/cache adapter
│
└── moneypenny/             # MoneyPenny agent class
    ├── client.ts           # MoneyPennyClient (extends AgentiQClient)
    ├── modules/            # MoneyPenny-specific modules (Phase 3)
    └── wallets/            # Wallet adapters (Phase 2)
```

## Agent Classes

The AgentiQ platform supports multiple agent classes:

- **MoneyPenny**: HFT trading console + banking wizard
- **Nakamoto**: (Future) Bitcoin-focused agent
- **Kn0w1**: (Future) Educational/knowledge agent

Each class can have **tenants** (instances with custom branding/features).

## Usage

### Initialize MoneyPenny Client

```typescript
import { initMoneyPenny, useMoneyPenny } from '@/lib/aigent/moneypenny/client';
import { createConfigFromEnv } from '@/lib/aigent/core/config';
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();
const config = createConfigFromEnv();

// Initialize on app startup
const client = initMoneyPenny(config, queryClient);

// Use in components
function MyComponent() {
  const client = useMoneyPenny();
  
  // Client is ready to use
  const health = await client.healthCheck();
  console.log(health);
}
```

### Modular Adapters

All external services are optional and modular:

```typescript
// Tavily (web search)
if (client.tavily) {
  const results = await client.tavily.search({
    query: 'latest ETH gas prices',
    maxResults: 5,
  });
}

// Redis (state/cache)
if (client.redis) {
  await client.redis.cacheQuote(scope, quote);
  const cached = await client.redis.getCachedQuotes(scope, 20);
}
```

### Wallet Adapters

The client supports multiple wallet types through a unified interface:

```typescript
import { MetaMaskAdapter } from '@/lib/aigent/moneypenny/wallets/metamask';

const wallet = new MetaMaskAdapter();
const state = await wallet.connect();

client.setWalletAdapter(wallet);
```

## Configuration

All configuration is loaded from environment variables. See `.env.example` for the full list.

### Feature Flags

- `VITE_ENABLE_A2A`: Enable DiDQube A2A authentication
- `VITE_ENABLE_METAMASK`: Enable MetaMask wallet
- `VITE_ENABLE_UNISAT`: Enable UniSat BTC wallet
- `VITE_ENABLE_PHANTOM`: Enable Phantom SOL wallet
- `VITE_TAVILY_API_KEY`: Optional Tavily API key for web search
- `VITE_REDIS_URL`: Optional Redis URL for state/cache

## Development Phases

### ✅ Phase 1: Core Foundation (Complete)
- Core AgentiQClient base class
- Modular adapters (Tavily, Redis, Wallet interface)
- MoneyPennyClient initialization
- Configuration management

### 🔄 Phase 2: Wallet Adapters (Next)
- X402 adapter (A2A)
- MetaMask adapter (EVM)
- UniSat adapter (BTC)
- Phantom adapter (SOL)

### 📋 Phase 3: Agent Modules
- Auth module (DiDQube + X402 + FIO)
- Storage module (BlakQube Smart Buckets)
- Aggregates module (non-PII financial data)
- Memories module (Smart Memories)
- Quotes/Execution modules (HFT console)
- Oracles module (gas/price feeds)
- Anchors module (DVN proof-of-state)
- Agents module (MoneyPenny + Kn0w1)

## Best Practices

1. **Always check adapter availability**: External services are optional
2. **Use the unified wallet interface**: Don't couple to specific wallets
3. **Leverage Redis for state**: Persist intermediate steps for recovery
4. **Domain allow-lists for Tavily**: Security first
5. **Emit DVN anchors**: For all consequential writes

## Creating a New Agent Class

To create a new agent class (e.g., Nakamoto):

1. Create `src/lib/aigent/nakamoto/client.ts` extending `AgentiQClient`
2. Add agent-specific modules in `src/lib/aigent/nakamoto/modules/`
3. Update `AgentiQConfig` type with new agent class name
4. Initialize in `App.tsx` like MoneyPenny

## Creating a Tenant

Tenants are instances of an agent class with custom branding:

1. Set `VITE_TENANT_ID=your-tenant-id` in environment
2. Tenant-specific styling in `src/styles/tenants/your-tenant.css`
3. Custom branding in UI components via tenant config

All API requests include `X-Tenant-Id` header automatically.
