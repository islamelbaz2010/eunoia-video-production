# Architecture Documentation Index

This index provides navigation to all architecture documentation for the Eunoia Media OS TypeScript library.

## Quick Start

- **[README.md](README.md)** - Introduction to the architecture documentation and important architectural notes

## Core Architecture

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | High-level system overview, architectural patterns, module organization, and key design decisions |
| [COMPONENTS.md](COMPONENTS.md) | Detailed descriptions of all major components across AI, Discovery, Plugin, and Core modules |
| [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) | Repository and source code organization, file naming conventions, and build output structure |
| [CLASS_RELATIONSHIPS.md](CLASS_RELATIONSHIPS.md) | Class relationships and dependencies organized by module, with Mermaid diagrams |
| [C4_MODEL.md](C4_MODEL.md) | C4 model across multiple levels of abstraction (System Context, Containers, Components, Code, Deployment) |

## Flow Documentation

| Document | Description |
|----------|-------------|
| [DATA_FLOW.md](DATA_FLOW.md) | High-level data flow diagrams for AI requests, discovery pipeline, plugin lifecycle, job queue, scheduler, event bus, storage, and health checks |
| [REQUEST_FLOW.md](REQUEST_FLOW.md) | Detailed request flows for each major subsystem with state diagrams and flowcharts |
| [STARTUP_FLOW.md](STARTUP_FLOW.md) | Intended application startup sequence (no main entry point currently exists) |

## Module-Specific Documentation

| Document | Description |
|----------|-------------|
| [PLUGIN_LIFECYCLE.md](PLUGIN_LIFECYCLE.md) | Plugin lifecycle management, state transitions, event emission, dependency resolution, and security considerations |
| [DISCOVERY_PIPELINE.md](DISCOVERY_PIPELINE.md) | Content discovery from multiple sources, scoring system, provider implementations, and repository integration |
| [AI_ROUTING.md](AI_ROUTING.md) | Multi-provider AI routing, provider selection strategies, cost estimation, retry logic, and observability |
| [QUEUE_SYSTEM.md](QUEUE_SYSTEM.md) | In-memory job queue with priority-based scheduling, retry policies, and dead letter queue handling |
| [SCHEDULER.md](SCHEDULER.md) | Cron and interval-based task scheduling with custom cron implementation |
| [STORAGE.md](STORAGE.md) | Storage abstraction layer with filesystem and Google Drive providers |

## Inventory Documentation

| Document | Description |
|----------|-------------|
| [API_INVENTORY.md](API_INVENTORY.md) | Programmatic APIs exposed by the library (no HTTP/REST APIs currently) |
| [EVENT_INVENTORY.md](EVENT_INVENTORY.md) | Event types, payloads, and event bus behavior for plugin lifecycle events |
| [DATABASE.md](DATABASE.md) | PostgreSQL 17 schema details, architectural disconnect with library, and missing tables |

## Runtime and Deployment

| Document | Description |
|----------|-------------|
| [RUNTIME.md](RUNTIME.md) | Intended runtime behavior, state management, concurrency model, error handling, and current limitations |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Intended deployment architecture, procedures, monitoring, security, and current limitations |

## Related Documentation

### EES Specifications

- [EES INDEX](../EES/INDEX.md) - Catalog of all engineering specifications
- [EES-006: Plugin Marketplace](../EES/EES-006-Plugin-Marketplace.md) - Plugin marketplace feature specification

### Project Documentation

- [Project README](../../README.md) - Project overview and getting started
- [Architecture Overview](../../docs/ARCHITECTURE.md) - High-level system description (documents intended Supabase + n8n architecture)

## Document Statistics

- **Total Documents**: 21
- **Total Files Created**: 22 (including this INDEX.md)
- **Mermaid Diagrams**: 30+
- **Cross-References**: Extensive linking between documents

## Key Architectural Notes

### Important Disconnect

There is a significant architectural disconnect between the documented system purpose and the actual implementation:

- **Documented Purpose**: A Supabase + n8n video production management system with database tables for clients, projects, assets, jobs, and workflows
- **Actual Implementation**: A standalone TypeScript library implementing AI routing, content discovery, and plugin infrastructure with no database integration

### Current Limitations

The codebase has several limitations documented in each file:

1. No runtime application (no main entry point)
2. No database integration
3. Incomplete provider implementations (Claude, Gemini, discovery providers)
4. In-memory state (lost on restart)
5. No plugin permission enforcement
6. Single-process design only
7. No persistence for queues, events, or metrics

## Documentation Principles

- **Accuracy**: All documentation is based on actual code
- **No Invention**: No components or features are invented
- **Clear Assumptions**: Assumptions are explicitly marked
- **Mermaid Diagrams**: Visual representation of flows and relationships
- **Cross-Referencing**: Links to related documents and EES specifications
- **Production Quality**: Consistent formatting and structure

## Version

- **Created**: 2024
- **Based on**: Repository state as of documentation generation
- **Status**: Reflects current implementation state
