# API Inventory

## Overview

**Important Note**: The Eunoia Media OS TypeScript library does not currently expose any HTTP or REST APIs. It is a library that provides programmatic interfaces through TypeScript classes and interfaces. This document inventories the programmatic APIs available to consumers of the library.

## Module APIs

### AI Module

#### AIService

```typescript
class AIService {
  constructor(
    router: AIRouter,
    metrics: IMetricsService,
    logger: ILogger
  );

  request(
    aiRequest: AIRequest,
    policy?: RoutingPolicy
  ): Promise<AIResponse>;

  requestWithRetry(
    aiRequest: AIRequest,
    policy?: RoutingPolicy,
    maxRetries?: number
  ): Promise<AIResponse>;

  getTraces(): ReadonlyArray<RequestTrace>;
}
```

**Usage Example**:
```typescript
const aiService = new AIService(router, metrics, logger);
const request = createAIRequest({
  taskType: TaskType.Script,
  prompt: "Write a script..."
});
const response = await aiService.request(request);
```

#### AIRouter

```typescript
class AIRouter {
  constructor(logger: ILogger);

  register(provider: IAIProvider): void;
  unregister(providerType: ProviderType): void;
  select(request: AIRequest, policy?: RoutingPolicy): IAIProvider;
  getProviders(): ReadonlyArray<IAIProvider>;
}
```

**Usage Example**:
```typescript
const router = new AIRouter(logger);
router.register(openaiProvider);
router.register(claudeProvider);
const provider = router.select(request, { strategy: RoutingStrategy.LowestCost });
```

#### IAIProvider Interface

```typescript
interface IAIProvider {
  readonly type: ProviderType;
  readonly name: string;

  initialize(config: Record<string, string>): Promise<void>;
  isAvailable(): boolean;
  supports(taskType: TaskType): boolean;
  estimateCost(request: AIRequest): ProviderCost;
  estimateLatency(request: AIRequest): number;
  execute(request: AIRequest): Promise<AIResponse>;
  health(): Promise<ProviderHealth>;
  shutdown(): Promise<void>;
  getCapabilities(): ProviderCapabilities;
  getLimits(): ProviderLimits;
}
```

#### Memory APIs

```typescript
class ConversationMemory {
  constructor(sessionId: string, store: IMemoryStore);

  addUserMessage(content: string): void;
  addAssistantMessage(content: string): void;
  addSystemMessage(content: string): void;
  getHistory(limit?: number): Message[];
  clear(): void;
  buildContext(): string;
}

class AgentMemory {
  constructor(agentId: string, store: IMemoryStore);

  addObservation(content: string): void;
  addThought(content: string): void;
  addAction(content: string): void;
  getMemory(limit?: number): MemoryEntry[];
  clear(): void;
}
```

#### Prompt APIs

```typescript
class PromptRegistry {
  register(template: PromptTemplate): void;
  get(name: string): PromptTemplate | undefined;
  list(): ReadonlyArray<PromptTemplate>;
}

class PromptRenderer {
  render(template: PromptTemplate, variables: Record<string, string>): string;
}
```

---

### Discovery Module

#### DiscoveryService

```typescript
class DiscoveryService {
  constructor(
    registry: IProviderRegistry,
    repository: IOpportunityRepository,
    scoringService: IOpportunityScoringService,
    logger: ILogger
  );

  discover(params: DiscoverParams): Promise<Opportunity[]>;
  getOpportunities(filter?: OpportunityFilter): Promise<Opportunity[]>;
  reviewOpportunity(id: string, accepted: boolean): Promise<Opportunity>;
}
```

**Usage Example**:
```typescript
const discoveryService = new DiscoveryService(registry, repository, scoring, logger);
const opportunities = await discoveryService.discover({
  keywords: ['video', 'content'],
  limit: 50
});
```

#### IDiscoveryProvider Interface

```typescript
interface IDiscoveryProvider {
  readonly name: string;
  readonly source: DiscoverySource;

  isConfigured(): boolean;
  fetchOpportunities(params: FetchParams): Promise<RawOpportunity[]>;
}
```

#### IOpportunityRepository Interface

```typescript
interface IOpportunityRepository {
  save(opportunity: Opportunity): Promise<Opportunity>;
  findById(id: string): Promise<Opportunity | undefined>;
  findAll(filter?: OpportunityFilter): Promise<Opportunity[]>;
  update(id: string, patch: OpportunityPatch): Promise<Opportunity>;
  delete(id: string): Promise<void>;
  count(filter?: OpportunityFilter): Promise<number>;
}
```

---

### Plugin Module

#### PluginLifecycleManager

```typescript
class PluginLifecycleManager {
  constructor(
    registry: PluginRegistry,
    eventBus: IEventBus,
    metrics: PluginMetrics,
    logger: ILogger
  );

  install(plugin: IPlugin, context: PluginContext, directory: string): Promise<PluginMetadata>;
  configure(pluginId: string, config: Record<string, unknown>): Promise<void>;
  initialize(pluginId: string): Promise<void>;
  start(pluginId: string): Promise<void>;
  pause(pluginId: string): Promise<void>;
  resume(pluginId: string): Promise<void>;
  stop(pluginId: string): Promise<void>;
  shutdown(pluginId: string): Promise<void>;
  uninstall(pluginId: string): Promise<void>;
  health(pluginId: string): Promise<PluginHealth>;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
}
```

**Usage Example**:
```typescript
const manager = new PluginLifecycleManager(registry, eventBus, metrics, logger);
await manager.install(plugin, context, directory);
await manager.configure(plugin.id, config);
await manager.initialize(plugin.id);
await manager.start(plugin.id);
```

#### PluginRegistry

```typescript
class PluginRegistry {
  register(plugin: IPlugin, directory: string): PluginMetadata;
  unregister(pluginId: string): void;
  find(pluginId: string): PluginMetadata | undefined;
  get(pluginId: string): PluginMetadata;
  getPlugin(pluginId: string): IPlugin;
  list(): ReadonlyArray<PluginMetadata>;
  search(query: string): ReadonlyArray<PluginMetadata>;
  enable(pluginId: string): void;
  disable(pluginId: string): void;
  reload(pluginId: string): void;
  updateStatus(pluginId: string, status: PluginStatus): void;
  updateConfig(pluginId: string, config: Record<string, unknown>): void;
}
```

#### PluginLoader

```typescript
class PluginLoader {
  constructor(baseDir: string, logger: ILogger);

  loadManifestFromDirectory(dir: string): Promise<PluginManifest>;
  discoverManifests(): Promise<Array<{ manifest: PluginManifest; directory: string }>>;
  resolveLoadOrder(manifests: PluginManifest[]): PluginManifest[];
  validateManifest(raw: unknown): PluginManifest;
  createPluginFromFactory(
    factory: (manifest: PluginManifest) => IPlugin,
    manifest: PluginManifest
  ): IPlugin;
}
```

#### IPlugin Interface

```typescript
interface IPlugin {
  readonly manifest: PluginManifest;

  install(context: PluginContext): Promise<void>;
  configure(config: Record<string, unknown>): Promise<void>;
  initialize(): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<PluginHealth>;
  uninstall(): Promise<void>;
}
```

---

### Core Module

#### Engine

```typescript
class Engine {
  constructor(config: AppConfig, logger: ILogger);

  start(): Promise<void>;
  stop(): Promise<void>;
  registerStorageProvider(provider: IStorageProvider): void;
  registerScheduler(scheduler: ISchedulerService): void;
  registerQueue(queue: { getQueueLength(): number }): void;
  getHealth(): Promise<HealthStatus>;
}
```

**Usage Example**:
```typescript
const engine = new Engine(config, logger);
engine.registerStorageProvider(localStorageProvider);
engine.registerScheduler(scheduler);
await engine.start();
const health = await engine.getHealth();
```

#### HealthService

```typescript
class HealthService {
  constructor(deps: HealthServiceDependencies, logger: ILogger);

  check(): Promise<HealthStatus>;
  checkDatabase(): Promise<CheckResult>;
  checkStorage(): Promise<CheckResult>;
  checkQueue(): Promise<CheckResult>;
  checkScheduler(): Promise<CheckResult>;
  checkProviders(): Promise<CheckResult>;
}
```

#### JobQueue

```typescript
class JobQueue<T = unknown> {
  constructor(options: JobQueueOptions, logger: ILogger);

  enqueue(
    type: string,
    payload: T,
    options?: {
      priority?: number;
      runAt?: Date;
      retryPolicy?: RetryPolicy;
    }
  ): Job<T>;

  dequeue(): Job<T> | undefined;
  acknowledge(jobId: string): void;
  fail(jobId: string, error: string): void;
  cancel(jobId: string): void;

  getJob(jobId: string): Job<T> | undefined;
  getDeadLetterQueue(): ReadonlyArray<DeadLetterEntry<T>>;
  getPendingCount(): number;
  getRunningCount(): number;
  getQueueLength(): number;
}
```

**Usage Example**:
```typescript
const queue = new JobQueue(
  { defaultRetryPolicy: { maxAttempts: 3, backoffMs: 1000 } },
  logger
);
const job = queue.enqueue('process-video', { videoId: '123' });
const dequeued = queue.dequeue();
```

#### SchedulerService

```typescript
class SchedulerService implements ISchedulerService {
  constructor(logger: ILogger);

  schedule(
    name: string,
    expression: string,
    type: 'cron' | 'interval',
    handler: () => Promise<void> | void
  ): string;

  unschedule(taskId: string): void;
  pause(taskId: string): void;
  resume(taskId: string): void;
  runNow(taskId: string): Promise<void>;
  shutdown(): Promise<void>;
  getTasks(): ReadonlyArray<ScheduledTask>;
}
```

**Usage Example**:
```typescript
const scheduler = new SchedulerService(logger);
const taskId = scheduler.schedule(
  'daily-task',
  '0 9 * * *',
  'cron',
  async () => {
    await performDailyTask();
  }
);
```

#### IStorageProvider Interface

```typescript
interface IStorageProvider {
  readonly name: string;

  upload(key: string, data: Buffer, contentType: string): Promise<StorageObject>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<StorageObject[]>;
}
```

#### InMemoryEventBus

```typescript
class InMemoryEventBus implements IEventBus {
  constructor(logger: ILogger);

  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void;
  unsubscribe(eventType: string, handler: EventHandler<DomainEvent>): void;
}
```

**Usage Example**:
```typescript
const eventBus = new InMemoryEventBus(logger);
eventBus.subscribe('plugin.installed', (event) => {
  console.log('Plugin installed:', event.payload.pluginId);
});
await eventBus.publish(createPluginInstalledEvent('my-plugin', { pluginId: 'my-plugin' }));
```

#### MetricsService

```typescript
class MetricsService implements IMetricsService {
  incrementJobsExecuted(): void;
  incrementJobsFailed(): void;
  recordExecutionTime(ms: number): void;
  recordProviderLatency(provider: ProviderType, ms: number): void;
  getSnapshot(): MetricsSnapshot;
}
```

---

### Shared Module

#### ILogger Interface

```typescript
interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): ILogger;
}
```

**Usage Example**:
```typescript
const logger = pino({ level: 'info' });
logger.info('Application started', { version: '1.0.0' });
const childLogger = logger.child({ component: 'ai-service' });
childLogger.debug('Processing request', { requestId: '123' });
```

#### Error Classes

```typescript
class AppError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}

class ConfigurationError extends AppError { }
class ProviderError extends AppError {
  readonly providerName: string;
}
class RepositoryError extends AppError { }
class NotFoundError extends AppError { }
class DuplicateError extends AppError { }
```

---

## Domain Model APIs

### AI Domain

```typescript
function createAIRequest(props: CreateAIRequestProps): AIRequest;
function createAIResponse(props: CreateAIResponseProps): AIResponse;
function createAIUsage(
  inputTokens: number,
  outputTokens: number,
  inputCostPerToken: number,
  outputCostPerToken: number
): AIUsage;
```

### Discovery Domain

```typescript
class Opportunity {
  static create(props: CreateOpportunityProps): Opportunity;
  static reconstitute(props: OpportunityProps): Opportunity;
  
  accept(): Opportunity;
  reject(): Opportunity;
  startProduction(): Opportunity;
  completeProduction(): Opportunity;
}

class OpportunityScore {
  static create(props: OpportunityScoreProps): OpportunityScore;
}
```

---

## Configuration API

```typescript
class AppConfig {
  static load(): AppConfig;

  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly openAiApiKey?: string;
  readonly googleDriveFolder?: string;
  readonly n8nBaseUrl?: string;
  readonly n8nApiKey?: string;
  readonly logLevel: string;
  readonly nodeEnv: string;
}
```

**Usage Example**:
```typescript
const config = AppConfig.load();
console.log(config.supabaseUrl);
```

---

## Current Limitations

1. **No HTTP APIs**: No REST or GraphQL endpoints exposed
2. **No CLI**: No command-line interface
3. **No RPC**: No remote procedure call interface
4. **No WebSocket**: No real-time communication interface
5. **Library-Only**: All APIs are programmatic TypeScript interfaces

## Future API Plans

Based on EES specifications, future APIs may include:

### REST API (EES-006 Marketplace)
- `GET /api/v1/marketplace/plugins`
- `GET /api/v1/marketplace/plugins/:pluginId`
- `POST /api/v1/marketplace/plugins/:pluginId/install`
- `DELETE /api/v1/marketplace/plugins/:pluginId/install`
- `GET /api/v1/marketplace/recommendations`
- `POST /api/v1/marketplace/submissions`
- `POST /api/v1/marketplace/plugins/:pluginId/reviews`

### Supabase Integration
- The existing `sql/001_schema.sql` defines tables for clients, projects, assets, jobs, etc.
- These would be accessible via Supabase's auto-generated REST API
- Currently not integrated with the TypeScript library

## Cross-References

- [Components](COMPONENTS.md) - Detailed component documentation
- [Data Flow](DATA_FLOW.md) - API interaction flows
- [Request Flow](REQUEST_FLOW.md) - Detailed request flows
- [EES Specifications](../EES/INDEX.md) - Future API specifications
