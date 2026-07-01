# Class Relationships

## Overview

This document describes the key class relationships and dependencies within the Eunoia Media OS TypeScript library. Relationships are organized by module and layer.

## AI Module Relationships

### AIService

```mermaid
classDiagram
    AIService --> AIRouter : uses
    AIService --> IMetricsService : uses
    AIService --> ILogger : uses
    AIService --> IAIProvider : creates
    AIService --> AIRequest : processes
    AIService --> AIResponse : returns
    AIService --> RequestTrace : records
    
    class AIService {
      +constructor(router, metrics, logger)
      +request(aiRequest, policy) AIResponse
      +requestWithRetry(aiRequest, policy, maxRetries) AIResponse
      +getTraces() RequestTrace[]
    }
    
    class AIRouter {
      +constructor(logger)
      +register(provider)
      +select(request, policy) IAIProvider
      +getProviders() IAIProvider[]
    }
    
    class IMetricsService {
      <<interface>>
      +incrementJobsExecuted()
      +incrementJobsFailed()
      +recordExecutionTime(ms)
      +recordProviderLatency(provider, ms)
      +getSnapshot() MetricsSnapshot
    }
```

### AIRouter

```mermaid
classDiagram
    AIRouter --> IAIProvider : manages
    AIRouter --> RoutingPolicy : uses
    AIRouter --> RoutingStrategy : uses
    AIRouter --> AIRequest : evaluates
    AIRouter --> ILogger : uses
    
    class AIRouter {
      -providers: Map~ProviderType,IAIProvider~
      +register(provider)
      +unregister(providerType)
      +select(request, policy) IAIProvider
      +filterCandidates(request, policy) IAIProvider[]
      +applyStrategy(candidates, request, policy) IAIProvider
    }
    
    class IAIProvider {
      <<interface>>
      +readonly type: ProviderType
      +readonly name: string
      +initialize(config)
      +isAvailable() boolean
      +supports(taskType) boolean
      +estimateCost(request) ProviderCost
      +estimateLatency(request) number
      +execute(request) AIResponse
      +health() ProviderHealth
      +shutdown()
      +getCapabilities() ProviderCapabilities
      +getLimits() ProviderLimits
    }
```

### OpenAIProvider

```mermaid
classDiagram
    OpenAIProvider ..| IAIProvider : implements
    OpenAIProvider --> ILogger : uses
    OpenAIProvider --> CostEstimator : uses
    OpenAIProvider --> AIRequest : processes
    OpenAIProvider --> AIResponse : creates
    OpenAIProvider --> AIUsage : creates
    
    class OpenAIProvider {
      +readonly type: ProviderType
      +readonly name: string
      -apiKey: string | null
      -available: boolean
      -estimator: CostEstimator
      +initialize(config)
      +isAvailable() boolean
      +supports(taskType) boolean
      +estimateCost(request) ProviderCost
      +estimateLatency(request) number
      +execute(request) AIResponse
      +health() ProviderHealth
      +shutdown()
      +getCapabilities() ProviderCapabilities
      +getLimits() ProviderLimits
    }
    
    class CostEstimator {
      +estimateRequestTokens(request) {input, output}
      +estimateTokenCount(text) number
    }
```

### ConversationMemory

```mermaid
classDiagram
    ConversationMemory --> IMemoryStore : uses
    ConversationMemory --> Message : stores
    ConversationMemory --> ILogger : uses
    
    class ConversationMemory {
      -sessionId: string
      -store: IMemoryStore
      +addUserMessage(content)
      +addAssistantMessage(content)
      +addSystemMessage(content)
      +getHistory(limit) Message[]
      +clear()
      +buildContext() string
    }
    
    class IMemoryStore {
      <<interface>>
      +set(sessionId, key, value)
      +get(sessionId, key)
      +delete(sessionId, key)
      +clear(sessionId)
    }
    
    class Message {
      +role: 'user' | 'assistant' | 'system'
      +content: string
      +timestamp: Date
    }
```

## Discovery Module Relationships

### DiscoveryService

```mermaid
classDiagram
    DiscoveryService --> IProviderRegistry : uses
    DiscoveryService --> IOpportunityRepository : uses
    DiscoveryService --> IOpportunityScoringService : uses
    DiscoveryService --> ILogger : uses
    DiscoveryService --> IDiscoveryProvider : calls
    DiscoveryService --> Opportunity : creates
    DiscoveryService --> OpportunityScore : uses
    
    class DiscoveryService {
      +constructor(registry, repository, scoring, logger)
      +discover(params) Opportunity[]
      +getOpportunities(filter) Opportunity[]
      +reviewOpportunity(id, accepted) Opportunity
    }
    
    class IProviderRegistry {
      <<interface>>
      +register(provider)
      +unregister(name)
      +get(name) IDiscoveryProvider
      +getAll() IDiscoveryProvider[]
      +getConfigured() IDiscoveryProvider[]
    }
    
    class IOpportunityRepository {
      <<interface>>
      +save(opportunity) Opportunity
      +findById(id) Opportunity
      +findAll(filter) Opportunity[]
      +update(id, patch) Opportunity
      +delete(id)
      +count(filter) number
    }
    
    class IOpportunityScoringService {
      <<interface>>
      +score(raw, params) OpportunityScore
    }
```

### OpportunityScoringService

```mermaid
classDiagram
    OpportunityScoringService --> RawOpportunity : processes
    OpportunityScoringService --> OpportunityScore : creates
    OpportunityScoringService --> FetchParams : uses
    
    class OpportunityScoringService {
      +score(raw, params) OpportunityScore
      -computeRelevance(raw, params) number
      -computeEngagement(raw) number
      -computeTimeliness(raw) number
      -computeCompetition(raw) number
    }
    
    class RawOpportunity {
      +title: string
      +summary: string
      +url: string
      +publishedAt: Date | null
      +metadata: Record
    }
    
    class OpportunityScore {
      +relevance: number
      +engagement: number
      +timeliness: number
      +competition: number
      +overall: number
    }
```

### RssProvider

```mermaid
classDiagram
    RssProvider ..| IDiscoveryProvider : implements
    RssProvider --> ILogger : uses
    RssProvider --> RawOpportunity : creates
    
    class RssProvider {
      +readonly name: string
      +readonly source: DiscoverySource
      -feedUrl: string
      +isConfigured() boolean
      +fetchOpportunities(params) RawOpportunity[]
    }
    
    class IDiscoveryProvider {
      <<interface>>
      +readonly name: string
      +readonly source: DiscoverySource
      +isConfigured() boolean
      +fetchOpportunities(params) RawOpportunity[]
    }
```

## Plugin Module Relationships

### PluginLifecycleManager

```mermaid
classDiagram
    PluginLifecycleManager --> PluginRegistry : uses
    PluginLifecycleManager --> IEventBus : uses
    PluginLifecycleManager --> PluginMetrics : uses
    PluginLifecycleManager --> ILogger : uses
    PluginLifecycleManager --> IPlugin : manages
    PluginLifecycleManager --> PluginContext : creates
    PluginLifecycleManager --> PluginMetadata : returns
    PluginLifecycleManager --> DomainEvent : publishes
    
    class PluginLifecycleManager {
      +constructor(registry, eventBus, metrics, logger)
      +install(plugin, context, directory) PluginMetadata
      +configure(pluginId, config)
      +initialize(pluginId)
      +start(pluginId)
      +pause(pluginId)
      +resume(pluginId)
      +stop(pluginId)
      +shutdown(pluginId)
      +uninstall(pluginId)
      +health(pluginId) PluginHealth
      +startAll()
      +stopAll()
    }
    
    class PluginRegistry {
      -entries: Map~string,MutableMetadata~
      -plugins: Map~string,IPlugin~
      +register(plugin, directory) PluginMetadata
      +unregister(pluginId)
      +find(pluginId) PluginMetadata
      +get(pluginId) PluginMetadata
      +getPlugin(pluginId) IPlugin
      +list() PluginMetadata[]
      +search(query) PluginMetadata[]
      +enable(pluginId)
      +disable(pluginId)
      +reload(pluginId)
      +updateStatus(pluginId, status)
      +updateConfig(pluginId, config)
    }
    
    class IPlugin {
      <<interface>>
      +readonly manifest: PluginManifest
      +install(context)
      +configure(config)
      +initialize()
      +start()
      +pause()
      +resume()
      +stop()
      +shutdown()
      +health() PluginHealth
      +uninstall()
    }
```

### PluginLoader

```mermaid
classDiagram
    PluginLoader --> ILogger : uses
    PluginLoader --> PluginManifest : validates
    PluginLoader --> PluginManifest : returns
    PluginLoader --> DependencyResolver : uses
    PluginLoader --> ManifestValidator : uses
    PluginLoader --> IPlugin : creates
    
    class PluginLoader {
      -baseDir: string
      +loadManifestFromDirectory(dir) PluginManifest
      +discoverManifests() {manifest, directory}[]
      +resolveLoadOrder(manifests) PluginManifest[]
      +validateManifest(raw) PluginManifest
      +createPluginFromFactory(factory, manifest) IPlugin
    }
    
    class DependencyResolver {
      +resolveLoadOrder(manifests) PluginManifest[]
      -satisfyVersionConstraint(version, constraint) boolean
      -compareVersions(v1, v2) number
      -detectCircularDependencies(manifests)
      -topologicalSort(manifests) PluginManifest[]
    }
    
    class ManifestValidator {
      +validate(raw) PluginManifest
      -validateRequiredFields(manifest)
      -validateSemver(version)
      -validatePermissions(permissions)
      -validateConfigSchema(schema)
    }
```

## Core Module Relationships

### Engine

```mermaid
classDiagram
    Engine --> AppConfig : uses
    Engine --> ILogger : uses
    Engine --> IStorageProvider : registers
    Engine --> ISchedulerService : registers
    Engine --> JobQueue : registers
    Engine --> HealthService : uses
    Engine --> HealthStatus : returns
    
    class Engine {
      -config: AppConfig
      -logger: ILogger
      -storageProviders: IStorageProvider[]
      -schedulers: ISchedulerService[]
      -queues: Array
      -started: boolean
      +constructor(config, logger)
      +start()
      +stop()
      +registerStorageProvider(provider)
      +registerScheduler(scheduler)
      +registerQueue(queue)
      +getHealth() HealthStatus
    }
    
    class HealthService {
      -deps: HealthServiceDependencies
      -logger: ILogger
      +check() HealthStatus
      +checkDatabase() CheckResult
      +checkStorage() CheckResult
      +checkQueue() CheckResult
      +checkScheduler() CheckResult
      +checkProviders() CheckResult
    }
```

### JobQueue

```mermaid
classDiagram
    JobQueue --> Job : manages
    JobQueue --> RetryPolicy : uses
    JobQueue --> ILogger : uses
    JobQueue --> DeadLetterEntry : creates
    
    class JobQueue {
      -jobs: Map~string,MutableJob~
      -deadLetterQueue: DeadLetterEntry[]
      -defaultRetryPolicy: RetryPolicy
      +enqueue(type, payload, options) Job
      +dequeue() Job
      +acknowledge(jobId)
      +fail(jobId, error)
      +cancel(jobId)
      +getJob(jobId) Job
      +getDeadLetterQueue() DeadLetterEntry[]
      +getPendingCount() number
      +getRunningCount() number
      +getQueueLength() number
    }
    
    class Job {
      +readonly id: string
      +readonly type: string
      +readonly payload: T
      +readonly priority: number
      +readonly status: JobStatus
      +readonly attempts: number
      +readonly maxAttempts: number
      +readonly runAt: Date
      +readonly createdAt: Date
      +readonly completedAt: Date | null
      +readonly error: string | null
    }
    
    class RetryPolicy {
      +maxAttempts: number
      +backoffMs: number
    }
```

### SchedulerService

```mermaid
classDiagram
    SchedulerService --> ScheduledTask : manages
    SchedulerService --> ILogger : uses
    SchedulerService --> TaskEntry : uses
    
    class SchedulerService {
      -entries: Map~string,TaskEntry~
      +schedule(name, expression, type, handler) string
      +unschedule(taskId)
      +pause(taskId)
      +resume(taskId)
      +runNow(taskId)
      +shutdown()
      +getTasks() ScheduledTask[]
      -startTimer(entry)
      -scheduleCronTick(entry)
      -executeTask(task)
      -clearTimer(entry)
      -computeNextRunAt(type, expression) Date
    }
    
    class ScheduledTask {
      +readonly id: string
      +readonly name: string
      +readonly type: 'cron' | 'interval'
      +readonly expression: string
      +readonly enabled: boolean
      +readonly lastRunAt: Date | null
      +readonly nextRunAt: Date | null
    }
    
    class TaskEntry {
      +task: MutableTask
      +timer: Timer | null
    }
```

### InMemoryEventBus

```mermaid
classDiagram
    InMemoryEventBus ..| IEventBus : implements
    InMemoryEventBus --> ILogger : uses
    InMemoryEventBus --> DomainEvent : publishes
    InMemoryEventBus --> EventHandler : calls
    
    class InMemoryEventBus {
      -handlers: Map~string,Set~EventHandler~~
      +publish(event)
      +subscribe(eventType, handler)
      +unsubscribe(eventType, handler)
    }
    
    class IEventBus {
      <<interface>>
      +publish(event)
      +subscribe(eventType, handler)
      +unsubscribe(eventType, handler)
    }
    
    class DomainEvent {
      +eventType: string
      +eventId: string
      +timestamp: Date
      +payload: unknown
    }
    
    class EventHandler {
      <<type>>
      (event: T) => Promise | void
    }
```

### MetricsService

```mermaid
classDiagram
    MetricsService ..| IMetricsService : implements
    MetricsService --> MetricsSnapshot : creates
    
    class MetricsService {
      -jobsExecuted: number
      -jobsFailed: number
      -executionTimeMs: number
      -executionCount: number
      -providerLatencies: Map~ProviderType,number[]
      +incrementJobsExecuted()
      +incrementJobsFailed()
      +recordExecutionTime(ms)
      +recordProviderLatency(provider, ms)
      +getSnapshot() MetricsSnapshot
    }
    
    class MetricsSnapshot {
      +jobsExecuted: number
      +jobsFailed: number
      +averageExecutionTimeMs: number
      +queueLength: number
      +averageProviderLatency: Map
    }
```

### LocalStorageProvider

```mermaid
classDiagram
    LocalStorageProvider ..| IStorageProvider : implements
    LocalStorageProvider --> StorageObject : creates
    LocalStorageProvider --> AppError : throws
    
    class LocalStorageProvider {
      +readonly name: string
      -baseDirectory: string
      +upload(key, data, contentType) StorageObject
      +download(key) Buffer
      +delete(key)
      +exists(key) boolean
      +list(prefix) StorageObject[]
      -resolvePath(key) string
      -listRecursive(dir, prefix) StorageObject[]
    }
    
    class IStorageProvider {
      <<interface>>
      +readonly name: string
      +upload(key, data, contentType) StorageObject
      +download(key) Buffer
      +delete(key)
      +exists(key) boolean
      +list(prefix) StorageObject[]
    }
    
    class StorageObject {
      +key: string
      +size: number
      +lastModified: Date
      +contentType: string
    }
```

## Shared Module Relationships

### Error Hierarchy

```mermaid
classDiagram
    AppError <|-- ConfigurationError
    AppError <|-- ProviderError
    AppError <|-- RepositoryError
    AppError <|-- NotFoundError
    AppError <|-- DuplicateError
    
    class AppError {
      +readonly code: string
      +constructor(message, code)
    }
    
    class ConfigurationError {
      +constructor(message)
    }
    
    class ProviderError {
      +readonly providerName: string
      +constructor(message, providerName)
    }
    
    class RepositoryError {
      +constructor(message)
    }
    
    class NotFoundError {
      +constructor(message)
    }
    
    class DuplicateError {
      +constructor(message)
    }
```

### Plugin Error Hierarchy

```mermaid
classDiagram
    PluginError <|-- PluginNotFoundError
    PluginError <|-- PluginAlreadyRegisteredError
    PluginError <|-- PluginManifestError
    PluginError <|-- PluginConfigurationError
    PluginError <|-- PluginDependencyError
    PluginError <|-- PluginCircularDependencyError
    PluginError <|-- PluginLifecycleError
    
    class PluginError {
      +readonly pluginId: string
      +constructor(message, pluginId)
    }
    
    class PluginNotFoundError {
      +constructor(pluginId)
    }
    
    class PluginAlreadyRegisteredError {
      +constructor(pluginId)
    }
    
    class PluginManifestError {
      +constructor(message)
    }
    
    class PluginConfigurationError {
      +readonly errors: string[]
      +constructor(pluginId, errors)
    }
    
    class PluginDependencyError {
      +constructor(pluginId, message)
    }
    
    class PluginCircularDependencyError {
      +constructor(pluginId, cycle)
    }
    
    class PluginLifecycleError {
      +readonly operation: string
      +constructor(pluginId, operation, message)
    }
```

### AI Error Hierarchy

```mermaid
classDiagram
    AIError <|-- AIRoutingError
    AIError <|-- AIProviderError
    AIError <|-- AIProviderUnavailableError
    AIError <|-- AIProviderNotImplementedError
    
    class AIError {
      +readonly provider: ProviderType
      +constructor(message, provider)
    }
    
    class AIRoutingError {
      +constructor(message)
    }
    
    class AIProviderError {
      +constructor(message, provider)
    }
    
    class AIProviderUnavailableError {
      +constructor(provider)
    }
    
    class AIProviderNotImplementedError {
      +constructor(provider)
    }
```

## Cross-Module Relationships

### Engine Integration

```mermaid
classDiagram
    Engine --> HealthService : uses
    HealthService --> IStorageProvider : checks
    HealthService --> ISchedulerService : checks
    HealthService --> JobQueue : checks
    HealthService --> IAIProvider : checks
    
    class Engine {
      +getHealth() HealthStatus
    }
    
    class HealthService {
      +check() HealthStatus
      +checkStorage() CheckResult
      +checkScheduler() CheckResult
      +checkQueue() CheckResult
      +checkProviders() CheckResult
    }
```

### Plugin System Integration

```mermaid
classDiagram
    PluginLifecycleManager --> PluginRegistry : uses
    PluginLifecycleManager --> IEventBus : uses
    PluginLifecycleManager --> IPlugin : manages
    PluginRegistry --> IPlugin : stores
    PluginLoader --> IPlugin : creates
    
    class PluginLifecycleManager {
      +install(plugin, context, directory)
      +start(pluginId)
      +stop(pluginId)
    }
    
    class PluginRegistry {
      +register(plugin, directory)
      +getPlugin(pluginId) IPlugin
    }
    
    class PluginLoader {
      +createPluginFromFactory(factory, manifest) IPlugin
    }
```

## Dependency Injection Patterns

### Constructor Injection

Most classes use constructor injection for dependencies:

```typescript
class AIService {
  constructor(
    private readonly router: AIRouter,
    private readonly metrics: IMetricsService,
    private readonly logger: ILogger
  ) {}
}
```

### Interface-Based Dependencies

All major dependencies are interfaces:

```typescript
interface IEventBus {
  publish(event: T): Promise;
  subscribe(eventType: string, handler: EventHandler): void;
}
```

### Factory Methods

Domain objects use factory methods:

```typescript
class Opportunity {
  static create(props: CreateOpportunityProps): Opportunity;
  static reconstitute(props: OpportunityProps): Opportunity;
}
```

## Cross-References

- [Components](COMPONENTS.md) - Detailed component documentation
- [Folder Structure](FOLDER_STRUCTURE.md) - File organization
- [Architecture Overview](ARCHITECTURE_OVERVIEW.md) - Module organization
