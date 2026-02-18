#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== BareMetal PaaS Updater ===${NC}"

# Function to run command as the owner of the directory if running as root
run_as_owner() {
    if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
        sudo -u "$SUDO_USER" "$@"
    else
        "$@"
    fi
}

# 0. Fix Permissions (Self-healing)
if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
    echo -e "${BLUE}Ensuring file ownership for $SUDO_USER...${NC}"
    chown -R "$SUDO_USER":"$(id -gn "$SUDO_USER")" .
fi

# 1. Pull latest code
echo -e "${BLUE}Pulling latest changes from Git...${NC}"
run_as_owner git pull

# 2. Update Backend Dependencies
echo -e "${BLUE}Updating Python dependencies...${NC}"

# Check for new venv location
if [ ! -d "backend/venv" ]; then
    echo -e "${BLUE}Creating missing virtual environment in backend/venv...${NC}"
    run_as_owner python3 -m venv backend/venv
fi

# Check for legacy venv (cleanup suggestion)
if [ -d "venv" ]; then
    echo -e "${RED}Warning: Found legacy 'venv' in root. You can safely remove it with: rm -rf venv${NC}"
fi

run_as_owner ./backend/venv/bin/pip install -r backend/requirements.txt

# 3. Rebuild Frontend
echo -e "${BLUE}Rebuilding Frontend...${NC}"
# Use mise to ensure correct node version
# We need to run mise as the user to access their tools/config if applicable, 
# but mise might be installed in /usr/local/bin. 
# Usually best to run build as user.
run_as_owner /usr/local/bin/mise use --global node@20
run_as_owner /usr/local/bin/mise exec node@20 -- npm install --prefix frontend
run_as_owner /usr/local/bin/mise exec node@20 -- npm run build --prefix frontend

# 3.5 Fix Service Paths (Migration to backend/)
SERVICE_FILE="/etc/systemd/system/bare-metal-paas.service"
if [ -f "$SERVICE_FILE" ]; then
    # Fix WorkingDirectory
    if ! grep -q "WorkingDirectory=.*/backend" "$SERVICE_FILE"; then
         echo -e "${BLUE}Migrating systemd WorkingDirectory to backend/...${NC}"
         # Append /backend to the line containing WorkingDirectory
         if [ "$EUID" -ne 0 ]; then
             sudo sed -i '/WorkingDirectory=/ s/$/\/backend/' "$SERVICE_FILE"
         else
             sed -i '/WorkingDirectory=/ s/$/\/backend/' "$SERVICE_FILE"
         fi
    fi

    # Fix ExecStart venv path
    if ! grep -q "ExecStart=.*/backend/venv" "$SERVICE_FILE"; then
         echo -e "${BLUE}Migrating systemd ExecStart to backend/venv...${NC}"
         # Replace /venv/ with /backend/venv/
         # We use a pattern that matches the old path structure
         if [ "$EUID" -ne 0 ]; then
             sudo sed -i 's|/venv/bin/python|/backend/venv/bin/python|' "$SERVICE_FILE"
         else
             sed -i 's|/venv/bin/python|/backend/venv/bin/python|' "$SERVICE_FILE"
         fi
    fi
     
    # Reload if we changed anything (checking logs would be better but reloading always is safe enough here)
    if [ "$EUID" -ne 0 ]; then
        sudo systemctl daemon-reload
    else
        systemctl daemon-reload
    fi
fi

# 4. Restart Service
echo -e "${BLUE}Restarting Systemd Service...${NC}"
# This MUST run as root. If script wasn't run as root, this will fail or prompt.
if [ "$EUID" -ne 0 ]; then
    echo -e "${BLUE}Requesting sudo for service restart...${NC}"
    sudo systemctl restart bare-metal-paas
else
    systemctl restart bare-metal-paas
fi

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
    # Reload caddy (needs root)
    if [ "$EUID" -ne 0 ]; then
        sudo systemctl reload caddy
    else
        systemctl reload caddy
    fi
    echo -e "${GREEN}Caddyfile updated and reloaded for user: $USER${NC}"
else
    echo -e "${RED}Warning: Could not extract config (Hash, Domain, or User is empty). Caddyfile not updated.${NC}"
fi

echo -e "${GREEN}=== Update Complete! ===${NC}"
