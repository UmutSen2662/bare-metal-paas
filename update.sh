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
./venv/bin/pip install -r requirements.txt

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
HASH=$(systemctl show bare-metal-paas -p Environment | grep ADMIN_PASSWORD_HASH | cut -d= -f2)
DOMAIN=$(systemctl show bare-metal-paas -p Environment | grep DASHBOARD_DOMAIN | cut -d= -f2)

if [ -n "$HASH" ] && [ -n "$DOMAIN" ]; then
cat <<EOF > /etc/caddy/Caddyfile
{
    debug
}

$DOMAIN {
    @secure {
        not path /api/hooks/*
    }
    basic_auth @secure {
        admin $HASH
    }
    reverse_proxy localhost:1323
}
EOF
    systemctl reload caddy
    echo -e "${GREEN}Caddyfile updated and reloaded.${NC}"
else
    echo -e "${RED}Warning: Could not extract config from systemd. Caddyfile not updated.${NC}"
fi

echo -e "${GREEN}=== Update Complete! ===${NC}"
