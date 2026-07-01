# Database

## Overview

**Important Architectural Disconnect**: There is a significant disconnect between the database schema defined in `sql/001_schema.sql` and the TypeScript library implementation. The schema defines a video production management system (clients, projects, assets, jobs, workflows), while the TypeScript library implements AI routing, content discovery, and plugin infrastructure with no database integration.

## Database Schema

### PostgreSQL 17 with Supabase

The database schema is designed for PostgreSQL 17 and deployed via Supabase. It includes:

- Row Level Security (RLS) on all tables
- Auto-generated triggers for timestamp updates
- GIN indexes for text search
- Foreign key relationships
- Idempotent migration scripts

### Migration Strategy

Migrations are numbered SQL files in `sql/` applied in ascending order:

```
sql/000_extensions.sql   — Enable PostgreSQL extensions
sql/001_schema.sql       — Full schema creation (idempotent)
```

Each migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, etc.) so re-runs are safe.

## Schema Tables

### clients

Organisations or individuals commissioning video production work.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `name` | `text` | NOT NULL | Company or individual name |
| `contact_name` | `text` | | Primary point of contact |
| `contact_email` | `text` | UNIQUE | Contact email address |
| `billing_address` | `text` | | Billing address |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' | Additional fields |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Indexes**:
- `clients_name_trgm_idx`: GIN index on name for text search
- `clients_contact_email_idx`: B-tree index on contact_email

**RLS Policy**: `clients_authenticated_all` - All authenticated users have full access

### projects

Video production engagements linked to clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `client_id` | `uuid` | NOT NULL, FK → clients.id | Associated client |
| `title` | `text` | NOT NULL | Project title |
| `description` | `text` | | Brief description |
| `status` | `project_status` | NOT NULL DEFAULT 'draft' | Lifecycle state |
| `stage` | `production_stage` | NOT NULL DEFAULT 'pre_production' | Production stage |
| `deadline` | `date` | | Client delivery date |
| `budget_cents` | `bigint` | CHECK (budget_cents >= 0) | Budget in smallest currency unit |
| `currency` | `char(3)` | NOT NULL DEFAULT 'USD' | ISO 4217 currency code |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' | Additional fields |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Enums**:
- `project_status`: draft, active, in_review, delivered, archived
- `production_stage`: pre_production, production, post_production, review, delivery

**Indexes**:
- `projects_client_id_idx`: FK index
- `projects_status_idx`: Status filter
- `projects_stage_idx`: Stage filter
- `projects_deadline_idx`: Deadline filter
- `projects_title_trgm_idx`: GIN index on title for text search

**RLS Policy**: `projects_authenticated_all` - All authenticated users have full access

### assets

Media files associated with projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `project_id` | `uuid` | NOT NULL, FK → projects.id ON DELETE CASCADE | Associated project |
| `name` | `text` | NOT NULL | Asset name |
| `asset_type` | `asset_type` | NOT NULL | Media classification |
| `storage_path` | `text` | NOT NULL | Path in Supabase Storage |
| `file_size_bytes` | `bigint` | CHECK (file_size_bytes >= 0) | File size |
| `mime_type` | `text` | | IANA media type |
| `duration_seconds` | `numeric(10,3)` | CHECK (duration_seconds >= 0) | Duration for video/audio |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' | Width, height, codec, etc. |
| `uploaded_by` | `uuid` | FK → auth.users.id ON DELETE SET NULL | Uploader |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Enum**:
- `asset_type`: footage, audio, graphic, caption, thumbnail, deliverable, export

**Indexes**:
- `assets_project_id_idx`: FK index
- `assets_asset_type_idx`: Type filter
- `assets_uploaded_by_idx`: Uploader filter
- `assets_name_trgm_idx`: GIN index on name for text search

**RLS Policy**: `assets_authenticated_all` - All authenticated users have full access

### jobs

Discrete tasks within a project's production pipeline.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `project_id` | `uuid` | NOT NULL, FK → projects.id ON DELETE CASCADE | Associated project |
| `title` | `text` | NOT NULL | Task title |
| `description` | `text` | | Detailed description |
| `stage` | `production_stage` | NOT NULL | Production stage |
| `status` | `job_status` | NOT NULL DEFAULT 'pending' | Task state |
| `assigned_to` | `uuid` | FK → auth.users.id ON DELETE SET NULL | Assignee |
| `due_date` | `date` | | Internal deadline |
| `sort_order` | `integer` | NOT NULL DEFAULT 0 | Display order |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' | Additional fields |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Enum**:
- `job_status`: pending, in_progress, blocked, complete, cancelled

**Indexes**:
- `jobs_project_id_idx`: FK index
- `jobs_stage_status_idx`: Composite index for filtering
- `jobs_assigned_to_idx`: Assignee filter
- `jobs_due_date_idx`: Deadline filter

**RLS Policy**: `jobs_authenticated_all` - All authenticated users have full access

### prompt_templates

Versioned AI prompt definitions for n8n workflows.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `name` | `text` | NOT NULL | Template name |
| `category` | `text` | NOT NULL | Grouping (scriptwriting, thumbnail, etc.) |
| `prompt_text` | `text` | NOT NULL | Full prompt with {{variable}} placeholders |
| `variables` | `jsonb` | NOT NULL DEFAULT '[]' | Array of variable names |
| `version` | `integer` | NOT NULL DEFAULT 1 | Version number |
| `is_active` | `boolean` | NOT NULL DEFAULT true | Only one version active per name |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Unique Constraint**: `(name, version)` - Only one version per name

**Indexes**:
- `prompt_templates_category_idx`: Category filter
- `prompt_templates_is_active_idx`: Active filter
- `prompt_templates_name_trgm_idx`: GIN index on name for text search

**RLS Policy**: `prompt_templates_authenticated_all` - All authenticated users have full access

### workflow_definitions

n8n workflow metadata for tracking and invocation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `name` | `text` | NOT NULL UNIQUE | Workflow name |
| `n8n_workflow_id` | `text` | | ID from n8n for API calls |
| `trigger_type` | `workflow_trigger` | NOT NULL DEFAULT 'manual' | How workflow starts |
| `description` | `text` | | What this workflow does |
| `config` | `jsonb` | NOT NULL DEFAULT '{}' | Static parameters |
| `is_active` | `boolean` | NOT NULL DEFAULT true | Execution permitted |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Enum**:
- `workflow_trigger`: manual, webhook, schedule, database_event

**Indexes**:
- `workflow_definitions_trigger_type_idx`: Trigger type filter
- `workflow_definitions_is_active_idx`: Active filter

**RLS Policy**: `workflow_definitions_authenticated_all` - All authenticated users have full access

### workflow_executions

Audit log of n8n workflow runs linked to projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY | Unique identifier |
| `workflow_id` | `uuid` | NOT NULL, FK → workflow_definitions.id ON DELETE RESTRICT | Workflow definition |
| `project_id` | `uuid` | FK → projects.id ON DELETE SET NULL | Associated project |
| `n8n_execution_id` | `text` | | Execution ID from n8n |
| `status` | `text` | NOT NULL DEFAULT 'running' | Execution status |
| `input` | `jsonb` | NOT NULL DEFAULT '{}' | Parameters passed |
| `output` | `jsonb` | | Result payload |
| `error_message` | `text` | | Error detail if failed |
| `started_at` | `timestamptz` | NOT NULL DEFAULT now() | Start timestamp |
| `completed_at` | `timestamptz` | | Completion timestamp |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Creation timestamp |

**Status Values**: running, success, error, cancelled

**Indexes**:
- `workflow_executions_workflow_id_idx`: FK index
- `workflow_executions_project_id_idx`: Project filter
- `workflow_executions_status_idx`: Status filter
- `workflow_executions_started_at_idx`: Time-based queries (DESC)

**RLS Policy**: `workflow_executions_authenticated_all` - All authenticated users have full access

## Storage Buckets

Supabase Storage buckets defined in the architecture:

| Bucket | Purpose | Access |
|--------|---------|--------|
| `assets` | Raw footage, audio, graphics | Authenticated users |
| `deliverables` | Final exports for clients | Authenticated users + signed URLs |

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**Authenticated Users** (`auth.role() = 'authenticated'`):
- Full read/write access to all tables
- Subject to future per-role refinements

**Service Role**:
- Bypasses RLS entirely
- Used by server-side n8n workflows and operational scripts

**Anon Key**:
- No table-level permissions by default

### Triggers

**Updated At Triggers**:
Each table has a trigger to automatically update `updated_at`:

```sql
CREATE OR REPLACE TRIGGER table_name_updated_at
    BEFORE UPDATE ON table_name
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

## Architectural Disconnect

### Schema vs Implementation Mismatch

**Schema Purpose**: Video production management system
- Clients, projects, assets, jobs
- Workflow automation via n8n
- Prompt templates for AI

**Library Implementation**: AI and plugin infrastructure
- AI routing (OpenAI, Claude, Gemini)
- Content discovery (RSS, Reddit, YouTube)
- Plugin system with lifecycle management
- No database integration

### Missing Tables

The TypeScript library assumes tables that don't exist in the schema:

**opportunities Table** (assumed by `SupabaseOpportunityRepository`):
```sql
-- Not in current schema, but assumed to exist:
CREATE TABLE opportunities (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  summary text,
  source discovery_source NOT NULL,
  source_url text,
  score jsonb NOT NULL,
  keywords jsonb,
  metadata jsonb,
  published_at timestamptz,
  status opportunity_status DEFAULT 'discovered',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### No Integration Points

The TypeScript library does not:
- Connect to Supabase for data persistence
- Use the clients/projects/assets/jobs tables
- Integrate with n8n workflows
- Use prompt_templates table

## Database Extensions

### pg_trgm Extension

Enabled for text search with GIN indexes:
- `clients_name_trgm_idx`
- `projects_title_trgm_idx`
- `assets_name_trgm_idx`
- `prompt_templates_name_trgm_idx`

### moddatetime Function

Auto-updates `updated_at` timestamp on row updates.

## Current Limitations

1. **No Integration**: TypeScript library doesn't use the database
2. **Missing Tables**: Discovery opportunities table doesn't exist
3. **No Migrations**: No migration for discovery tables
4. **No Seeding**: No seed data for reference data
5. **No Backup Strategy**: No documented backup/restore procedures
6. **No Migration Rollback**: No rollback mechanism for migrations
7. **No Schema Validation**: No schema validation in code
8. **No Query Optimization**: No query performance analysis
9. **No Connection Pooling**: Not documented (handled by Supabase)
10. **No Replication**: No replication strategy documented

## Future Database Needs

Based on the TypeScript library implementation, future tables may include:

### Discovery Tables

```sql
CREATE TYPE discovery_source AS ENUM (
  'rss', 'reddit', 'youtube', 'google_trends', 'whop', 'custom'
);

CREATE TYPE opportunity_status AS ENUM (
  'discovered', 'accepted', 'rejected', 'in_progress', 'completed'
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  source discovery_source NOT NULL,
  source_url text,
  score jsonb NOT NULL,
  keywords jsonb,
  metadata jsonb,
  published_at timestamptz,
  status opportunity_status DEFAULT 'discovered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX opportunities_source_idx ON opportunities(source);
CREATE INDEX opportunities_status_idx ON opportunities(status);
CREATE INDEX opportunities_published_at_idx ON opportunities(published_at DESC);
```

### Plugin Tables (EES-006)

```sql
CREATE TYPE plugin_status AS ENUM (
  'installed', 'configured', 'initialized', 'running', 'paused', 'stopped', 'failed', 'disabled'
);

CREATE TABLE plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id text NOT NULL UNIQUE,
  version text NOT NULL,
  manifest jsonb NOT NULL,
  status plugin_status DEFAULT 'installed',
  config jsonb NOT NULL DEFAULT '{}',
  plugin_directory text,
  installed_at timestamptz NOT NULL DEFAULT now(),
  loaded_at timestamptz,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Cross-References

- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) - Architectural disconnect details
- [Components](COMPONENTS.md) - SupabaseOpportunityRepository (assumes missing table)
- [Discovery Pipeline](DISCOVERY_PIPELINE.md) - Discovery repository integration
- [Deployment](DEPLOYMENT.md) - Database deployment procedures
