-- Eunoia Media OS — Discovery Engine: Opportunities table
-- PostgreSQL 17 · Supabase
-- Depends on: 000_extensions.sql (pg_trgm, moddatetime)
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE opportunity_status AS ENUM (
        'new',
        'reviewed',
        'accepted',
        'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE discovery_source AS ENUM (
        'RSS',
        'GOOGLE_TRENDS',
        'REDDIT',
        'YOUTUBE',
        'WHOP'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- opportunities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
    id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    title               text                NOT NULL,
    summary             text                NOT NULL DEFAULT '',
    source              discovery_source    NOT NULL,
    source_url          text                NOT NULL,
    score_relevance     smallint            NOT NULL DEFAULT 0
                            CHECK (score_relevance  BETWEEN 0 AND 100),
    score_engagement    smallint            NOT NULL DEFAULT 0
                            CHECK (score_engagement BETWEEN 0 AND 100),
    score_timeliness    smallint            NOT NULL DEFAULT 0
                            CHECK (score_timeliness BETWEEN 0 AND 100),
    score_competition   smallint            NOT NULL DEFAULT 50
                            CHECK (score_competition BETWEEN 0 AND 100),
    score_total         smallint            NOT NULL DEFAULT 0
                            CHECK (score_total      BETWEEN 0 AND 100),
    keywords            text[]              NOT NULL DEFAULT '{}',
    metadata            jsonb               NOT NULL DEFAULT '{}',
    status              opportunity_status  NOT NULL DEFAULT 'new',
    published_at        timestamptz,
    discovered_at       timestamptz         NOT NULL DEFAULT now(),
    created_at          timestamptz         NOT NULL DEFAULT now(),
    updated_at          timestamptz         NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opportunities_authenticated_all ON opportunities;
CREATE POLICY opportunities_authenticated_all ON opportunities
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS opportunities_status_idx
    ON opportunities (status);

CREATE INDEX IF NOT EXISTS opportunities_source_idx
    ON opportunities (source);

CREATE INDEX IF NOT EXISTS opportunities_score_total_idx
    ON opportunities (score_total DESC);

CREATE INDEX IF NOT EXISTS opportunities_discovered_at_idx
    ON opportunities (discovered_at DESC);

CREATE INDEX IF NOT EXISTS opportunities_keywords_gin_idx
    ON opportunities USING gin (keywords);

CREATE INDEX IF NOT EXISTS opportunities_title_trgm_idx
    ON opportunities USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS opportunities_status_score_idx
    ON opportunities (status, score_total DESC);
