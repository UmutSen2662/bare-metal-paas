#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== BareMetal PaaS Updater ===${NC}"

# 1. Pull latest code
echo -e "${BLUE}Pulling latest changes from Git...${NC}"
git pull

# 2. Update Backend Dependencies
echo -e "${BLUE}Updating Python dependencies...${NC}"

# Check for new venv location
if [ ! -d "backend/venv" ]; then
    echo -e "${BLUE}Creating missing virtual environment in backend/venv...${NC}"
    python3 -m venv backend/venv
fi

# Check for legacy venv (cleanup suggestion)
if [ -d "venv" ]; then
    echo -e "${RED}Warning: Found legacy 'venv' in root. You can safely remove it with: rm -rf venv${NC}"
fi

./backend/venv/bin/pip install -r backend/requirements.txt

# 3. Rebuild Frontend
echo -e "${BLUE}Rebuilding Frontend...${NC}"
# Use mise to ensure correct node version
/usr/local/bin/mise use --global node@20
/usr/local/bin/mise exec node@20 -- npm install --prefix frontend
/usr/local/bin/mise exec node@20 -- npm run build --prefix frontend

# 4. Restart Service
echo -e "${BLUE}Restarting Systemd Service...${NC}"
systemctl restart bare-metal-paas

# 5. Sync Caddyfile on Disk (Maintenance)
echo -e "${BLUE}Syncing Caddyfile...${NC}"

# Read directly from the service file for reliability
SERVICE_FILE="/etc/systemd/system/bare-metal-paas.service"
if [ -f "$SERVICE_FILE" ]; then
    # Extract values using sed with | as delimiter to handle slashes in hashes
    DOMAIN=$(grep 'Environment="DASHBOARD_DOMAIN=' "$SERVICE_FILE" | head -n 1 | sed 's|^.*Environment="DASHBOARD_DOMAIN=\([^"]*\)".*$|\1|')
    USER=$(grep 'Environment="ADMIN_USER=' "$SERVICE_FILE" | head -n 1 | sed 's|^.*Environment="ADMIN_USER=\([^"]*\)".*$|\1|')
    HASH=$(grep 'Environment="ADMIN_PASSWORD_HASH=' "$SERVICE_FILE" | head -n 1 | sed 's|^.*Environment="ADMIN_PASSWORD_HASH=\([^"]*\)".*$|\1|')
else
    echo -e "${RED}Service file not found at $SERVICE_FILE${NC}"
fi

if [ -n "$HASH" ] && [ -n "$DOMAIN" ] && [ -n "$USER" ]; then
cat <<EOF > /etc/caddy/Caddyfile
{
    debug
}

$DOMAIN {
    @secure {
        not path /api/hooks/*
    }
    basic_auth @secure {
        $USER $HASH
    }
    reverse_proxy localhost:1323
}
EOF
    systemctl reload caddy
    echo -e "${GREEN}Caddyfile updated and reloaded for user: $USER${NC}"
else
    echo -e "${RED}Warning: Could not extract config (Hash, Domain, or User is empty). Caddyfile not updated.${NC}"
fi

echo -e "${GREEN}=== Update Complete! ===${NC}"
