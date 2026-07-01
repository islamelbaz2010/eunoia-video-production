# Components

This document provides detailed descriptions of all major components in the Eunoia Media OS TypeScript library.

## AI Module Components

### AIService

**Location**: `src/ai/application/AIService.ts`

**Purpose**: Orchestrates AI requests with retry logic, metrics collection, and tracing.

**Responsibilities**:
- Route AI requests to appropriate providers via `AIRouter`
- Execute requests with configurable retry logic
- Record execution metrics (latency, token usage, cost)
- Maintain request traces for observability
- Handle routing errors and provider failures

**Dependencies**:
- `AIRouter` - Provider selection
- `IMetricsService` - Metrics recording
- `ILogger` - Logging

**Key Methods**:
- `request(aiRequest, policy)` - Execute AI request with default retry
- `requestWithRetry(aiRequest, policy, maxRetries)` - Execute with custom retry count
- `getTraces()` - Retrieve recorded request traces

---

### AIRouter

**Location**: `src/ai/routing/AIRouter.ts`

**Purpose**: Selects the optimal AI provider based on routing strategy and policy.

**Responsibilities**:
- Register and unregister AI providers
- Filter providers by availability, task type support, and exclusion policy
- Apply routing strategies (LowestCost, HighestQuality, Fastest, Manual, Balanced)
- Select providers for specific AI requests

**Dependencies**:
- `ILogger` - Logging

**Routing Strategies**:
- **LowestCost**: Selects provider with lowest estimated cost
- **HighestQuality**: Selects provider based on hardcoded quality scores (Claude: 1.0, OpenAI: 0.9, Gemini: 0.8)
- **Fastest**: Selects provider with lowest estimated latency
- **Manual**: Selects preferred provider if available
- **Balanced**: Weighted score (40% cost, 30% quality, 30% latency)

**Key Methods**:
- `register(provider)` - Register an AI provider
- `select(request, policy)` - Select provider for a request
- `getProviders()` - Get all registered providers

---

### OpenAIProvider

**Location**: `src/ai/infrastructure/providers/OpenAIProvider.ts`

**Purpose**: Implements `IAIProvider` interface for OpenAI API integration.

**Responsibilities**:
- Initialize with API key from configuration
- Execute chat completions and embeddings
- Estimate costs based on token counts
- Estimate latency based on input size
- Perform health checks against OpenAI API
- Map OpenAI responses to internal `AIResponse` format

**Models Used**:
- `gpt-4o` - Primary chat model
- `gpt-4o-mini` - Fast tasks (classification, scoring, analytics)
- `text-embedding-3-small` - Embeddings

**Capabilities**:
- All task types supported
- Max input tokens: 128,000
- Max output tokens: 16,384
- Streaming, system prompts, function calling, vision, embeddings supported

**Rate Limits**:
- 500 requests/minute
- 150,000 tokens/minute
- 10,000 requests/day

---

### ClaudeProvider

**Location**: `src/ai/infrastructure/providers/ClaudeProvider.ts`

**Purpose**: Implements `IAIProvider` interface for Anthropic Claude API.

**Status**: **Incomplete** - `execute()` method throws `AIProviderNotImplementedError`

**Responsibilities** (intended):
- Initialize with API key
- Execute Claude API calls
- Estimate costs and latency
- Health checks

**Capabilities** (declared):
- All task types supported
- Max input tokens: 200,000
- Max output tokens: 8,192

---

### GeminiProvider

**Location**: `src/ai/infrastructure/providers/GeminiProvider.ts`

**Purpose**: Implements `IAIProvider` interface for Google Gemini API.

**Status**: **Incomplete** - `execute()` method throws `AIProviderNotImplementedError`

**Responsibilities** (intended):
- Initialize with API key
- Execute Gemini API calls
- Estimate costs and latency
- Health checks

**Capabilities** (declared):
- All task types supported
- Max input tokens: 1,000,000
- Max output tokens: 8,192

---

### CostEstimator

**Location**: `src/ai/application/CostEstimator.ts`

**Purpose**: Estimates token counts and costs for AI requests.

**Responsibilities**:
- Estimate token count from text (4 characters per token assumption)
- Estimate input/output tokens from `AIRequest`
- Provide token breakdown for cost calculation

**Limitation**: Uses fixed 4 characters per token ratio, which varies by actual tokenizer.

---

### ConversationMemory

**Location**: `src/ai/memory/ConversationMemory.ts`

**Purpose**: Manages conversation history for multi-turn AI interactions.

**Responsibilities**:
- Add user, assistant, and system messages
- Retrieve conversation history with optional limit
- Build context string from history
- Clear conversation history

**Dependencies**:
- `IMemoryStore` - Storage backend
- Session ID for isolation

---

## Discovery Module Components

### DiscoveryService

**Location**: `src/discovery/application/services/DiscoveryService.ts`

**Purpose**: Orchestrates content opportunity discovery from multiple providers.

**Responsibilities**:
- Resolve configured discovery providers
- Fetch opportunities from each provider
- Score opportunities using `OpportunityScoringService`
- Save opportunities to repository
- Retrieve and review opportunities

**Dependencies**:
- `IProviderRegistry` - Provider resolution
- `IOpportunityRepository` - Opportunity persistence
- `IOpportunityScoringService` - Opportunity scoring
- `ILogger` - Logging

**Key Methods**:
- `discover(params)` - Execute discovery run
- `getOpportunities(filter)` - Retrieve opportunities
- `reviewOpportunity(id, accepted)` - Accept or reject opportunity

---

### OpportunityScoringService

**Location**: `src/discovery/application/scoring/OpportunityScoringService.ts`

**Purpose**: Scores content opportunities based on relevance, engagement, timeliness, and competition.

**Responsibilities**:
- Compute relevance score based on keyword matching
- Compute engagement score from metadata (views, likes, comments, upvotes)
- Compute timeliness score based on publication date
- Compute competition score from metadata
- Aggregate scores into `OpportunityScore`

**Scoring Logic**:
- **Relevance**: Percentage of matched keywords (0-100)
- **Engagement**: Weighted sum of engagement metrics (0-100)
- **Timeliness**: Decay function based on age (100 for ≤1 day, decays to 0)
- **Competition**: Direct mapping from competition score metadata (0-100)

---

### RssProvider

**Location**: `src/discovery/infrastructure/providers/RssProvider.ts`

**Purpose**: Fetches content opportunities from RSS feeds.

**Status**: **Implemented**

**Responsibilities**:
- Parse RSS feeds using `rss-parser`
- Filter items by publication date (since parameter)
- Limit results (default 50)
- Convert RSS items to `RawOpportunity` format

**Configuration**:
- Feed URL
- Optional since date
- Optional limit

---

### RedditProvider

**Location**: `src/discovery/infrastructure/providers/RedditProvider.ts`

**Purpose**: Fetches content opportunities from Reddit.

**Status**: **Skeleton** - Returns empty array with warning log

**Responsibilities** (intended):
- Fetch posts from Reddit API
- Convert to `RawOpportunity` format

**Configuration**:
- Reddit API credentials

---

### YouTubeProvider

**Location**: `src/discovery/infrastructure/providers/YouTubeProvider.ts`

**Purpose**: Fetches content opportunities from YouTube.

**Status**: **Skeleton** - Returns empty array with warning log

**Responsibilities** (intended):
- Fetch videos from YouTube Data API
- Convert to `RawOpportunity` format

**Configuration**:
- YouTube API credentials

---

### GoogleTrendsProvider

**Location**: `src/discovery/infrastructure/providers/GoogleTrendsProvider.ts`

**Purpose**: Fetches trending topics from Google Trends.

**Status**: **Skeleton** - Returns empty array with warning log, `isConfigured()` always returns false

**Responsibilities** (intended):
- Fetch trending topics
- Convert to `RawOpportunity` format

---

### WhopProvider

**Location**: `src/discovery/infrastructure/providers/WhopProvider.ts`

**Purpose**: Fetches content opportunities from Whop platform.

**Status**: **Skeleton** - Returns empty array with warning log

**Responsibilities** (intended):
- Fetch content from Whop API
- Convert to `RawOpportunity` format

---

### ProviderRegistry

**Location**: `src/discovery/infrastructure/registry/ProviderRegistry.ts`

**Purpose**: Registry for discovery providers with configuration filtering.

**Responsibilities**:
- Register and unregister providers
- Retrieve providers by name
- Get all providers or only configured providers

---

### SupabaseOpportunityRepository

**Location**: `src/discovery/infrastructure/repositories/SupabaseOpportunityRepository.ts`

**Purpose**: Repository for opportunity persistence using Supabase.

**Status**: **Not Connected** - No `opportunities` table exists in database schema

**Responsibilities**:
- Save opportunities with upsert
- Find by ID
- Find all with filters (status, source, minScore, since, limit, offset)
- Update opportunity status
- Delete opportunity
- Count opportunities with filters

**Table Assumed** (not in schema):
- `opportunities` with columns for opportunity fields and score breakdown

---

## Plugin Module Components

### PluginLifecycleManager

**Location**: `src/plugins/lifecycle/PluginLifecycleManager.ts`

**Purpose**: Manages complete plugin lifecycle from installation to uninstallation.

**Responsibilities**:
- Install plugins with registration and event emission
- Configure plugins with validation
- Initialize, start, pause, resume, stop, shutdown plugins
- Uninstall plugins with cleanup
- Health checks for plugins
- Bulk operations (startAll, stopAll)
- Emit plugin lifecycle events

**Lifecycle States**:
- Installed → Configured → Initialized → Running ↔ Paused → Stopped
- Failed state on errors

**Dependencies**:
- `PluginRegistry` - Plugin metadata and instances
- `IEventBus` - Event emission
- `PluginMetrics` - Metrics collection
- `ILogger` - Logging

---

### PluginRegistry

**Location**: `src/plugins/registry/PluginRegistry.ts`

**Purpose**: In-memory registry for plugin metadata and instances.

**Responsibilities**:
- Register plugins with metadata
- Unregister plugins
- Find and get plugins by ID
- List all plugins
- Search plugins by query
- Enable, disable, reload plugins
- Update plugin status and configuration

**Metadata Tracked**:
- Manifest
- Status
- Installation timestamp
- Load timestamp
- Start timestamp
- Plugin directory
- Configuration

---

### PluginLoader

**Location**: `src/plugins/loader/PluginLoader.ts`

**Purpose**: Discovers and loads plugin manifests from filesystem.

**Responsibilities**:
- Load manifest from directory (plugin.json)
- Discover all plugins in plugins/ directory
- Validate manifests
- Resolve load order based on dependencies
- Create plugin instances from factory functions

**Discovery Structure**:
- Base directory with plugins/ subdirectory
- Each plugin in its own directory with plugin.json

---

### ManifestValidator

**Location**: `src/plugins/loader/ManifestValidator.ts`

**Purpose**: Validates plugin manifests against schema requirements.

**Responsibilities**:
- Validate manifest structure
- Check required fields (id, name, version, description, author, entryPoint, minEngineVersion)
- Validate semver format for version and minEngineVersion
- Validate permissions against allowed set
- Validate config schema field types and requirements

---

### DependencyResolver

**Location**: `src/plugins/loader/DependencyResolver.ts`

**Purpose**: Resolves plugin load order based on dependencies.

**Responsibilities**:
- Satisfy version constraints (>=, >, <=, <, ^, ~, exact)
- Compare semantic versions
- Resolve load order with topological sort
- Detect circular dependencies
- Validate dependencies against registered versions

---

### PluginConfigValidator

**Location**: `src/plugins/loader/PluginConfigValidator.ts`

**Purpose**: Validates plugin configuration against manifest schema.

**Responsibilities**:
- Apply default values from config schema
- Validate configuration values
- Return validation errors

---

### PluginMetrics

**Location**: `src/plugins/observability/PluginMetrics.ts`

**Purpose**: Collects and aggregates plugin performance metrics.

**Responsibilities**:
- Record plugin load time
- Record plugin failures
- Record plugin restarts
- Get metrics snapshot

---

## Core Module Components

### Engine

**Location**: `src/core/engine/Engine.ts`

**Purpose**: Main application orchestration engine.

**Responsibilities**:
- Start and stop application
- Register storage providers
- Register schedulers
- Register job queues
- Health checks via `HealthService`

**Status**: **Not Used** - No main entry point instantiates the Engine

---

### HealthService

**Location**: `src/core/engine/HealthService.ts`

**Purpose**: Performs health checks on system components.

**Responsibilities**:
- Check database connectivity (Supabase)
- Check health of storage providers
- Check queue lengths
- Check scheduler task counts
- Check AI provider availability
- Compute overall health status (healthy/degraded/unhealthy)

**Health Checks**:
- Database: HTTP request to Supabase health endpoint
- Storage: exists() check on each provider
- Queue: Aggregate queue length
- Scheduler: Enabled/total task count
- Providers: List of available AI providers

---

### JobQueue

**Location**: `src/core/queue/JobQueue.ts`

**Purpose**: In-memory job queue with priority, retry policies, and dead letter queue.

**Responsibilities**:
- Enqueue jobs with priority and optional scheduled run time
- Dequeue jobs based on priority and readiness
- Acknowledge successful job completion
- Fail jobs with exponential backoff retry
- Cancel jobs
- Track job status (Pending, Running, Completed, Failed, Cancelled)
- Move failed jobs to dead letter queue after max attempts

**Retry Policy**:
- Exponential backoff: `backoffMs * 2^(attempt - 1)`
- Configurable max attempts

**Priority Ordering**:
- Higher priority first
- FIFO within same priority

**Limitation**: In-memory storage - jobs lost on process restart

---

### SchedulerService

**Location**: `src/core/scheduler/SchedulerService.ts`

**Purpose**: Schedules recurring tasks with cron or interval expressions.

**Responsibilities**:
- Schedule tasks with cron expressions or interval milliseconds
- Unschedule tasks
- Pause and resume tasks
- Run tasks immediately
- Shutdown all tasks
- Get all scheduled tasks

**Cron Implementation**:
- Custom implementation (not using node-cron)
- Linear scan algorithm (up to 366*24*60 iterations)
- Supports only simple patterns (single values, wildcards)
- Does not support ranges, lists, or step values

**Limitation**: Custom cron implementation is inefficient for complex expressions

---

### InMemoryEventBus

**Location**: `src/core/events/InMemoryEventBus.ts`

**Purpose**: In-memory event bus for domain events.

**Responsibilities**:
- Publish events to subscribed handlers
- Subscribe handlers to event types
- Unsubscribe handlers
- Handle handler errors without stopping propagation

**Limitation**: Single-process only - no distributed support

---

### MetricsService

**Location**: `src/core/metrics/MetricsService.ts`

**Purpose**: Aggregates execution metrics.

**Responsibilities**:
- Increment jobs executed count
- Increment jobs failed count
- Record execution time
- Record provider latency
- Track queue length
- Generate metrics snapshot

**Metrics Tracked**:
- Jobs executed
- Jobs failed
- Average execution time
- Queue length
- Average provider latency by provider

**Limitation**: In-memory only - no persistence

---

### LocalStorageProvider

**Location**: `src/core/storage/LocalStorageProvider.ts`

**Purpose**: Filesystem-based storage provider.

**Responsibilities**:
- Upload files to filesystem
- Download files from filesystem
- Delete files
- Check file existence
- List files with optional prefix filtering
- Recursive directory listing

---

### GoogleDriveProvider

**Location**: `src/core/storage/GoogleDriveProvider.ts`

**Purpose**: Google Drive-based storage provider.

**Status**: **Skeleton** - Not implemented

---

### AppConfig

**Location**: `src/core/config/AppConfig.ts`

**Purpose**: Application configuration loaded from environment variables with Zod validation.

**Configuration Fields**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_DRIVE_FOLDER` - Google Drive folder ID
- `N8N_BASE_URL` - n8n instance URL
- `N8N_API_KEY` - n8n API key
- `LOG_LEVEL` - Logging level
- `NODE_ENV` - Environment (development, production, test)

**Validation**: Zod schema with required fields

---

## Shared Components

### ILogger

**Location**: `src/shared/logger/ILogger.ts`

**Purpose**: Logging interface.

**Methods**:
- `debug(message, context)`
- `info(message, context)`
- `warn(message, context)`
- `error(message, context)`
- `child(context)` - Create contextual logger

---

### Error Classes

**Location**: `src/shared/errors/AppError.ts`

**Purpose**: Hierarchical error classes for different error types.

**Error Types**:
- `AppError` - Base error with code
- `ConfigurationError` - Configuration-related errors
- `ProviderError` - Provider-related errors with provider name
- `RepositoryError` - Repository-related errors
- `NotFoundError` - Resource not found errors
- `DuplicateError` - Duplicate resource errors
