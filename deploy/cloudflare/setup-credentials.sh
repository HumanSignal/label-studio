#!/bin/bash
# Script to generate credentials.json from token
# Usage: ./setup-credentials.sh <token>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <cloudflare-tunnel-token>"
    exit 1
fi

TOKEN="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_FILE="${SCRIPT_DIR}/credentials.json"

# Decode token
DECODED=$(echo "$TOKEN" | base64 -d 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Failed to decode token"
    exit 1
fi

# Extract values using Python
ACCOUNT_TAG=$(echo "$DECODED" | python3 -c "import sys, json; print(json.load(sys.stdin)['a'])")
TUNNEL_ID=$(echo "$DECODED" | python3 -c "import sys, json; print(json.load(sys.stdin)['t'])")
TUNNEL_SECRET=$(echo "$DECODED" | python3 -c "import sys, json; print(json.load(sys.stdin)['s'])")

# Create credentials.json
cat > "$CREDENTIALS_FILE" <<EOF
{
  "AccountTag": "$ACCOUNT_TAG",
  "TunnelSecret": "$TUNNEL_SECRET",
  "TunnelID": "$TUNNEL_ID"
}
EOF

echo "Credentials file created at: $CREDENTIALS_FILE"
echo "Account Tag: $ACCOUNT_TAG"
echo "Tunnel ID: $TUNNEL_ID"

