# Architecture Documentation

## Overview

This directory contains comprehensive architecture documentation for the Eunoia Media OS TypeScript library. The documentation describes the actual implementation in the codebase, using Mermaid diagrams where appropriate, and clearly marking assumptions.

## Important Architectural Note

**There is a significant architectural disconnect between the documented system purpose and the actual implementation:**

- **Documented Purpose** (README.md, docs/ARCHITECTURE.md): A Supabase + n8n video production management system with database tables for clients, projects, assets, jobs, and workflows
- **Actual Implementation** (src/): A standalone TypeScript library implementing AI routing, content discovery, and plugin infrastructure with no database integration

The TypeScript code in `src/` provides foundational capabilities that would be used by a production system, but there is currently no integration between the library layer and the Supabase database schema defined in `sql/001_schema.sql`.

## Documentation Files

### Core Architecture

- **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** - High-level system overview, architectural patterns, module organization, and key design decisions
- **[COMPONENTS.md](COMPONENTS.md)** - Detailed descriptions of all major components across AI, Discovery, Plugin, and Core modules
- **[FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)** - Repository and source code organization, file naming conventions, and build output structure
- **[CLASS_RELATIONSHIPS.md](CLASS_RELATIONSHIPS.md)** - Class relationships and dependencies organized by module, with Mermaid diagrams
- **[C4_MODEL.md](C4_MODEL.md)** - C4 model across multiple levels of abstraction (System Context, Containers, Components, Code, Deployment)

### Flow Documentation

- **[DATA_FLOW.md](DATA_FLOW.md)** - High-level data flow diagrams for AI requests, discovery pipeline, plugin lifecycle, job queue, scheduler, event bus, storage, and health checks
- **[REQUEST_FLOW.md](REQUEST_FLOW.md)** - Detailed request flows for each major subsystem with state diagrams and flowcharts
- **[STARTUP_FLOW.md](STARTUP_FLOW.md)** - Intended application startup sequence (no main entry point currently exists)

### Module-Specific Documentation

- **[PLUGIN_LIFECYCLE.md](PLUGIN_LIFECYCLE.md)** - Plugin lifecycle management, state transitions, event emission, dependency resolution, and security considerations
- **[DISCOVERY_PIPELINE.md](DISCOVERY_PIPELINE.md)** - Content discovery from multiple sources, scoring system, provider implementations, and repository integration
- **[AI_ROUTING.md](AI_ROUTING.md)** - Multi-provider AI routing, provider selection strategies, cost estimation, retry logic, and observability
- **[QUEUE_SYSTEM.md](QUEUE_SYSTEM.md)** - In-memory job queue with priority-based scheduling, retry policies, and dead letter queue handling
- **[SCHEDULER.md](SCHEDULER.md)** - Cron and interval-based task scheduling with custom cron implementation
- **[STORAGE.md](STORAGE.md)** - Storage abstraction layer with filesystem and Google Drive providers

### Inventory Documentation

- **[API_INVENTORY.md](API_INVENTORY.md)** - Programmatic APIs exposed by the library (no HTTP/REST APIs currently)
- **[EVENT_INVENTORY.md](EVENT_INVENTORY.md)** - Event types, payloads, and event bus behavior for plugin lifecycle events
- **[DATABASE.md](DATABASE.md)** - PostgreSQL 17 schema details, architectural disconnect with library, and missing tables

### Runtime and Deployment

- **[RUNTIME.md](RUNTIME.md)** - Intended runtime behavior, state management, concurrency model, error handling, and current limitations
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Intended deployment architecture, procedures, monitoring, security, and current limitations

### Navigation

- **[INDEX.md](INDEX.md)** - Index of all architecture documentation with descriptions and cross-references

## Cross-References

### EES Specifications

The architecture documentation cross-references the Eunoia Engineering Specifications (EES) where applicable:

- **[EES INDEX](../EES/INDEX.md)** - Catalog of all engineering specifications
- **[EES-006: Plugin Marketplace](../EES/EES-006-Plugin-Marketplace.md)** - Plugin marketplace feature specification

### Project Documentation

- **[Project README](../../README.md)** - Project overview and getting started
- **[Architecture Overview](../../docs/ARCHITECTURE.md)** - High-level system description (documents intended Supabase + n8n architecture)

## Documentation Principles

### Accuracy

- All documentation is based on the actual code in the repository
- No components or features are invented
- Assumptions are clearly marked
- Current limitations are explicitly stated

### Diagrams

- Mermaid diagrams are used for visual representation
- Diagrams reflect the actual implementation
- Diagrams include state transitions, data flows, and component relationships

### Cross-Referencing

- Documents reference each other for related information
- EES specifications are referenced where applicable
- File paths and component names are accurate

### Production Quality

- Documentation follows consistent formatting
- Clear headings and structure
- Code examples where helpful
- Tables for quick reference

## Current Limitations

The architecture documentation reflects the current state of the codebase, which has several limitations:

1. **No Runtime Application**: No main entry point, CLI, or web server
2. **No Database Integration**: Library doesn't use the Supabase database schema
3. **Incomplete Provider Implementations**: Claude, Gemini, and discovery providers are skeletons
4. **In-Memory State**: All state is lost on process restart
5. **No Plugin Permission Enforcement**: Security gap in plugin system
6. **No Distributed Support**: Single-process design only
7. **No Persistence**: No database or file-based persistence for queues, events, or metrics

## Future Enhancements

Each document includes a "Future Enhancements" section describing potential improvements based on the current limitations and the EES specifications.

## Contributing

When updating the architecture documentation:

1. Ensure changes reflect the actual code
2. Update related documents for consistency
3. Add Mermaid diagrams for visual clarity
4. Mark assumptions explicitly
5. Update the INDEX.md if adding new documents
