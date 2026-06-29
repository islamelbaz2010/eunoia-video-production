# Architecture

## System Overview

Eunoia Media OS is a headless production management backend. It exposes data through Supabase's auto-generated REST and GraphQL APIs, handles file storage through Supabase Storage, and automates multi-step production pipelines through n8n.

```
┌─────────────────────────────────────────────────────┐
│                   Eunoia Media OS                   │
│                                                     │
│  ┌────────────┐    ┌────────────┐    ┌───────────┐  │
│  │  Clients   │    │  Projects  │    │  Assets   │  │
│  │  & Auth    │───▶│  & Jobs    │───▶│  Storage  │  │
│  └────────────┘    └────────────┘    └───────────┘  │
│         │                │                 │         │
│         ▼                ▼                 ▼         │
│  ┌──────────────────────────────────────────────┐   │
│  │           PostgreSQL 17 (Supabase)            │   │
│  │     PostgREST · Auth · Realtime · Storage     │   │
│  └──────────────────────────────────────────────┘   │
│                          │                           │
│                          ▼                           │
│                   ┌────────────┐                     │
│                   │    n8n     │                     │
│                   │ Automation │                     │
│                   └────────────┘                     │
└─────────────────────────────────────────────────────┘
```

---

## Components

### Supabase (Primary Backend)

Supabase provides the full backend stack:

- **PostgreSQL 17** — relational database for all structured data.
- **PostgREST** — zero-config REST API auto-generated from the schema.
- **Supabase Auth** — JWT-based authentication with email, OAuth, and service-role tokens.
- **Supabase Realtime** — WebSocket subscriptions on database change events.
- **Supabase Storage** — S3-compatible object storage for media files, organised into buckets per asset class.

### n8n (Workflow Automation)

n8n orchestrates the production pipeline by reacting to Supabase webhooks and Realtime events:

- Triggers on job status changes (e.g., a job moving to `in_progress`).
- Calls external AI APIs for script generation, thumbnail ideation, and captioning.
- Writes results back to the database via the Supabase REST API.
- Exports workflow definitions as JSON under `n8n/` for version control.

### Prompt Library (`prompts/`)

A structured library of AI prompt templates stored as versioned files and mirrored in the `prompt_templates` database table. Each template records its variables, category, and version so that n8n workflows can retrieve and render the correct prompt at runtime.

---

## Directory Layout

```
eunoia-video-production/
├── assets/              Static brand files, thumbnails, motion templates
├── docs/                Developer and operator documentation
├── n8n/                 Exported n8n workflow JSON (source-controlled)
├── prompts/             Prompt template files (mirrored in DB)
├── scripts/             Operational shell scripts
├── sql/                 Ordered PostgreSQL migration files
├── supabase/            Supabase CLI project configuration
└── workflows/           High-level production workflow definitions (YAML/JSON)
```

---

## Data Model

### Enum Types

| Enum | Values |
|---|---|
| `project_status` | `draft`, `active`, `in_review`, `delivered`, `archived` |
| `asset_type` | `footage`, `audio`, `graphic`, `caption`, `thumbnail`, `deliverable`, `export` |
| `job_status` | `pending`, `in_progress`, `blocked`, `complete`, `cancelled` |
| `production_stage` | `pre_production`, `production`, `post_production`, `review`, `delivery` |
| `workflow_trigger` | `manual`, `webhook`, `schedule`, `database_event` |

### Core Tables

#### `clients`

Organisations or individuals commissioning work. Each client may have multiple projects.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Company or individual name |
| `contact_name` | `text` | Primary point of contact |
| `contact_email` | `text` | Unique contact email |
| `billing_address` | `text` | Optional billing address |
| `metadata` | `jsonb` | Arbitrary additional fields |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

#### `projects`

A video production engagement linked to a client.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `client_id` | `uuid` | FK → `clients.id` |
| `title` | `text` | Project title |
| `description` | `text` | Brief description |
| `status` | `project_status` | Current lifecycle state |
| `stage` | `production_stage` | Current production stage |
| `deadline` | `date` | Client-facing delivery date |
| `budget_cents` | `bigint` | Budget in smallest currency unit |
| `currency` | `char(3)` | ISO 4217 currency code |
| `metadata` | `jsonb` | Arbitrary additional fields |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

#### `assets`

Media files (footage, audio, graphics, exports) associated with a project.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `project_id` | `uuid` | FK → `projects.id` |
| `name` | `text` | Human-readable asset name |
| `asset_type` | `asset_type` | Media classification |
| `storage_path` | `text` | Path within Supabase Storage bucket |
| `file_size_bytes` | `bigint` | File size in bytes |
| `mime_type` | `text` | IANA media type |
| `duration_seconds` | `numeric(10,3)` | Duration for video/audio files |
| `metadata` | `jsonb` | Width, height, frame rate, codec, etc. |
| `uploaded_by` | `uuid` | FK → `auth.users.id` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

#### `jobs`

Discrete tasks within a project's production pipeline, assigned to team members.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `project_id` | `uuid` | FK → `projects.id` |
| `title` | `text` | Task title |
| `description` | `text` | Detailed task description |
| `stage` | `production_stage` | Which production stage this belongs to |
| `status` | `job_status` | Current task state |
| `assigned_to` | `uuid` | FK → `auth.users.id` |
| `due_date` | `date` | Internal task deadline |
| `sort_order` | `integer` | Display order within stage |
| `metadata` | `jsonb` | Arbitrary additional fields |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

#### `prompt_templates`

Versioned AI prompt definitions used by n8n workflows and manual AI tasks.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique template name |
| `category` | `text` | Grouping (e.g., `scriptwriting`, `thumbnail`, `captioning`) |
| `prompt_text` | `text` | The full prompt with `{{variable}}` placeholders |
| `variables` | `jsonb` | Array of variable name strings |
| `version` | `integer` | Monotonically increasing version number |
| `is_active` | `boolean` | Only one version should be active per name |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

#### `workflow_definitions`

n8n workflow metadata registered in the database for tracking and invocation.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique workflow name |
| `n8n_workflow_id` | `text` | ID from n8n for API calls |
| `trigger_type` | `workflow_trigger` | How the workflow is started |
| `description` | `text` | What this workflow does |
| `config` | `jsonb` | Static parameters passed at invocation |
| `is_active` | `boolean` | Whether new executions are permitted |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

#### `workflow_executions`

Audit log of every n8n workflow run, linked to a project.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `workflow_id` | `uuid` | FK → `workflow_definitions.id` |
| `project_id` | `uuid` | FK → `projects.id` (nullable) |
| `n8n_execution_id` | `text` | Execution ID from n8n |
| `status` | `text` | `running`, `success`, `error`, `cancelled` |
| `input` | `jsonb` | Parameters passed to the workflow |
| `output` | `jsonb` | Result payload returned by the workflow |
| `error_message` | `text` | Error detail if status is `error` |
| `started_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |

---

## Security Model

All tables have **Row Level Security (RLS) enabled**. Access is gated by Supabase JWT claims:

- **Authenticated users** (`auth.role() = 'authenticated'`) may read and write records in all tables, subject to future per-role refinements.
- **Service-role key** bypasses RLS entirely and is used exclusively by server-side n8n workflows and operational scripts.
- The anon key has no table-level permissions by default.

---

## Migration Strategy

Migrations are numbered SQL files in `sql/` applied in ascending order:

```
sql/000_extensions.sql   — Enable PostgreSQL extensions
sql/001_schema.sql       — Full schema creation (idempotent)
```

Each migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, etc.) so re-runs are safe. New migrations increment the numeric prefix.

---

## Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `assets` | Raw footage, audio, graphics uploaded during production | Authenticated users |
| `deliverables` | Final exports sent to clients | Authenticated users + signed URLs |

---

## n8n Integration Patterns

### Webhook Trigger
n8n listens for HTTP POST webhooks dispatched by Supabase Database Webhooks on table events (e.g., a job row changing `status` to `in_progress`).

### Database Polling
For operations that do not support webhooks, n8n schedules periodic queries against the Supabase REST API to detect state changes.

### Callback Pattern
Long-running n8n workflows write their output back to `workflow_executions.output` and update the linked job or asset record upon completion.
