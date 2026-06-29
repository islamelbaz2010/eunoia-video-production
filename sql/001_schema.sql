-- Eunoia Media OS — Full Database Schema
-- PostgreSQL 17 · Supabase
-- Idempotent: safe to re-run against an existing database.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM (
        'draft',
        'active',
        'in_review',
        'delivered',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE asset_type AS ENUM (
        'footage',
        'audio',
        'graphic',
        'caption',
        'thumbnail',
        'deliverable',
        'export'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'pending',
        'in_progress',
        'blocked',
        'complete',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE production_stage AS ENUM (
        'pre_production',
        'production',
        'post_production',
        'review',
        'delivery'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE workflow_trigger AS ENUM (
        'manual',
        'webhook',
        'schedule',
        'database_event'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clients (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text            NOT NULL,
    contact_name    text,
    contact_email   text            UNIQUE,
    billing_address text,
    metadata        jsonb           NOT NULL DEFAULT '{}',
    created_at      timestamptz     NOT NULL DEFAULT now(),
    updated_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_authenticated_all ON clients;
CREATE POLICY clients_authenticated_all ON clients
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS clients_name_trgm_idx
    ON clients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS clients_contact_email_idx
    ON clients (contact_email);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
    id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       uuid                NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
    title           text                NOT NULL,
    description     text,
    status          project_status      NOT NULL DEFAULT 'draft',
    stage           production_stage    NOT NULL DEFAULT 'pre_production',
    deadline        date,
    budget_cents    bigint              CHECK (budget_cents >= 0),
    currency        char(3)             NOT NULL DEFAULT 'USD',
    metadata        jsonb               NOT NULL DEFAULT '{}',
    created_at      timestamptz         NOT NULL DEFAULT now(),
    updated_at      timestamptz         NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_authenticated_all ON projects;
CREATE POLICY projects_authenticated_all ON projects
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS projects_client_id_idx
    ON projects (client_id);

CREATE INDEX IF NOT EXISTS projects_status_idx
    ON projects (status);

CREATE INDEX IF NOT EXISTS projects_stage_idx
    ON projects (stage);

CREATE INDEX IF NOT EXISTS projects_deadline_idx
    ON projects (deadline);

CREATE INDEX IF NOT EXISTS projects_title_trgm_idx
    ON projects USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          uuid            NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name                text            NOT NULL,
    asset_type          asset_type      NOT NULL,
    storage_path        text            NOT NULL,
    file_size_bytes     bigint          CHECK (file_size_bytes >= 0),
    mime_type           text,
    duration_seconds    numeric(10, 3)  CHECK (duration_seconds >= 0),
    metadata            jsonb           NOT NULL DEFAULT '{}',
    uploaded_by         uuid            REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at          timestamptz     NOT NULL DEFAULT now(),
    updated_at          timestamptz     NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assets_authenticated_all ON assets;
CREATE POLICY assets_authenticated_all ON assets
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS assets_project_id_idx
    ON assets (project_id);

CREATE INDEX IF NOT EXISTS assets_asset_type_idx
    ON assets (asset_type);

CREATE INDEX IF NOT EXISTS assets_uploaded_by_idx
    ON assets (uploaded_by);

CREATE INDEX IF NOT EXISTS assets_name_trgm_idx
    ON assets USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
    id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid                NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    title           text                NOT NULL,
    description     text,
    stage           production_stage    NOT NULL,
    status          job_status          NOT NULL DEFAULT 'pending',
    assigned_to     uuid                REFERENCES auth.users (id) ON DELETE SET NULL,
    due_date        date,
    sort_order      integer             NOT NULL DEFAULT 0,
    metadata        jsonb               NOT NULL DEFAULT '{}',
    created_at      timestamptz         NOT NULL DEFAULT now(),
    updated_at      timestamptz         NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_authenticated_all ON jobs;
CREATE POLICY jobs_authenticated_all ON jobs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS jobs_project_id_idx
    ON jobs (project_id);

CREATE INDEX IF NOT EXISTS jobs_stage_status_idx
    ON jobs (stage, status);

CREATE INDEX IF NOT EXISTS jobs_assigned_to_idx
    ON jobs (assigned_to);

CREATE INDEX IF NOT EXISTS jobs_due_date_idx
    ON jobs (due_date);

-- ---------------------------------------------------------------------------
-- prompt_templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS prompt_templates (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text        NOT NULL,
    category        text        NOT NULL,
    prompt_text     text        NOT NULL,
    variables       jsonb       NOT NULL DEFAULT '[]',
    version         integer     NOT NULL DEFAULT 1,
    is_active       boolean     NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT prompt_templates_name_version_unique UNIQUE (name, version)
);

CREATE OR REPLACE TRIGGER prompt_templates_updated_at
    BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_templates_authenticated_all ON prompt_templates;
CREATE POLICY prompt_templates_authenticated_all ON prompt_templates
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS prompt_templates_category_idx
    ON prompt_templates (category);

CREATE INDEX IF NOT EXISTS prompt_templates_is_active_idx
    ON prompt_templates (is_active);

CREATE INDEX IF NOT EXISTS prompt_templates_name_trgm_idx
    ON prompt_templates USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- workflow_definitions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text                NOT NULL UNIQUE,
    n8n_workflow_id     text,
    trigger_type        workflow_trigger     NOT NULL DEFAULT 'manual',
    description         text,
    config              jsonb               NOT NULL DEFAULT '{}',
    is_active           boolean             NOT NULL DEFAULT true,
    created_at          timestamptz         NOT NULL DEFAULT now(),
    updated_at          timestamptz         NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER workflow_definitions_updated_at
    BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_definitions_authenticated_all ON workflow_definitions;
CREATE POLICY workflow_definitions_authenticated_all ON workflow_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS workflow_definitions_trigger_type_idx
    ON workflow_definitions (trigger_type);

CREATE INDEX IF NOT EXISTS workflow_definitions_is_active_idx
    ON workflow_definitions (is_active);

-- ---------------------------------------------------------------------------
-- workflow_executions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_executions (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id         uuid        NOT NULL REFERENCES workflow_definitions (id) ON DELETE RESTRICT,
    project_id          uuid        REFERENCES projects (id) ON DELETE SET NULL,
    n8n_execution_id    text,
    status              text        NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running', 'success', 'error', 'cancelled')),
    input               jsonb       NOT NULL DEFAULT '{}',
    output              jsonb,
    error_message       text,
    started_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_executions_authenticated_all ON workflow_executions;
CREATE POLICY workflow_executions_authenticated_all ON workflow_executions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS workflow_executions_workflow_id_idx
    ON workflow_executions (workflow_id);

CREATE INDEX IF NOT EXISTS workflow_executions_project_id_idx
    ON workflow_executions (project_id);

CREATE INDEX IF NOT EXISTS workflow_executions_status_idx
    ON workflow_executions (status);

CREATE INDEX IF NOT EXISTS workflow_executions_started_at_idx
    ON workflow_executions (started_at DESC);
