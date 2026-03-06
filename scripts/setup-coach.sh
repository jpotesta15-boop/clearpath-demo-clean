#!/bin/bash
# ClearPath - Setup new coach deployment
# Generates client-config.json for a new coach tenant
# Usage: ./setup-coach.sh coach-slug [Coach Name] [primary-color] [secondary-color]

COACH_SLUG="${1:?Usage: ./setup-coach.sh coach-slug [Coach Name] [primary-color] [secondary-color]}"
COACH_NAME="${2:-$(echo "$COACH_SLUG" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1')}"
PRIMARY="${3:-#0284c7}"
SECONDARY="${4:-#0369a1}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_PATH="$SCRIPT_DIR/../client-config.json"

cat > "$CONFIG_PATH" << EOF
{
  "clientName": "$COACH_NAME",
  "businessName": "$COACH_NAME",
  "supabaseClientId": "$COACH_SLUG",
  "brandColors": {
    "primary": "$PRIMARY",
    "secondary": "$SECONDARY"
  },
  "features": {
    "groupSessions": true,
    "videoLibrary": true
  }
}
EOF

echo "Created: $CONFIG_PATH"
echo ""
echo "=== Next steps ==="
echo "1. Set in Vercel/env: NEXT_PUBLIC_CLIENT_ID=$COACH_SLUG"
echo "2. Set NEXT_PUBLIC_CLIENT_NAME=$COACH_NAME"
echo "3. Add coach to Supabase (first signup = coach, or create manually with tenant_id=$COACH_SLUG)"
echo "4. Add production URL to Supabase Redirect URLs"
echo "5. See docs/WHITELABEL_RESELLER.md for full setup"
