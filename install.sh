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

echo -e "${GREEN}Dashboard: http://${DASHBOARD_DOMAIN}${NC}"
echo -e "${GREEN}Apps Suffix: *.${APPS_DOMAIN}${NC}"
echo ""

# 3. System Dependencies
echo -e "${BLUE}Installing System Dependencies...${NC}"
apt update
apt install -y git python3 python3-venv python3-pip curl debian-keyring debian-archive-keyring apt-transport-https

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

# 5. Install Mise (if not present)
if [ ! -f "/usr/local/bin/mise" ]; then
    echo -e "${BLUE}Installing Mise...${NC}"
    curl https://mise.jdx.dev/install.sh | sh
    mv ~/.local/bin/mise /usr/local/bin/mise
fi

# 6. Python Setup
echo -e "${BLUE}Setting up Backend...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
./venv/bin/pip install fastapi uvicorn requests psutil

# 7. Frontend Build
echo -e "${BLUE}Building Frontend...${NC}"
# Use mise to install Node.js temporarily to build assets
/usr/local/bin/mise use --global node@20
/usr/local/bin/mise exec node@20 -- npm install --prefix frontend
/usr/local/bin/mise exec node@20 -- npm run build --prefix frontend

# 8. Create Systemd Service for PaaS
echo -e "${BLUE}Creating Systemd Service...${NC}"
cat <<EOF > /etc/systemd/system/bare-metal-paas.service
[Unit]
Description=BareMetal PaaS Dashboard
After=network.target

[Service]
User=root
WorkingDirectory=$(pwd)
Environment="BASE_DOMAIN=${APPS_DOMAIN}"
Environment="DASHBOARD_DOMAIN=${DASHBOARD_DOMAIN}"
ExecStart=$(pwd)/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bare-metal-paas
systemctl restart bare-metal-paas

# 9. Configure Caddy for Dashboard
# We use the Caddy API to add the dashboard route, just like system_ops.py does for apps
echo -e "${BLUE}Configuring Caddy...${NC}"

# Simple Caddyfile approach for the main dashboard (easier/safer than API for the root config)
# We backup existing Caddyfile if it exists
if [ -f /etc/caddy/Caddyfile ]; then
    cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
fi

# This config proxies the base domain to our backend
cat <<EOF > /etc/caddy/Caddyfile
${DASHBOARD_DOMAIN} {
    reverse_proxy localhost:1323
}

:80 {
    # Default listener for apps (will be managed by API dynamically)
    respond "BareMetal PaaS Gateway"
}
EOF

systemctl reload caddy

echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo -e "Dashboard available at: http://${DASHBOARD_DOMAIN}"
echo -e "Backend Service: systemctl status bare-metal-paas"
echo -e "Note: Ensure your DNS points ${DASHBOARD_DOMAIN} to this server IP."
