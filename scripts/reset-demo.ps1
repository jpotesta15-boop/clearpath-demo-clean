param(
    [string]$TenantId = "demo"
)

<#
.SYNOPSIS
Reset and reseed the ClearPath demo tenant using Supabase CLI.

.DESCRIPTION
This script:
1. Runs supabase/reset_demo_tenant.sql to clear tenant-scoped demo data.
2. Runs supabase/seed_full_using_existing.sql to repopulate demo data
   using your existing coach and client records for that tenant.

Requires:
- Supabase CLI installed (`supabase` on PATH)
- This directory to be inside a Supabase project (same repo root)

By default it targets tenant_id/client_id = "demo". To use a different
tenant id, edit supabase/reset_demo_tenant.sql and this script to match.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Join-Path $scriptDir ".."

Write-Host "Resetting demo tenant in Supabase project at $rootDir"
Write-Host ""

Push-Location $rootDir
try {
    # Step 1: clear demo data
    Write-Host "1) Running supabase/reset_demo_tenant.sql ..."
    supabase db execute --file "supabase/reset_demo_tenant.sql"

    # Step 2: reseed demo data using existing coach + clients
    Write-Host "2) Running supabase/seed_full_using_existing.sql ..."
    supabase db execute --file "supabase/seed_full_using_existing.sql"

    Write-Host ""
    Write-Host "✅ Demo tenant reset and reseeded."
    Write-Host "   Make sure NEXT_PUBLIC_CLIENT_ID in your env is set to '$TenantId'."
}
finally {
    Pop-Location
}

