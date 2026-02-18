#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== BareMetal PaaS Installer ===${NC}"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo ./install.sh)${NC}"
  exit 1
fi

# 2. Config Prompts
echo -e "${BLUE}--- Configuration ---${NC}"
read -p "1. Enter the Domain for the Dashboard (e.g. admin.yourdomain.com): " DASHBOARD_DOMAIN
if [ -z "$DASHBOARD_DOMAIN" ]; then
    echo -e "${RED}Dashboard domain is required.${NC}"
    exit 1
fi

read -p "2. Enter the Base Domain for Apps (e.g. yourdomain.com): " APPS_DOMAIN
if [ -z "$APPS_DOMAIN" ]; then
    APPS_DOMAIN="paas.local"
fi

read -s -p "3. Enter Admin Password for Dashboard: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}Password is required.${NC}"
    exit 1
fi

echo -e "${GREEN}Dashboard: http://${DASHBOARD_DOMAIN}${NC}"
echo -e "${GREEN}Apps Suffix: *.${APPS_DOMAIN}${NC}"
echo ""

# 3. System Dependencies
echo -e "${BLUE}Installing System Dependencies...${NC}"
apt update
apt install -y git python3 python3-venv python3-pip curl debian-keyring debian-archive-keyring apt-transport-https

# 3.5 Check/Setup Swap (Optional for <4GB RAM)
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
if [ "$TOTAL_MEM_KB" -lt 4000000 ]; then
    echo -e "${BLUE}Detected <4GB RAM.${NC}"
    if [ ! -f /swapfile ]; then
        read -p "Create 4GB Swap file to prevent OOM during builds? (Recommended) [y/N]: " CREATE_SWAP
        if [[ "$CREATE_SWAP" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Creating 4GB Swap file...${NC}"
            fallocate -l 4G /swapfile
            chmod 600 /swapfile
            mkswap /swapfile
            swapon /swapfile
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
            echo -e "${GREEN}Swap created.${NC}"
        else
             echo -e "${BLUE}Skipping swap creation.${NC}"
        fi
    else
        echo -e "${BLUE}Swap file already exists.${NC}"
    fi
fi

# 4. Install Caddy (if not present)
if ! command -v caddy &> /dev/null; then
    echo -e "${BLUE}Installing Caddy...${NC}"
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install -y caddy
    systemctl enable caddy
    systemctl start caddy
fi

# Generate Password Hash
echo -e "${BLUE}Securing Dashboard...${NC}"
ADMIN_PASSWORD_HASH=$(caddy hash-password --plaintext "$ADMIN_PASSWORD")

# 5. Install Mise (if not present)
if ! command -v mise &> /dev/null && [ ! -f "/usr/local/bin/mise" ]; then
    echo -e "${BLUE}Installing Mise...${NC}"
    curl https://mise.jdx.dev/install.sh | sh
    mv ~/.local/bin/mise /usr/local/bin/mise
fi

MISE_BIN=$(command -v mise || echo "/usr/local/bin/mise")
echo -e "${BLUE}Using Mise at: ${MISE_BIN}${NC}"

# 6. Python Setup
echo -e "${BLUE}Setting up Backend...${NC}"
if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
fi
./backend/venv/bin/pip install -r backend/requirements.txt

# 7. Frontend Build
echo -e "${BLUE}Building Frontend...${NC}"
# Use mise to install Node.js temporarily to build assets
${MISE_BIN} use --global node@20
${MISE_BIN} exec node@20 -- npm install --prefix frontend
${MISE_BIN} exec node@20 -- npm run build --prefix frontend

# 8. Create Systemd Service for PaaS
echo -e "${BLUE}Creating Systemd Service...${NC}"
cat <<EOF > /etc/systemd/system/bare-metal-paas.service
[Unit]
Description=BareMetal PaaS Dashboard
After=network.target

[Service]
User=root
WorkingDirectory=$(pwd)/backend
Environment="BASE_DOMAIN=${APPS_DOMAIN}"
Environment="DASHBOARD_DOMAIN=${DASHBOARD_DOMAIN}"
Environment="ADMIN_USER=admin"
Environment="ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}"
ExecStart=$(pwd)/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bare-metal-paas

# 9. Configure Caddy for Dashboard
# We use the Caddy API to add the dashboard route, just like system_ops.py does for apps
echo -e "${BLUE}Configuring Caddy...${NC}"

# Simple Caddyfile approach for the main dashboard (easier/safer than API for the root config)
# We backup existing Caddyfile if it exists
if [ -f /etc/caddy/Caddyfile ]; then
    cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
fi

# This config proxies the base domain to our backend
# We include the basic_auth here so the dashboard is secure immediately,
# before the Python backend performs its first sync.
cat <<EOF > /etc/caddy/Caddyfile
{
    debug
}

${DASHBOARD_DOMAIN} {
    @secure {
        not path /api/hooks/*
    }
    basic_auth @secure {
        admin ${ADMIN_PASSWORD_HASH}
    }
    reverse_proxy localhost:1323
}
EOF

systemctl reload caddy

# Restart the service to ensure it syncs the secure config via API *after* Caddy has reloaded the static file.
systemctl restart bare-metal-paas

echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo -e "Dashboard available at: http://${DASHBOARD_DOMAIN}"
echo -e "Backend Service: systemctl status bare-metal-paas"
echo -e "Note: Ensure your DNS points ${DASHBOARD_DOMAIN} to this server IP."
