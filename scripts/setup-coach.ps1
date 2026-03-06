# ClearPath - Setup new coach deployment
# Generates client-config.json and env template for a new coach tenant

param(
    [Parameter(Mandatory=$true)]
    [string]$CoachSlug,
    [string]$CoachName = "",
    [string]$PrimaryColor = "#0284c7",
    [string]$SecondaryColor = "#0369a1"
)

if ([string]::IsNullOrWhiteSpace($CoachName)) {
    $CoachName = $CoachSlug -replace '-', ' '
    $CoachName = (Get-Culture).TextInfo.ToTitleCase($CoachName.ToLower())
}

$config = @{
    clientName = $CoachName
    businessName = $CoachName
    supabaseClientId = $CoachSlug
    brandColors = @{
        primary = $PrimaryColor
        secondary = $SecondaryColor
    }
    features = @{
        groupSessions = $true
        videoLibrary = $true
    }
}

$configPath = Join-Path $PSScriptRoot ".." "client-config.json"
$config | ConvertTo-Json -Depth 4 | Set-Content $configPath -Encoding UTF8
Write-Host "Created: $configPath"

Write-Host ""
Write-Host "=== Next steps ==="
Write-Host "1. Set in Vercel/env: NEXT_PUBLIC_CLIENT_ID=$CoachSlug"
Write-Host "2. Set NEXT_PUBLIC_CLIENT_NAME=$CoachName"
Write-Host "3. Add coach to Supabase (first signup = coach, or create manually with tenant_id=$CoachSlug)"
Write-Host "4. Add production URL to Supabase Redirect URLs"
Write-Host "5. See docs/WHITELABEL_RESELLER.md for full setup"
