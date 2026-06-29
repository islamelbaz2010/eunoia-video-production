-- PostgreSQL 17 extension enablement
-- Run once against the target database before applying any schema migrations.
-- This file is idempotent.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime;
