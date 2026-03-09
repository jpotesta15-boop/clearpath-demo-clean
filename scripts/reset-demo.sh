#!/usr/bin/env bash

set -euo pipefail

TENANT_ID="${1:-demo}"

# Reset and reseed the ClearPath demo tenant using Supabase CLI.
#
# This script:
# 1. Runs supabase/reset_demo_tenant.sql to clear tenant-scoped demo data.
# 2. Runs supabase/seed_full_using_existing.sql to repopulate demo data
#    using your existing coach and client records for that tenant.
#
# Requirements:
# - Supabase CLI installed (`supabase` on PATH)
# - Run from inside the repo (or let this script cd to repo root)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

echo "Resetting demo tenant in Supabase project at ${ROOT_DIR}"
echo

cd "${ROOT_DIR}"

echo "1) Running supabase/reset_demo_tenant.sql ..."
supabase db execute --file "supabase/reset_demo_tenant.sql"

echo "2) Running supabase/seed_full_using_existing.sql ..."
supabase db execute --file "supabase/seed_full_using_existing.sql"

echo
echo "✅ Demo tenant reset and reseeded."
echo "   Make sure NEXT_PUBLIC_CLIENT_ID in your env is set to '${TENANT_ID}'."

