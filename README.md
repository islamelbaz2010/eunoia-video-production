# Eunoia Media OS

A production-grade video production management system built on Supabase (PostgreSQL 17) and n8n.

## Overview

Eunoia Media OS is the internal operating system for video production teams. It unifies client management, project tracking, media asset storage, production pipeline automation, and an AI prompt library into a single PostgreSQL database backed by Supabase — with automated workflows orchestrated through n8n.

## Tech Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL 17 (Supabase) |
| Auth & REST API | Supabase Auth + PostgREST |
| Realtime | Supabase Realtime |
| File Storage | Supabase Storage |
| Workflow Automation | n8n |
| AI Prompt Library | Structured prompt templates |

## Project Structure

```
eunoia-video-production/
├── assets/                   # Brand files and static assets
├── docs/
│   ├── ARCHITECTURE.md       # System architecture reference
│   └── INSTALL.md            # Full installation guide
├── n8n/                      # Exported n8n workflow JSON files
├── prompts/                  # AI prompt template files
├── scripts/
│   ├── bootstrap.sh          # One-shot environment setup
│   └── doctor.sh             # System health diagnostics
├── sql/
│   ├── 000_extensions.sql    # PostgreSQL extension enablement
│   └── 001_schema.sql        # Full database schema
├── supabase/
│   └── config.toml           # Supabase local dev configuration
├── workflows/                # Production workflow definitions
├── .env.example              # Environment variable reference
└── README.md
```

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> eunoia-video-production
cd eunoia-video-production

# 2. Bootstrap the environment (copies .env, starts Supabase, applies migrations)
bash scripts/bootstrap.sh

# 3. Verify the system is healthy
bash scripts/doctor.sh
```

Full setup instructions, including prerequisites, are in [docs/INSTALL.md](docs/INSTALL.md).

## Documentation

| Document | Purpose |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Step-by-step installation and environment configuration |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, and integration patterns |

## License

Proprietary — Eunoia Media. All rights reserved.
