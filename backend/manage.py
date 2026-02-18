#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse
import shutil
import getpass
import time

# Ensure we can import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import system_ops

# ANSI Colors
BLUE = '\033[0;34m'
GREEN = '\033[0;32m'
RED = '\033[0;31m'
NC = '\033[0m'

def log(msg, color=BLUE):
    print(f"{color}{msg}{NC}")

def run_as_owner(cmd_list, cwd=None):
    """Run a command as the sudo user if running as root."""
    sudo_user = os.environ.get('SUDO_USER')
    if os.geteuid() == 0 and sudo_user:
        # Get user ID and Group ID
        uid = int(subprocess.check_output(['id', '-u', sudo_user]).strip())
        gid = int(subprocess.check_output(['id', '-g', sudo_user]).strip())
        
        def demote_user():
            os.setgid(gid)
            os.setuid(uid)
            
        subprocess.check_call(cmd_list, cwd=cwd, preexec_fn=demote_user)
    else:
        subprocess.check_call(cmd_list, cwd=cwd)

def check_root():
    if os.geteuid() != 0:
        log("This command requires root privileges. Please run with sudo.", RED)
        sys.exit(1)

def install():
    check_root()
    log("=== BareMetal PaaS Installer ===")
    
    # 1. Configuration
    base_domain = input(f"Enter Base Domain (e.g. paas.example.com): ").strip()
    if not base_domain:
        log("Base Domain is required.", RED)
        sys.exit(1)
        
    dashboard_domain = input(f"Enter Dashboard Domain (e.g. dashboard.example.com) [dashboard.{base_domain}]: ").strip()
    if not dashboard_domain:
        dashboard_domain = f"dashboard.{base_domain}"
        
    admin_password = getpass.getpass("Enter Admin Password: ").strip()
    if not admin_password:
        log("Password is required.", RED)
        sys.exit(1)

    log("Generating Password Hash...")
    try:
        # Try to use caddy to hash (if installed)
        password_hash = subprocess.check_output(
            ['caddy', 'hash-password', '--plaintext', admin_password]
        ).decode().strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        # Fallback or error if caddy not found (installer should probably install caddy first)
        log("Caddy not found or failed to hash password. Please install Caddy first.", RED)
        sys.exit(1)

    # 1. System Dependencies (Apt)
    log("Installing System Dependencies...")
    subprocess.check_call(['apt-get', 'update'])
    subprocess.check_call(['apt-get', 'install', '-y', 'git', 'curl', 'debian-keyring', 'debian-archive-keyring', 'apt-transport-https'])

    # 2. Caddy Install
    log("Installing Caddy...")
    if shutil.which('caddy') is None:
        subprocess.check_call(['curl', '-1sLf', 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key', '|', 'gpg', '--dearmor', '-o', '/usr/share/keyrings/caddy-stable-archive-keyring'], shell=True)
        subprocess.check_call(['curl', '-1sLf', 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt', '|', 'tee', '/etc/apt/sources.list.d/caddy-stable.list'], shell=True)
        subprocess.check_call(['apt-get', 'update'])
        subprocess.check_call(['apt-get', 'install', '-y', 'caddy'])

    # 3. Mise Install
    log("Installing Mise (Runtime Manager)...")
    if shutil.which('mise') is None:
        subprocess.check_call(['curl', 'https://mise.run', '|', 'sh'], shell=True)
        # Add to path for this session
        os.environ["PATH"] += f":{os.path.expanduser('~/.local/bin')}"

    # 4. Service Setup
    log("Creating Systemd Service...")
    
    service_content = f"""[Unit]
Description=BareMetal PaaS Dashboard
After=network.target

[Service]
User=root
WorkingDirectory={os.getcwd()}/backend
Environment="BASE_DOMAIN={base_domain}"
Environment="DASHBOARD_DOMAIN={dashboard_domain}"
Environment="ADMIN_USER=admin"
Environment="ADMIN_PASSWORD_HASH={password_hash}"
ExecStart={os.getcwd()}/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
"""
    with open('/etc/systemd/system/bare-metal-paas.service', 'w') as f:
        f.write(service_content)
    
    subprocess.check_call(['systemctl', 'daemon-reload'])
    subprocess.check_call(['systemctl', 'enable', 'bare-metal-paas'])
    
    # Run update to build and start
    update()

def update():
    check_root()
    log("=== BareMetal PaaS Updater ===")
    
    # 0. Fix Permissions
    sudo_user = os.environ.get('SUDO_USER')
    if sudo_user:
        log(f"Ensuring file ownership for {sudo_user}...")
        uid = int(subprocess.check_output(['id', '-u', sudo_user]).strip())
        gid = int(subprocess.check_output(['id', '-g', sudo_user]).strip())
        
        for root, dirs, files in os.walk('.'):
             for d in dirs:
                 os.chown(os.path.join(root, d), uid, gid)
             for f in files:
                 os.chown(os.path.join(root, f), uid, gid)

    # 1. Dependencies
    log("Updating Python dependencies...")
    pip_bin = "./backend/venv/bin/pip"
    run_as_owner([pip_bin, 'install', '-r', 'backend/requirements.txt'])

    # 2. Frontend
    log("Building Frontend...")
    mise_bin = "/usr/local/bin/mise" 
    if not os.path.exists(mise_bin):
         if sudo_user:
             user_home = os.path.expanduser(f"~{sudo_user}")
             mise_bin = f"{user_home}/.local/bin/mise"

    if os.path.exists(mise_bin):
        run_as_owner([mise_bin, 'use', '--global', 'node@20'])
        run_as_owner([mise_bin, 'exec', 'node@20', '--', 'npm', 'install', '--prefix', 'frontend'])
        run_as_owner([mise_bin, 'exec', 'node@20', '--', 'npm', 'run', 'build', '--prefix', 'frontend'])
    else:
        log("Mise not found, manual node install required.", RED)

    # 3. Service
    log("Restarting Service...")
    service_file = "/etc/systemd/system/bare-metal-paas.service"
    
    # Auto-migration of service paths
    if os.path.exists(service_file):
        with open(service_file, 'r') as f:
            content = f.read()
        
        new_content = content
        if "WorkingDirectory=" in content and "/backend" not in content.split("WorkingDirectory=")[1].split("\n")[0]:
             log("Migrating systemd WorkingDirectory...")
             cwd = os.getcwd()
             new_content = new_content.replace(f"WorkingDirectory={cwd}", f"WorkingDirectory={cwd}/backend")
        
        if "ExecStart=" in content and "/backend/venv" not in content.split("ExecStart=")[1].split("\n")[0]:
             log("Migrating systemd ExecStart...")
             cwd = os.getcwd()
             new_content = new_content.replace(f"ExecStart={cwd}/venv", f"ExecStart={cwd}/backend/venv")
             
        if new_content != content:
            with open(service_file, 'w') as f:
                f.write(new_content)
            subprocess.check_call(['systemctl', 'daemon-reload'])

    subprocess.check_call(['systemctl', 'restart', 'bare-metal-paas'])
    
    # 4. Sync Caddyfile
    log("Syncing Caddyfile...")
    if os.path.exists(service_file):
        with open(service_file, 'r') as f:
            svc_content = f.read()
            
        def get_env(name):
            import re
            m = re.search(f'Environment="{name}=([^"]*)"', svc_content)
            return m.group(1) if m else None

        domain = get_env('DASHBOARD_DOMAIN')
        user = get_env('ADMIN_USER')
        pw_hash = get_env('ADMIN_PASSWORD_HASH')
        
        if domain and user and pw_hash:
            caddyfile = f"""{{
    debug
}}

{domain} {{
    @secure {{
        not path /api/hooks/*
    }}
    basic_auth @secure {{
        {user} {pw_hash}
    }}
    reverse_proxy localhost:1323
}}
"""
            with open('/etc/caddy/Caddyfile', 'w') as f:
                f.write(caddyfile)
            subprocess.check_call(['systemctl', 'reload', 'caddy'])
            log(f"Caddyfile updated for {domain}", GREEN)


def dev():
    log("Starting Backend in Development Mode...")
    python_bin = "./backend/venv/bin/python"
    subprocess.call([python_bin, "backend/main.py"])

def main():
    parser = argparse.ArgumentParser(description="BareMetal PaaS Management CLI")
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    subparsers.add_parser('install', help="Install the PaaS")
    subparsers.add_parser('update', help="Update the PaaS")
    subparsers.add_parser('dev', help="Run in dev mode")
    
    args = parser.parse_args()
    
    if args.command == 'install':
        install()
    elif args.command == 'update':
        update()
    elif args.command == 'dev':
        dev()

if __name__ == "__main__":
    main()
