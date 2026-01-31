# Bare Metal PaaS

**Your own private Heroku.** A lightweight, self-hosted platform for deploying Node.js, Python, Go, and Static applications directly on your Linux server.

<img src="frontend/public/BMP.svg" alt="Bare Metal PaaS Logo" width="150" />

## 📖 What is this?

Bare Metal PaaS (BMP) is a tool that turns a standard Linux server (Ubuntu/Debian) into a fully automated application platform. It combines a **Python backend** (to manage system processes) with a modern **React Dashboard** (to manage your apps).

**Why use this?**

- **You want simplicity**: No Docker, no Kubernetes, just native Linux processes.
- **You want performance**: Apps run directly on the hardware with zero container overhead.
- **You want control**: Every app gets its own system user, systemd service, and reverse proxy config automatically.

---

## 🚀 Getting Started

### Prerequisites

- A fresh Linux server (Ubuntu 22.04+ or Debian 12+ recommended).
- `root` or `sudo` access.
- A domain name pointing to your server (for the dashboard and apps).

### Installation

Run the automated installer to set up the backend, database, and system dependencies (Caddy, Mise, etc.).

```bash
# 1. Clone the repo to /opt (recommended location)
cd /opt
sudo git clone https://github.com/yourusername/bare-metal-paas.git
cd bare-metal-paas

# 2. Set permissions
sudo chown -R $USER:$USER .

# 3. Run the installer
chmod +x install.sh
sudo ./install.sh
```

### Running the Platform

BMP consists of two parts: the backend API and the frontend dashboard.

**1. Start the Backend:**

```bash
# Export required environment variables
export BASE_DOMAIN="your-server.com" # Apps will be subdomains (e.g., myapp.your-server.com)
export DASHBOARD_DOMAIN="dashboard.your-server.com"
export ADMIN_USER="admin"
export ADMIN_PASSWORD_HASH="..." # Generate with: caddy hash-password --plaintext 'secret'

# Run the orchestration server
sudo -E python3 main.py
```

**2. Start the Dashboard:**

```bash
cd frontend
npm install
npm run dev
```

_Note: In production, `install.sh` sets up systemd services to run these automatically._

---

## 🛠️ How to Deploy an App

Open your dashboard at `https://dashboard.your-server.com`. Click **"Deploy New App"**.

### 1. The Essentials

- **Name**: A unique name for your app. This determines your internal service name.
- **Repo URL**: The HTTPS clone URL of your GitHub/GitLab repository.
- **Domain**: Where should this app live? (e.g., `api.myapp.com`).

### 2. Choose Your Runtime

BMP supports two types of deployments:

#### 🟢 Standard Servers (Node, Python, Go)

For long-running backend servers (Express, FastAPI, Gin, etc.).

- **Build Command**: What runs after `git pull`? (e.g., `npm install && npm run build`).
- **Start Command**: How do we start the server? (e.g., `npm start`).
- **⚠️ Important**: Your app **MUST** listen on the port provided by the environment variable `PORT`.
    - _Bad_: `app.listen(3000)`
    - _Good_: `app.listen(process.env.PORT || 3000)`

#### 🔵 Static Sites (React, Vue, Astro)

For Single Page Applications (SPAs) or static HTML.

- **Select**: Any version ending in `:static` (e.g., `node@20:static`).
- **Start Command**: **This field changes meaning!** Enter the **relative path** to your built files.
    - Example: `dist` (for Vite apps) or `build` (for Create React App).
- The system will automatically configure Caddy to serve these files and handle SPA routing (rewriting 404s to `index.html`).

---

## 💡 Key Concepts & "Gotchas"

### Data Persistence

- **Code**: Your code lives in `/home/<app-user>/www`. It is updated via `git pull`.
- **Database**: The system tracks apps in `paas.db`.
- **⚠️ The Wipe Rule**: If you change the **Repo URL** or the **Language Version**, BMP assumes you are fundamentally changing the app. It will **delete the entire directory** and start fresh.
    - _Advice_: Store persistent data (uploads, SQLite DBs) outside the `www` folder, or use an external database (Postgres/MySQL).

### Security

- **Isolation**: Every app runs as its own Linux user. App A cannot read App B's files.
- **Reverse Proxy**: The backend API listens on `127.0.0.1`. It is only accessible through Caddy, which handles HTTPS and Basic Auth.

### CI/CD Hooks

Every app gets a unique webhook URL:
`https://dashboard.your-server.com/api/hooks/{your-secret-token}`

Add this to your GitHub Repository Webhooks (Content-Type: `application/json`). Pushing code will automatically trigger a "Pull > Build > Restart" cycle.

---

## 🔧 Maintenance

**Viewing Logs**:
Logs are streamed directly from `journalctl`. You can view them in the Dashboard under the "Logs" tab for each app.

**Backups**:
You can export the entire system state (all app configs) to a JSON file via the API or Dashboard. This is useful for migrating to a new server.

**Uninstalling an App**:
Clicking "Delete" is destructive. It will:

1. Stop the systemd service.
2. Delete the Linux user.
3. Remove the database entry.
4. Wipe the file directory.
