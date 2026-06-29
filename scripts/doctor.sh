#!/usr/bin/env bash
# doctor.sh — System health diagnostics for Eunoia Media OS.
# Checks all required tools, services, and configuration.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

PASS="${GREEN}[PASS]${RESET}"
FAIL="${RED}[FAIL]${RESET}"
WARN="${YELLOW}[WARN]${RESET}"

pass()  { echo -e "$PASS  $*"; (( PASS_COUNT++ )) || true; }
fail()  { echo -e "$FAIL  $*"; (( FAIL_COUNT++ )) || true; }
warn()  { echo -e "$WARN  $*"; (( WARN_COUNT++ )) || true; }
title() { echo -e "\n${BOLD}${CYAN}── $* ${RESET}"; }

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------
title "Required tools"

check_tool() {
    local cmd="$1"
    local label="${2:-$cmd}"
    if command -v "$cmd" &>/dev/null; then
        pass "$label is installed  ($(command -v "$cmd"))"
    else
        fail "$label is not found on PATH"
    fi
}

check_tool supabase "Supabase CLI"
check_tool psql     "psql"
check_tool docker   "Docker"
check_tool git      "Git"

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------
title "Docker"

if docker info &>/dev/null; then
    pass "Docker daemon is running"
else
    fail "Docker daemon is not running"
fi

# ---------------------------------------------------------------------------
# Environment file
# ---------------------------------------------------------------------------
title "Environment"

if [[ -f "$ENV_FILE" ]]; then
    pass ".env exists at $ENV_FILE"
    # shellcheck source=/dev/null
    source "$ENV_FILE"
else
    fail ".env not found — run: bash scripts/bootstrap.sh"
fi

check_env_var() {
    local var="$1"
    if [[ -n "${!var:-}" ]]; then
        pass "$var is set"
    else
        fail "$var is not set in .env"
    fi
}

check_env_var "DATABASE_URL"
check_env_var "SUPABASE_URL"
check_env_var "SUPABASE_ANON_KEY"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"
check_env_var "N8N_BASE_URL"
check_env_var "N8N_API_KEY"
check_env_var "STORAGE_BUCKET_ASSETS"
check_env_var "STORAGE_BUCKET_DELIVERABLES"

# ---------------------------------------------------------------------------
# Supabase local stack
# ---------------------------------------------------------------------------
title "Supabase services"

SUPABASE_API="${SUPABASE_URL:-http://localhost:54321}"

if curl -sf "$SUPABASE_API/rest/v1/" \
        -H "apikey: ${SUPABASE_ANON_KEY:-anon}" \
        -o /dev/null 2>/dev/null; then
    pass "Supabase REST API is reachable at $SUPABASE_API"
else
    fail "Supabase REST API is not reachable at $SUPABASE_API — run: supabase start"
fi

# ---------------------------------------------------------------------------
# Database connectivity
# ---------------------------------------------------------------------------
title "Database"

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"

if psql "$DB_URL" -c "SELECT 1;" &>/dev/null; then
    pass "Database connection successful"
else
    fail "Cannot connect to database at $DB_URL"
fi

# Check extensions
if psql "$DB_URL" -tAc "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm';" 2>/dev/null | grep -q 1; then
    pass "Extension pg_trgm is installed"
else
    fail "Extension pg_trgm is not installed — run: bash scripts/bootstrap.sh"
fi

if psql "$DB_URL" -tAc "SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto';" 2>/dev/null | grep -q 1; then
    pass "Extension pgcrypto is installed"
else
    fail "Extension pgcrypto is not installed — run: bash scripts/bootstrap.sh"
fi

# Check core tables
check_table() {
    local table="$1"
    if psql "$DB_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table';" 2>/dev/null | grep -q 1; then
        pass "Table '$table' exists"
    else
        fail "Table '$table' not found — run: bash scripts/bootstrap.sh"
    fi
}

check_table "clients"
check_table "projects"
check_table "assets"
check_table "jobs"
check_table "prompt_templates"
check_table "workflow_definitions"
check_table "workflow_executions"
check_table "opportunities"

# ---------------------------------------------------------------------------
# n8n
# ---------------------------------------------------------------------------
title "n8n"

N8N_URL="${N8N_BASE_URL:-}"
if [[ -n "$N8N_URL" ]]; then
    if curl -sf "$N8N_URL/healthz" -o /dev/null 2>/dev/null; then
        pass "n8n is reachable at $N8N_URL"
    else
        warn "n8n is not reachable at $N8N_URL — start n8n or check N8N_BASE_URL"
    fi
else
    warn "N8N_BASE_URL is not set — skipping n8n connectivity check"
fi

# ---------------------------------------------------------------------------
# Migration files
# ---------------------------------------------------------------------------
title "Migration files"

for migration in "000_extensions.sql" "001_schema.sql" "002_opportunities.sql"; do
    if [[ -f "$REPO_ROOT/sql/$migration" ]]; then
        pass "sql/$migration exists"
    else
        fail "sql/$migration is missing"
    fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}────────────────────────────────${RESET}"
echo -e "${BOLD}Results${RESET}"
echo -e "  ${GREEN}Passed:${RESET}   $PASS_COUNT"
echo -e "  ${YELLOW}Warnings:${RESET} $WARN_COUNT"
echo -e "  ${RED}Failed:${RESET}   $FAIL_COUNT"
echo -e "${BOLD}────────────────────────────────${RESET}"
echo ""

if (( FAIL_COUNT > 0 )); then
    echo -e "${RED}System is NOT healthy. Address the failures above before proceeding.${RESET}"
    exit 1
elif (( WARN_COUNT > 0 )); then
    echo -e "${YELLOW}System is operational with warnings. Review them when possible.${RESET}"
    exit 0
else
    echo -e "${GREEN}System is fully healthy.${RESET}"
    exit 0
fi
