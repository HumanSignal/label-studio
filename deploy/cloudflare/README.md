# Cloudflare Tunnel Configuration

This directory contains the Cloudflare tunnel configuration files.

## Files

- `config.yml` - Main tunnel configuration file
- `credentials.json` - Tunnel authentication credentials

## Setup Instructions

To convert from token-based authentication to config file:

1. Extract your tunnel ID from the Cloudflare dashboard or using the token:
   ```bash
   # The token contains the tunnel ID. You can decode it or get it from Cloudflare dashboard
   # Go to: https://one.dash.cloudflare.com/ > Zero Trust > Networks > Tunnels
   ```

2. Get your Account Tag from Cloudflare dashboard:
   - Go to: https://one.dash.cloudflare.com/
   - Your Account ID is in the URL or in the right sidebar

3. Extract Tunnel Secret from your original token (if available) or create new credentials:
   ```bash
   # If you need to create new credentials, run:
   # cloudflared tunnel create <tunnel-name>
   ```

4. Update `config.yml`:
   - Replace `TUNNEL_ID_PLACEHOLDER` with your actual tunnel ID

5. Update `credentials.json`:
   - Replace `ACCOUNT_TAG_PLACEHOLDER` with your Cloudflare Account ID
   - Replace `TUNNEL_SECRET_PLACEHOLDER` with your tunnel secret
   - Replace `TUNNEL_ID_PLACEHOLDER` with your tunnel ID

## Alternative: Extract from Token

If you have the token and want to extract the tunnel ID, you can decode the base64 token:
```bash
echo "YOUR_TOKEN" | base64 -d | jq
```

The token contains:
- `a` - Account ID
- `t` - Tunnel ID  
- `s` - Tunnel Secret

Use these values to populate the config files.

