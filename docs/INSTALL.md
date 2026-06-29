# Installation Guide

## Prerequisites

The following tools must be installed and available on `PATH` before running any setup script.

| Tool | Version | Purpose |
|---|---|---|
| [Supabase CLI](https://supabase.com/docs/guides/cli) | ≥ 1.200.0 | Local Supabase stack |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | ≥ 24.0 | Supabase container runtime |
| [psql](https://www.postgresql.org/docs/current/app-psql.html) | ≥ 15 | Database migrations |
| [n8n](https://docs.n8n.io/hosting/) | ≥ 1.40.0 | Workflow automation |
| Git | ≥ 2.40 | Version control |

Verify your environment with the doctor script after setup:

```bash
bash scripts/doctor.sh
```

---

## 1. Clone the Repository

```bash
git clone <repo-url> eunoia-video-production
cd eunoia-video-production
```

---

## 2. Configure Environment Variables

Copy the example environment file and fill in all values:

```bash
cp .env.example .env
```

Open `.env` in your editor and set every variable. See [Environment Variables](#environment-variables) for the full reference.

---

## 3. Start Supabase

Start the local Supabase stack (requires Docker to be running):

```bash
supabase start
```

The first run downloads Docker images and may take several minutes. On success, the CLI prints local URLs and keys — copy the `service_role` key and `anon` key into your `.env`.

---

## 4. Apply Database Migrations

Run migrations in order using the bootstrap script:

```bash
bash scripts/bootstrap.sh
```

The script:
1. Validates all prerequisites are present.
2. Copies `.env.example` to `.env` if `.env` does not exist.
3. Enables required PostgreSQL extensions (`sql/000_extensions.sql`).
4. Creates the full schema (`sql/001_schema.sql`).

To apply migrations manually:

```bash
source .env

psql "$DATABASE_URL" -f sql/000_extensions.sql
psql "$DATABASE_URL" -f sql/001_schema.sql
```

---

## 5. Verify the Installation

```bash
bash scripts/doctor.sh
```

All checks must pass before the system is considered operational. Fix any reported issues before proceeding.

---

## 6. Import n8n Workflows

1. Start n8n (cloud or self-hosted).
2. Open the n8n editor.
3. Import each `.json` file from the `n8n/` directory via **Settings → Import workflow**.
4. Configure credentials for each imported workflow.

---

## Environment Variables

All variables are required unless marked optional.

### Database

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string (`postgresql://user:pass@host:port/db`) |

### Supabase

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Local or remote Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (safe for client-side use) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service-role key (server-side only, never expose publicly) |

### n8n

| Variable | Description |
|---|---|
| `N8N_BASE_URL` | Base URL of the n8n instance |
| `N8N_API_KEY` | n8n API key for programmatic workflow access |

### Storage

| Variable | Description |
|---|---|
| `STORAGE_BUCKET_ASSETS` | Supabase Storage bucket name for project assets |
| `STORAGE_BUCKET_DELIVERABLES` | Supabase Storage bucket name for client deliverables |

### Optional

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | Logging verbosity: `debug`, `info`, `warn`, `error` |

---

## Local Supabase Endpoints

After `supabase start`, the following services are available locally:

| Service | URL |
|---|---|
| REST API | `http://localhost:54321` |
| Studio | `http://localhost:54323` |
| Database | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Email (Inbucket) | `http://localhost:54324` |

---

## Resetting the Local Database

To wipe and re-apply all migrations from scratch:

```bash
supabase db reset
bash scripts/bootstrap.sh
```

This is destructive. All local data will be lost.

---

## Upgrading

1. Pull the latest changes: `git pull origin main`
2. Apply any new migration files in `sql/` in numeric order.
3. Re-run `bash scripts/doctor.sh` to confirm no regressions.
