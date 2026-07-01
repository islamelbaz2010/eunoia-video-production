# Folder Structure

## Overview

This document describes the folder structure of the Eunoia Media OS TypeScript repository, organized by module and layer.

## Repository Structure

```
eunoia-video-production/
├── docs/
│   ├── EES/                    # Engineering specifications
│   │   ├── INDEX.md
│   │   ├── README.md
│   │   └── EES-006-Plugin-Marketplace.md
│   ├── architecture/           # Architecture documentation (this folder)
│   │   ├── ARCHITECTURE_OVERVIEW.md
│   │   ├── COMPONENTS.md
│   │   ├── DATA_FLOW.md
│   │   ├── REQUEST_FLOW.md
│   │   ├── STARTUP_FLOW.md
│   │   ├── PLUGIN_LIFECYCLE.md
│   │   ├── DISCOVERY_PIPELINE.md
│   │   ├── AI_ROUTING.md
│   │   ├── QUEUE_SYSTEM.md
│   │   ├── SCHEDULER.md
│   │   ├── STORAGE.md
│   │   ├── API_INVENTORY.md
│   │   ├── EVENT_INVENTORY.md
│   │   ├── DATABASE.md
│   │   ├── DEPLOYMENT.md
│   │   ├── FOLDER_STRUCTURE.md
│   │   ├── CLASS_RELATIONSHIPS.md
│   │   ├── C4_MODEL.md
│   │   ├── RUNTIME.md
│   │   ├── README.md
│   │   └── INDEX.md
│   └── ARCHITECTURE.md         # High-level architecture overview
├── sql/                        # Database migrations
│   ├── 000_extensions.sql
│   └── 001_schema.sql
├── src/                        # TypeScript source code
│   ├── ai/                     # AI module
│   ├── core/                   # Core infrastructure
│   ├── discovery/              # Discovery module
│   ├── plugins/                # Plugin system
│   └── shared/                 # Shared utilities
├── tests/                      # Test files
│   ├── ai/
│   ├── core/
│   ├── discovery/
│   └── plugins/
├── package.json                # Project metadata and dependencies
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Jest test configuration
└── README.md                  # Project README
```

## Source Code Structure

### AI Module (`src/ai/`)

```
src/ai/
├── application/
│   ├── AIService.ts           # AI request orchestration
│   ├── CostEstimator.ts       # Token and cost estimation
│   └── IAIProvider.ts         # Provider interface
├── domain/
│   ├── errors/
│   │   └── AIError.ts         # AI-specific errors
│   ├── models/
│   │   ├── AIRequest.ts       # AI request model
│   │   └── AIResponse.ts      # AI response model
│   └── types/
│       ├── ProviderCapabilities.ts
│       ├── ProviderCost.ts
│       ├── ProviderHealth.ts
│       ├── ProviderLimits.ts
│       ├── ProviderStatus.ts
│       ├── ProviderType.ts
│       └── TaskType.ts
├── infrastructure/
│   └── providers/
│       ├── ClaudeProvider.ts  # Anthropic Claude provider
│       ├── GeminiProvider.ts  # Google Gemini provider
│       └── OpenAIProvider.ts  # OpenAI provider
├── memory/
│   ├── AgentMemory.ts         # Agent-specific memory
│   ├── ConversationMemory.ts # Conversation history
│   ├── IMemoryStore.ts        # Memory store interface
│   └── InMemoryMemoryStore.ts # In-memory implementation
├── prompts/
│   ├── PromptRenderer.ts      # Template rendering
│   ├── PromptRegistry.ts      # Prompt template registry
│   └── PromptTemplate.ts      # Template model
├── routing/
│   ├── AIRouter.ts            # Provider selection
│   ├── RoutingPolicy.ts       # Routing configuration
│   └── RoutingStrategy.ts     # Strategy enums
├── observability/
│   └── RequestTrace.ts        # Request tracing
└── index.ts                   # Module exports
```

### Core Module (`src/core/`)

```
src/core/
├── config/
│   └── AppConfig.ts           # Environment configuration
├── engine/
│   ├── Engine.ts              # Application orchestration
│   └── HealthService.ts       # Health checks
├── events/
│   ├── DomainEvent.ts         # Event base type
│   ├── IEventBus.ts           # Event bus interface
│   └── InMemoryEventBus.ts    # In-memory implementation
├── metrics/
│   ├── IMetricsService.ts     # Metrics interface
│   ├── MetricsService.ts      # Metrics implementation
│   └── MetricsSnapshot.ts     # Metrics snapshot type
├── queue/
│   ├── JobQueue.ts            # Job queue implementation
│   └── Job.ts                # Job model
├── scheduler/
│   ├── ISchedulerService.ts   # Scheduler interface
│   └── SchedulerService.ts    # Cron/interval scheduler
├── storage/
│   ├── GoogleDriveProvider.ts # Google Drive storage
│   ├── IStorageProvider.ts    # Storage interface
│   └── LocalStorageProvider.ts # Filesystem storage
└── index.ts                   # Module exports
```

### Discovery Module (`src/discovery/`)

```
src/discovery/
├── application/
│   ├── services/
│   │   └── DiscoveryService.ts # Discovery orchestration
│   └── scoring/
│       └── OpportunityScoringService.ts # Opportunity scoring
├── domain/
│   ├── models/
│   │   ├── Opportunity.ts     # Opportunity domain model
│   │   └── OpportunityScore.ts # Score breakdown
│   ├── providers/
│   │   └── IDiscoveryProvider.ts # Provider interface
│   ├── registry/
│   │   └── IProviderRegistry.ts # Registry interface
│   ├── repository/
│   │   └── IOpportunityRepository.ts # Repository interface
│   └── types/
│       ├── DiscoverySource.ts # Source enum
│       └── OpportunityStatus.ts # Status enum
├── infrastructure/
│   ├── providers/
│   │   ├── GoogleTrendsProvider.ts # Google Trends
│   │   ├── RedditProvider.ts  # Reddit
│   │   ├── RssProvider.ts      # RSS feeds
│   │   ├── WhopProvider.ts     # Whop platform
│   │   └── YouTubeProvider.ts  # YouTube
│   ├── registry/
│   │   └── ProviderRegistry.ts # Provider registry
│   └── repositories/
│       └── SupabaseOpportunityRepository.ts # Supabase repository
└── index.ts                   # Module exports
```

### Plugin Module (`src/plugins/`)

```
src/plugins/
├── contracts/
│   ├── ConfigField.ts         # Config schema field
│   ├── IPlugin.ts            # Plugin interface
│   ├── PluginCapability.ts   # Capability type
│   ├── PluginContext.ts      # Plugin context
│   ├── PluginDependency.ts   # Dependency specification
│   ├── PluginHealth.ts       # Health status
│   ├── PluginManifest.ts     # Manifest type
│   ├── PluginMetadata.ts     # Metadata type
│   ├── PluginPermission.ts   # Permission enum
│   └── PluginStatus.ts       # Status enum
├── core/
│   └── errors/
│       └── PluginError.ts     # Plugin-specific errors
├── events/
│   └── PluginEvents.ts        # Plugin event types
├── lifecycle/
│   └── PluginLifecycleManager.ts # Lifecycle management
├── loader/
│   ├── DependencyResolver.ts  # Dependency resolution
│   ├── ManifestValidator.ts   # Manifest validation
│   ├── PluginConfigValidator.ts # Config validation
│   └── PluginLoader.ts       # Plugin loading
├── marketplace/
│   └── MarketplaceModels.ts   # Marketplace types (future)
├── observability/
│   └── PluginMetrics.ts       # Plugin metrics
└── registry/
    └── PluginRegistry.ts      # Plugin registry
```

### Shared Module (`src/shared/`)

```
src/shared/
├── errors/
│   └── AppError.ts            # Base error classes
└── logger/
    └── ILogger.ts             # Logger interface
```

## Test Structure

```
tests/
├── ai/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── routing/
├── core/
│   ├── config/
│   ├── engine/
│   ├── events/
│   ├── metrics/
│   ├── queue/
│   ├── scheduler/
│   └── storage/
├── discovery/
│   ├── application/
│   ├── domain/
│   └── infrastructure/
└── plugins/
    ├── contracts/
    ├── lifecycle/
    ├── loader/
    └── registry/
```

## Configuration Files

### package.json

```json
{
  "name": "eunoia-video-production",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "pino": "^8.16.2",
    "rss-parser": "^3.13.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "@types/node": "^20.10.5",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.3"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Module Organization Principles

### Layered Architecture

Each module follows a layered architecture:

1. **Domain Layer**: Core business logic and models
2. **Application Layer**: Use cases and orchestration
3. **Infrastructure Layer**: External integrations

### Interface-Based Design

- All major components depend on interfaces
- Interfaces defined in domain or application layer
- Implementations in infrastructure layer

### Index Files

Each module has an `index.ts` that exports public API:

```typescript
// src/ai/index.ts
export * from './application';
export * from './domain';
export * from './infrastructure';
export * from './memory';
export * from './prompts';
export * from './routing';
export * from './observability';
```

## File Naming Conventions

| Pattern | Description | Example |
|---------|-------------|---------|
| `I*.ts` | Interface file | `IEventBus.ts` |
| `*.ts` | Implementation file | `InMemoryEventBus.ts` |
| `*.test.ts` | Test file | `JobQueue.test.ts` |
| `index.ts` | Module exports | `index.ts` |

## Import Patterns

### Relative Imports

```typescript
// Within same module
import { AIRouter } from '../routing/AIRouter';
import { AIService } from '../application/AIService';

// From shared
import { ILogger } from '../../shared/logger/ILogger';
import { AppError } from '../../shared/errors/AppError';
```

### Module Imports

```typescript
// From other modules
import { AIRouter } from '@eunoia/ai';
import { JobQueue } from '@eunoia/core';
```

**Note**: Package name aliases not currently configured in tsconfig.

## Build Output

```
dist/
├── ai/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   ├── memory/
│   ├── prompts/
│   ├── routing/
│   ├── observability/
│   └── index.d.ts
├── core/
│   ├── config/
│   ├── engine/
│   ├── events/
│   ├── metrics/
│   ├── queue/
│   ├── scheduler/
│   ├── storage/
│   └── index.d.ts
├── discovery/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── index.d.ts
├── plugins/
│   ├── contracts/
│   ├── core/
│   ├── events/
│   ├── lifecycle/
│   ├── loader/
│   ├── marketplace/
│   ├── observability/
│   ├── registry/
│   └── index.d.ts
├── shared/
│   ├── errors/
│   ├── logger/
│   └── index.d.ts
└── index.d.ts
```

## Current Gaps

### Missing Directories

- `plugins/` - No actual plugins directory for plugin discovery
- `storage/` - No storage directory for LocalStorageProvider base path

### Missing Files

- `src/main.ts` - No main entry point
- `src/cli/` - No CLI implementation
- `src/api/` - No REST API implementation
- `src/workers/` - No worker processes

## Cross-References

- [Architecture Overview](ARCHITECTURE_OVERVIEW.md) - Module organization
- [Components](COMPONENTS.md) - Component locations
- [Class Relationships](CLASS_RELATIONSHIPS.md) - Class dependencies
