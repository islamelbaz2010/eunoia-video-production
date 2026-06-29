#!/usr/bin/env bash
# bootstrap.sh — One-shot environment setup for Eunoia Media OS.
# Idempotent: safe to re-run on an already-configured environment.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_DIR="$REPO_ROOT/sql"
ENV_FILE="$REPO_ROOT/.env"
ENV_EXAMPLE="$REPO_ROOT/.env.example"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[bootstrap]${RESET} $*"; }
success() { echo -e "${GREEN}[bootstrap]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[bootstrap]${RESET} $*"; }
fatal()   { echo -e "${RED}[bootstrap] FATAL:${RESET} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------
check_command() {
    if ! command -v "$1" &>/dev/null; then
        fatal "'$1' is not installed or not on PATH. See docs/INSTALL.md for prerequisites."
    fi
}

info "Checking prerequisites..."
check_command supabase
check_command psql
check_command docker

if ! docker info &>/dev/null; then
    fatal "Docker daemon is not running. Start Docker Desktop and retry."
fi

success "Prerequisites satisfied."

# ---------------------------------------------------------------------------
# Environment file
# ---------------------------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
    if [[ ! -f "$ENV_EXAMPLE" ]]; then
        fatal ".env.example not found at $ENV_EXAMPLE"
    fi
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    warn ".env created from .env.example — edit it before running the application."
else
    info ".env already exists, skipping copy."
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

# ---------------------------------------------------------------------------
# Supabase local stack
# ---------------------------------------------------------------------------
info "Starting Supabase local stack..."
(cd "$REPO_ROOT" && supabase start)
success "Supabase started."

# Resolve DATABASE_URL from Supabase if not set in .env
if [[ -z "${DATABASE_URL:-}" ]]; then
    DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
    warn "DATABASE_URL not set in .env — using default local URL: $DATABASE_URL"
fi

# ---------------------------------------------------------------------------
# Apply migrations
# ---------------------------------------------------------------------------
info "Applying SQL migrations..."

migration_files=(
    "000_extensions.sql"
    "001_schema.sql"
)

for migration in "${migration_files[@]}"; do
    migration_path="$SQL_DIR/$migration"
    if [[ ! -f "$migration_path" ]]; then
        fatal "Migration file not found: $migration_path"
    fi
    info "  → $migration"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration_path"
done

success "All migrations applied."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
success "Bootstrap complete."
echo ""
echo "  Supabase Studio:  http://localhost:54323"
echo "  REST API:         http://localhost:54321"
echo "  Database:         $DATABASE_URL"
echo ""
echo "Run 'bash scripts/doctor.sh' to verify the installation."
