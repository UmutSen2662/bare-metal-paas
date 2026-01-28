from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import database
import system_ops
import traceback
import os
import psutil
import subprocess
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    database.init_db()
    if os.geteuid() != 0:
        print("WARNING: Not running as root. System operations (useradd, systemd) will fail.")
    if not os.path.exists("/usr/local/bin/mise"):
        print("WARNING: Mise not found at /usr/local/bin/mise. Deployments will fail.")
    yield


app = FastAPI(lifespan=lifespan)

# Config
BASE_DOMAIN = os.getenv("BASE_DOMAIN", "paas.local")
DASHBOARD_DOMAIN = os.getenv("DASHBOARD_DOMAIN")


class DeployRequest(BaseModel):
    name: str
    repo_url: str
    domain: str
    build_command: str
    start_command: str
    language_version: str


@app.get("/api/apps")
def get_apps():
    try:
        return database.get_apps()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config")
def get_config():
    return {"base_domain": BASE_DOMAIN}


@app.get("/api/system-stats")
def get_system_stats():
    try:
        cpu_percent = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_percent": cpu_percent,
            "memory": {
                "total": mem.total,
                "available": mem.available,
                "percent": mem.percent
            },
            "disk": {
                "total": disk.total,
                "free": disk.free,
                "percent": disk.percent
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/apps/{name}/logs")
def get_app_logs(name: str):
    # Security check: ensure app exists to prevent arbitrary service queries
    if not database.get_app_by_name(name):
        raise HTTPException(status_code=404, detail="App not found")

    try:
        # Fetch last 100 lines of logs from journalctl
        # -u: unit name
        # -n: number of lines
        # --no-pager: raw output
        cmd = ["journalctl", "-u", f"{name}.service", "-n", "100", "--no-pager"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return {"logs": result.stdout + result.stderr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/apps/{name}")
def delete_app(name: str):
    try:
        # 1. Remove Systemd Service
        try:
            system_ops.remove_systemd_service(name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to remove service: {e}")

        # 2. Remove User
        try:
            system_ops.remove_app_user(name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to remove user: {e}")

        # 3. Remove from DB
        database.delete_app(name)

        # 4. Update Caddy
        try:
            system_ops.update_caddy_config()
        except Exception as e:
            print(f"Warning: Failed to update Caddy after delete: {e}")

        return {"message": "App deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/deploy")
def deploy(req: DeployRequest):
    logs = ""
    is_new_app = False
    try:
        # 1. DB: Save or Update app
        existing_app = database.get_app_by_name(req.name)

        if existing_app:
            app_model = existing_app
            app_model.repo_url = req.repo_url
            app_model.domain = req.domain
            app_model.build_command = req.build_command
            app_model.start_command = req.start_command
            app_model.language_version = req.language_version
            # Port remains same
        else:
            is_new_app = True
            port = system_ops.find_available_port()
            app_model = database.AppModel(
                name=req.name,
                repo_url=req.repo_url,
                domain=req.domain,
                port=port,
                build_command=req.build_command,
                start_command=req.start_command,
                language_version=req.language_version,
            )

        database.upsert_app(app_model)

        # 2. User
        try:
            system_ops.create_app_user(app_model.name)
            logs += f"User {app_model.name} ensured.\n"
        except Exception as e:
            raise Exception(f"Failed to create user: {e}")

        # 3. Clone/Pull
        try:
            out = system_ops.clone_or_pull(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 4. Mise Config
        try:
            out = system_ops.configure_mise(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 4.5 Install Dependencies
        try:
            out = system_ops.install_dependencies(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 5. Build
        try:
            out = system_ops.build_app(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 6. Service (Systemd)
        try:
            out = system_ops.create_systemd_service(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 7. Caddy
        try:
            system_ops.update_caddy_config()
            logs += "Caddy config updated.\n"
        except Exception as e:
            raise Exception(str(e))

        return {"message": "Deployed successfully", "app_url": f"http://{app_model.domain}", "logs": logs}

    except Exception as e:
        traceback.print_exc()
        if is_new_app:
            logs += f"\nDeployment failed. Rolling back new app {req.name}...\n"
            try:
                system_ops.remove_systemd_service(req.name)
                system_ops.remove_app_user(req.name)
                database.delete_app(req.name)
                system_ops.update_caddy_config()
                logs += "Rollback successful: User, Service, and DB entry removed.\n"
            except Exception as rollback_e:
                logs += f"Rollback CRITICAL FAILURE: {rollback_e}\n"

        return JSONResponse(status_code=500, content={"detail": str(e), "logs": logs})


@app.post("/api/hooks/{token}")
def webhook_deploy(token: str):
    app_model = database.get_app_by_token(token)
    if not app_model:
        raise HTTPException(status_code=404, detail="Invalid token")

    logs = f"Webhook triggered for {app_model.name}\n"
    try:
        # 3. Clone/Pull
        try:
            out = system_ops.clone_or_pull(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 4. Mise Config
        try:
            out = system_ops.configure_mise(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 4.5 Install Dependencies
        try:
            out = system_ops.install_dependencies(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 5. Build
        try:
            out = system_ops.build_app(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        # 6. Service (Systemd)
        try:
            out = system_ops.create_systemd_service(app_model)
            logs += out
        except Exception as e:
            raise Exception(str(e))

        return {"message": "Redeployed successfully", "app": app_model.name, "logs": logs}

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e), "logs": logs})


# --- Frontend Serving (Must be last) ---
frontend_path = os.path.join(os.path.dirname(__file__), "frontend/dist")

if os.path.exists(frontend_path):
    # Mount assets (JS/CSS)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    # Serve index.html for all other routes (SPA support)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to pass through if they weren't caught above (though FastAPI matches specific routes first)
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        return FileResponse(os.path.join(frontend_path, "index.html"))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=1323)
