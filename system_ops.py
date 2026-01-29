import os
import pwd
import subprocess
import socket
import requests
import shlex
import shutil
from database import AppModel, get_apps

MISE_PATH = shutil.which("mise") or "/usr/local/bin/mise"


def run_command(command: str, cwd=None, env=None) -> str:
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            env=env,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise Exception(f"Command failed: {e.cmd}\nOutput: {e.output}")


def run_as_user(username: str, command: str, cwd: str) -> str:
    try:
        pw_record = pwd.getpwnam(username)
    except KeyError:
        raise Exception(f"User {username} not found")

    home = pw_record.pw_dir

    # Using 'runuser' is robust.
    # We rely on shlex.quote to safely wrap the inner command.
    quoted_cmd = shlex.quote(command)
    full_cmd = f"runuser -u {username} -- /bin/bash -c {quoted_cmd}"

    return run_command(full_cmd, cwd=cwd)


def create_app_user(name: str):
    try:
        pwd.getpwnam(name)
        # User exists, ensure perms
    except KeyError:
        run_command(f"useradd -m -d /home/{name} -s /bin/bash {name}")

    home_dir = f"/home/{name}"
    run_command(f"chmod 700 {home_dir}")


def remove_app_user(name: str):
    try:
        pwd.getpwnam(name)
        run_command(f"userdel -f -r {name}")
    except KeyError:
        pass  # User doesn't exist


def find_available_port() -> int:
    # Get ports currently used by apps in DB
    used_ports = {app.port for app in get_apps() if app.port}

    for port in range(8000, 9000):
        if port in used_ports:
            continue

        # Check if port is actually free on system
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("localhost", port)) != 0:
                return port
    raise Exception("No available ports found")


def clone_or_pull(app: AppModel) -> str:
    home_dir = f"/home/{app.name}"
    www_path = os.path.join(home_dir, "www")

    if not os.path.exists(www_path):
        return run_as_user(app.name, f"git clone {app.repo_url} www", home_dir)
    else:
        # Check if repo URL has changed
        try:
            current_remote = run_as_user(app.name, "git remote get-url origin", www_path).strip()
            if current_remote != app.repo_url:
                # Remove existing repo and re-clone
                run_command(f"rm -rf {www_path}")
                return run_as_user(app.name, f"git clone {app.repo_url} www", home_dir)
        except Exception as e:
            # If checking remote fails (e.g. not a git repo), wipe and clone
            print(f"Warning: Could not check remote url ({e}), re-cloning...")
            run_command(f"rm -rf {www_path}")
            return run_as_user(app.name, f"git clone {app.repo_url} www", home_dir)

        return run_as_user(app.name, "git pull", www_path)


def configure_mise(app: AppModel) -> str:
    www_path = f"/home/{app.name}/www"
    # mise expects "node 18" not "node@18" in .tool-versions
    version_line = app.language_version.replace("@", " ")
    cmd = f"echo '{version_line}' > .tool-versions"
    return run_as_user(app.name, cmd, www_path)


def install_dependencies(app: AppModel) -> str:
    www_path = f"/home/{app.name}/www"
    # mise install uses .tool-versions we just wrote.
    # We must activate mise so that shims/paths are set up, otherwise 'npm' (which calls 'node') fails.
    cmd = f'eval "$({MISE_PATH} activate bash)" && {MISE_PATH} install'
    out = run_as_user(app.name, cmd, www_path)

    # Debug ls
    ls_out = run_as_user(app.name, f"{MISE_PATH} ls", www_path)
    return out + "\nInstalled: " + ls_out


def build_app(app: AppModel) -> str:
    www_path = f"/home/{app.name}/www"
    # We wrap the build command in bash -c so chained commands (&&) run inside the mise environment
    # shlex.quote() is used on the inner command to prevent it from being split incorrectly
    quoted_build = shlex.quote(app.build_command)
    cmd = f"{MISE_PATH} exec {app.language_version} -- bash -c {quoted_build}"
    return run_as_user(app.name, cmd, www_path)


SERVICE_TEMPLATE = """[Unit]
Description={name}

[Service]
User={name}
Group={name}
WorkingDirectory=/home/{name}/www
Environment=PORT={port}
ExecStart={mise_path} exec {language_version} -- {start_command}
Restart=always

[Install]
WantedBy=multi-user.target
"""


def create_systemd_service(app: AppModel) -> str:
    service_path = f"/etc/systemd/system/{app.name}.service"
    content = SERVICE_TEMPLATE.format(
        name=app.name, 
        language_version=app.language_version, 
        start_command=app.start_command, 
        port=app.port,
        mise_path=MISE_PATH
    )

    with open(service_path, "w") as f:
        f.write(content)

    cmds = ["systemctl daemon-reload", f"systemctl enable {app.name}.service", f"systemctl restart {app.name}.service"]

    logs = ""
    for cmd in cmds:
        out = run_command(cmd)
        logs += f"Running {cmd}: {out}\n"

    return logs


def remove_systemd_service(name: str):
    service_name = f"{name}.service"
    try:
        run_command(f"systemctl stop {service_name}")
        run_command(f"systemctl disable {service_name}")
    except:
        pass  # Ignore errors if not running

    service_path = f"/etc/systemd/system/{service_name}"
    if os.path.exists(service_path):
        os.remove(service_path)

    run_command("systemctl daemon-reload")


def update_caddy_config():
    apps = get_apps()
    
    # Start with global options
    caddyfile_lines = [
        "{",
        "    debug",
        "}"
    ]

    # 1. Add Dashboard Route (if configured)
    dashboard_domain = os.getenv("DASHBOARD_DOMAIN")
    admin_user = os.getenv("ADMIN_USER")
    admin_pass_hash = os.getenv("ADMIN_PASSWORD_HASH")

    if dashboard_domain:
        caddyfile_lines.append(f"{dashboard_domain} {{")
        
        # Add Basic Auth if configured
        if admin_user and admin_pass_hash:
            caddyfile_lines.append("    @secure {")
            caddyfile_lines.append("        not path /api/hooks/*")
            caddyfile_lines.append("    }")
            caddyfile_lines.append("    basic_auth @secure {")
            caddyfile_lines.append(f"        {admin_user} {admin_pass_hash}")
            caddyfile_lines.append("    }")

        caddyfile_lines.append("    reverse_proxy localhost:1323")
        caddyfile_lines.append("}")

    # 2. Add App Routes
    for app in apps:
        if app.domain and app.port:
            caddyfile_lines.append(f"{app.domain} {{")
            caddyfile_lines.append(f"    reverse_proxy localhost:{app.port}")
            caddyfile_lines.append("}")

    caddyfile_content = "\n".join(caddyfile_lines)

    try:
        resp = requests.post(
            "http://localhost:2019/load", 
            headers={"Content-Type": "text/caddyfile"},
            data=caddyfile_content
        )
        resp.raise_for_status()
    except Exception as e:
        raise Exception(f"Failed to update Caddy: {e}")
