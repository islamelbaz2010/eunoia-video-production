# Data Flow

This document describes how data flows through the Eunoia Media OS TypeScript library across its major subsystems.

## AI Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant AIService
    participant AIRouter
    participant Provider
    participant Metrics
    participant EventBus

    Client->>AIService: request(aiRequest, policy)
    AIService->>AIRouter: select(request, policy)
    AIRouter->>AIRouter: filterCandidates()
    AIRouter->>AIRouter: applyStrategy()
    AIRouter-->>AIService: selected provider
    AIService->>Provider: execute(request)
    Provider-->>AIService: AIResponse
    AIService->>Metrics: recordExecutionTime()
    AIService->>Metrics: recordProviderLatency()
    AIService->>Metrics: incrementJobsExecuted()
    AIService->>AIService: recordTrace()
    AIService-->>Client: AIResponse
```

**Flow Description**:

1. Client creates an `AIRequest` with task type, prompt, and optional parameters
2. `AIService.request()` is called with the request and routing policy
3. `AIRouter.select()` filters available providers by:
   - Exclusion policy
   - Availability status
   - Task type support
4. Router applies the selected strategy (LowestCost, HighestQuality, Fastest, Manual, Balanced)
5. Selected provider executes the request
6. On success:
   - Metrics are recorded (execution time, provider latency, jobs executed)
   - Request trace is recorded
   - Response is returned to client
7. On failure:
   - Retry logic is triggered (if within max retries)
   - Metrics record job failure
   - Error trace is recorded

**Error Handling**:
- `AIRoutingError`: No available provider supports the task type - thrown immediately
- `AIProviderError`: Provider execution failure - triggers retry logic
- After max retries: Error is thrown to client

---

## Discovery Pipeline Flow

```mermaid
sequenceDiagram
    participant Client
    participant DiscoveryService
    participant ProviderRegistry
    participant Providers
    participant ScoringService
    participant Repository
    participant EventBus

    Client->>DiscoveryService: discover(params)
    DiscoveryService->>ProviderRegistry: getConfigured()
    ProviderRegistry-->>DiscoveryService: configured providers
    loop For each provider
        DiscoveryService->>Provider: fetchOpportunities(params)
        Provider-->>DiscoveryService: RawOpportunity[]
        loop For each opportunity
            DiscoveryService->>ScoringService: score(raw, params)
            ScoringService-->>DiscoveryService: OpportunityScore
            DiscoveryService->>DiscoveryService: Opportunity.create()
            DiscoveryService->>Repository: save(opportunity)
            Repository-->>DiscoveryService: saved Opportunity
        end
    end
    DiscoveryService-->>Client: Opportunity[]
```

**Flow Description**:

1. Client calls `DiscoveryService.discover()` with parameters (keywords, limit, since, providerNames)
2. Service resolves providers from registry:
   - If providerNames specified: only those providers
   - Otherwise: all configured providers
3. For each provider:
   - Fetch raw opportunities via provider's `fetchOpportunities()`
   - For each raw opportunity:
     - Score using `OpportunityScoringService` (relevance, engagement, timeliness, competition)
     - Create `Opportunity` domain object
     - Save to repository
     - Add to results array
4. Provider failures are logged but do not stop the overall discovery run
5. All opportunities are returned to client

**Error Handling**:
- Provider fetch failures: Logged and skipped, do not fail the entire run
- Repository save failures: Propagate to client (could lose data)

---

## Plugin Installation Flow

```mermaid
sequenceDiagram
    participant Client
    participant PluginLifecycleManager
    participant PluginRegistry
    participant Plugin
    participant EventBus
    participant Metrics

    Client->>PluginLifecycleManager: install(plugin, context, directory)
    PluginLifecycleManager->>PluginRegistry: register(plugin, directory)
    PluginRegistry-->>PluginLifecycleManager: PluginMetadata
    PluginLifecycleManager->>Plugin: install(context)
    Plugin-->>PluginLifecycleManager: (void)
    PluginLifecycleManager->>Metrics: recordLoad()
    PluginLifecycleManager->>EventBus: publish(plugin.installed)
    EventBus-->>PluginLifecycleManager: (void)
    PluginLifecycleManager-->>Client: PluginMetadata
```

**Flow Description**:

1. Client provides plugin instance, context, and directory
2. `PluginLifecycleManager.install()`:
   - Registers plugin in registry with metadata
   - Calls plugin's `install()` method
   - Records load time in metrics
   - Emits `plugin.installed` event
3. On success: Returns `PluginMetadata` to client
4. On failure:
   - Records failure in metrics
   - Emits `plugin.failed` event
   - Throws error to client

**Subsequent Flows** (configure → initialize → start):

```mermaid
sequenceDiagram
    participant Client
    participant PluginLifecycleManager
    participant ConfigValidator
    participant Plugin
    participant PluginRegistry
    participant EventBus

    Client->>PluginLifecycleManager: configure(pluginId, config)
    PluginLifecycleManager->>PluginRegistry: get(pluginId)
    PluginRegistry-->>PluginLifecycleManager: PluginMetadata
    PluginLifecycleManager->>ConfigValidator: applyDefaults()
    PluginLifecycleManager->>ConfigValidator: validate()
    PluginLifecycleManager->>Plugin: configure(config)
    PluginLifecycleManager->>PluginRegistry: updateConfig()
    PluginLifecycleManager->>PluginRegistry: updateStatus(Configured)

    Client->>PluginLifecycleManager: initialize(pluginId)
    PluginLifecycleManager->>Plugin: initialize()
    PluginLifecycleManager->>PluginRegistry: updateStatus(Initialized)

    Client->>PluginLifecycleManager: start(pluginId)
    PluginLifecycleManager->>Plugin: start()
    PluginLifecycleManager->>EventBus: publish(plugin.started)
    PluginLifecycleManager->>PluginRegistry: updateStatus(Running)
```

---

## Job Queue Processing Flow

```mermaid
sequenceDiagram
    participant Producer
    participant JobQueue
    participant Worker
    participant EventBus

    Producer->>JobQueue: enqueue(type, payload, options)
    JobQueue->>JobQueue: create Job with Pending status
    JobQueue-->>Producer: Job

    loop Worker polling
        Worker->>JobQueue: dequeue()
        JobQueue->>JobQueue: filter by status=Pending and runAt<=now
        JobQueue->>JobQueue: sort by priority (desc) then createdAt (asc)
        JobQueue->>JobQueue: set status=Running, increment attempts
        JobQueue-->>Worker: Job | undefined
        alt Job available
            Worker->>Worker: process job
            alt Success
                Worker->>JobQueue: acknowledge(jobId)
                JobQueue->>JobQueue: set status=Completed, set completedAt
            else Failure
                Worker->>JobQueue: fail(jobId, error)
                alt attempts < maxAttempts
                    JobQueue->>JobQueue: set status=Pending, calculate backoff, set runAt
                else Max attempts exceeded
                    JobQueue->>JobQueue: set status=Failed, move to dead letter queue
                end
            end
        else No jobs available
            Worker->>Worker: wait/poll again
        end
    end
```

**Flow Description**:

1. Producer enqueues job with type, payload, and optional priority/runAt/retryPolicy
2. Job is created with:
   - Unique ID
   - Pending status
   - Priority (default 0)
   - Max attempts from retry policy
   - Run time (default now)
3. Worker polls queue for available jobs
4. Queue selects next job:
   - Filter: status=Pending AND runAt <= now
   - Sort: priority DESC, createdAt ASC (FIFO within same priority)
   - Set status=Running, increment attempts
5. Worker processes job
6. On success:
   - Worker calls `acknowledge()`
   - Job status set to Completed
   - completedAt timestamp set
7. On failure:
   - Worker calls `fail()` with error message
   - If attempts < maxAttempts:
     - Status set to Pending
     - Run time set to now + exponential backoff
   - If attempts >= maxAttempts:
     - Status set to Failed
     - Job moved to dead letter queue

**Retry Backoff Formula**: `backoffMs * 2^(attempt - 1)`

---

## Scheduler Task Execution Flow

```mermaid
sequenceDiagram
    participant Client
    participant SchedulerService
    participant Timer
    participant TaskHandler

    Client->>SchedulerService: schedule(name, expression, type, handler)
    SchedulerService->>SchedulerService: computeNextRunAt()
    alt type=interval
        SchedulerService->>Timer: setInterval(expression ms)
    else type=cron
        SchedulerService->>SchedulerService: nextCronDate(expression)
        SchedulerService->>Timer: setTimeout(delay to next run)
    end
    Timer->>Timer: unref() (don't block exit)
    SchedulerService-->>Client: taskId

    loop Task execution
        Timer->>TaskHandler: handler()
        TaskHandler-->>Timer: (void)
        alt type=cron
            Timer->>SchedulerService: scheduleCronTick() for next run
        end
    end
```

**Flow Description**:

1. Client schedules task with name, expression, type (cron/interval), and handler
2. Scheduler computes next run time:
   - Interval: now + expression (milliseconds)
   - Cron: parsed via custom `nextCronDate()` function
3. Timer is set:
   - Interval: `setInterval(expression)`
   - Cron: `setTimeout(delay to next run)`
4. Timer is unref'd to not block process exit
5. On timer fire:
   - Handler is executed
   - Errors are logged but do not stop scheduler
   - For cron: next run is scheduled recursively
6. Client can pause/resume/unschedule tasks

---

## Event Bus Flow

```mermaid
sequenceDiagram
    participant Publisher
    participant EventBus
    participant Handler1
    participant Handler2
    participant Logger

    Publisher->>EventBus: publish(event)
    EventBus->>EventBus: get handlers for event.eventType
    alt Handlers exist
        loop For each handler
            EventBus->>Handler: handler(event)
            alt Success
                Handler-->>EventBus: (void)
            else Failure
                Handler-->>EventBus: error
                EventBus->>Logger: error logged
                EventBus->>EventBus: continue to next handler
            end
        end
    else No handlers
        EventBus-->>Publisher: (void)
    end
```

**Flow Description**:

1. Publisher publishes domain event to event bus
2. Event bus retrieves all handlers subscribed to event type
3. For each handler:
   - Handler is called with event
   - On success: Continue to next handler
   - On failure: Error is logged, but other handlers still execute
4. Event bus never throws to publisher (errors are isolated)

**Event Isolation**: Handler errors do not stop other handlers from executing

---

## Storage Provider Flow

```mermaid
sequenceDiagram
    participant Client
    participant StorageProvider
    participant Filesystem

    Client->>StorageProvider: upload(key, data, contentType)
    StorageProvider->>StorageProvider: resolvePath(key)
    StorageProvider->>Filesystem: mkdir(path.dirname(filePath))
    StorageProvider->>Filesystem: writeFile(filePath, data)
    StorageProvider->>Filesystem: stat(filePath)
    StorageProvider-->>Client: StorageObject

    Client->>StorageProvider: download(key)
    StorageProvider->>StorageProvider: resolvePath(key)
    StorageProvider->>Filesystem: readFile(filePath)
    StorageProvider-->>Client: Buffer

    Client->>StorageProvider: list(prefix)
    alt prefix provided
        StorageProvider->>StorageProvider: listRecursive(baseDir/prefix, prefix)
    else no prefix
        StorageProvider->>StorageProvider: listRecursive(baseDir, '')
    end
    StorageProvider->>Filesystem: readdir with file types
    loop For each entry
        alt directory
            StorageProvider->>StorageProvider: listRecursive recursively
        else file
            StorageProvider->>Filesystem: stat
        end
    end
    StorageProvider-->>Client: StorageObject[]
```

**Flow Description**:

1. Upload:
   - Resolve full path from base directory and key
   - Create parent directories if needed
   - Write file data
   - Get file stats for size and modification time
   - Return `StorageObject` metadata

2. Download:
   - Resolve full path
   - Read file contents
   - Return buffer

3. List:
   - Determine search directory (base or with prefix)
   - Recursively traverse directory tree
   - For each file: get stats, create `StorageObject`
   - Return array of objects

---

## Health Check Flow

```mermaid
sequenceDiagram
    participant Client
    participant HealthService
    participant Database
    participant StorageProviders
    participant Queues
    participant Schedulers
    participant AIProviders

    Client->>HealthService: check()
    par Parallel checks
        HealthService->>Database: checkDatabase()
        Database-->>HealthService: CheckResult
    and
        HealthService->>StorageProviders: checkStorage()
        StorageProviders-->>HealthService: CheckResult
    and
        HealthService->>Queues: checkQueue()
        Queues-->>HealthService: CheckResult
    and
        HealthService->>Schedulers: checkScheduler()
        Schedulers-->>HealthService: CheckResult
    and
        HealthService->>AIProviders: checkProviders()
        AIProviders-->>HealthService: CheckResult
    end
    HealthService->>HealthService: computeOverallStatus()
    HealthService-->>Client: HealthStatus
```

**Flow Description**:

1. Client requests health check
2. All checks run in parallel:
   - **Database**: HTTP request to Supabase health endpoint
   - **Storage**: `exists()` check on each provider
   - **Queue**: Aggregate queue length
   - **Scheduler**: Count enabled/total tasks
   - **AI Providers**: List available providers
3. Overall status computed:
   - Any fail → unhealthy
   - Any warn (no fail) → degraded
   - All pass → healthy
4. Health status returned with all check results

---

## Configuration Loading Flow

```mermaid
sequenceDiagram
    participant Application
    participant AppConfig
    participant Environment
    participant Zod

    Application->>AppConfig: load()
    AppConfig->>Environment: read env vars
    Environment-->>AppConfig: env object
    AppConfig->>Zod: validate schema
    Zod-->>AppConfig: validation result
    alt Valid
        AppConfig-->>Application: AppConfig instance
    else Invalid
        AppConfig->>Application: throw ConfigurationError
    end
```

**Flow Description**:

1. Application requests configuration
2. `AppConfig` reads environment variables
3. Zod schema validates:
   - Required fields present
   - Correct data types
   - Valid values
4. On validation success: Returns typed `AppConfig` instance
5. On validation failure: Throws `ConfigurationError` with details
