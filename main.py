from fastapi import FastAPI, HTTPException, status, BackgroundTasks
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
import shutil
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    database.init_db()
    if os.geteuid() != 0:
        print("WARNING: Not running as root. System operations (useradd, systemd) will fail.")
    if not shutil.which("mise") and not os.path.exists("/usr/local/bin/mise"):
        print("WARNING: Mise not found in PATH or at /usr/local/bin/mise. Deployments will fail.")
    
    # Sync Caddy Config on Startup
    try:
        system_ops.update_caddy_config()
        print("Caddy configuration synced successfully.")
    except Exception as e:
        print(f"WARNING: Failed to sync Caddy on startup (is Caddy running?): {e}")
        
    yield


app = FastAPI(lifespan=lifespan)

# Config - Initialized from env, but can be overridden by DB
DEFAULT_BASE_DOMAIN = os.getenv("BASE_DOMAIN", "paas.local")
DASHBOARD_DOMAIN = os.getenv("DASHBOARD_DOMAIN")


def get_base_domain():
    return database.get_setting("base_domain", DEFAULT_BASE_DOMAIN)


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
        apps = database.get_apps()
        for app in apps:
            app.status = system_ops.get_service_status(app.name)
        return apps
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config")
def get_config():
    return {"base_domain": get_base_domain()}


@app.post("/api/config")
def post_config(config: dict):
    if "base_domain" in config:
        database.set_setting("base_domain", config["base_domain"])
        # Update Caddy because base domain changed
        try:
            system_ops.update_caddy_config()
        except Exception as e:
            print(f"Warning: Failed to update Caddy after domain change: {e}")
    return {"message": "Config updated"}


@app.get("/api/export")
def export_config():
    try:
        apps = database.get_apps()
        return {
            "version": "1.0",
            "base_domain": get_base_domain(),
            "apps": [app.dict() for app in apps]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate-config")
def validate_config(config: dict):
    if config.get("version") != "1.0":
        raise HTTPException(status_code=400, detail="Unsupported configuration version")
    
    if not isinstance(config.get("apps"), list):
         raise HTTPException(status_code=400, detail="Invalid apps list")

    return {"message": "Configuration is valid", "app_count": len(config.get("apps", []))}


def redeploy_all_apps(apps_data: list):
    print(f"Starting background redeploy for {len(apps_data)} apps...")
    for app_data in apps_data:
        try:
            # We need to fetch the full object again to be safe or construct it
            app_name = app_data.get("name")
            print(f"Redeploying {app_name}...")
            
            # Get fresh model from DB
            app_model = database.get_app_by_name(app_name)
            
            if app_model:
                system_ops.redeploy_app(app_model)
                print(f"Successfully redeployed {app_name}")
            else:
                print(f"Skipping {app_name}, not found in DB")
                
        except Exception as e:
            print(f"Failed to redeploy {app_data.get('name')}: {e}")
            traceback.print_exc()
    print("Background redeployment complete.")


@app.post("/api/import")
def import_config(config: dict, background_tasks: BackgroundTasks, redeploy: bool = False):
    try:
        if config.get("version") != "1.0":
            raise HTTPException(status_code=400, detail="Unsupported configuration version")
        
        if "base_domain" in config:
            database.set_setting("base_domain", config["base_domain"])
        
        apps = config.get("apps", [])
        for app_data in apps:
            # 1. ID: Ignore imported ID to avoid primary key conflicts
            app_data.pop("id", None)
            
            # 2. Port: Ignore imported port to avoid collisions on this system
            app_data.pop("port", None)
            
            # Check if app exists to decide on port strategy
            existing_app = database.get_app_by_name(app_data["name"])
            
            if not existing_app:
                # New App: Must assign a fresh, available port on THIS system
                app_data["port"] = system_ops.find_available_port()
                # Note: If existing_app is True, we leave port as None. 
                # database.upsert_app handles None by preserving the existing DB value.

            # 3. Token: We allow the imported token to overwrite (or set) the DB value.
            # This ensures GitHub webhooks linked to this config continue working.
            
            app = database.AppModel(**app_data)
            database.upsert_app(app)
        
        try:
            system_ops.update_caddy_config()
        except Exception as e:
            print(f"Warning: Failed to update Caddy after import: {e}")
        
        msg = f"Successfully imported {len(apps)} apps."
        
        if redeploy and len(apps) > 0:
            background_tasks.add_task(redeploy_all_apps, apps)
            msg += " Redeployment started in background."
        else:
            msg += " Please redeploy them to ensure they are fully set up."
            
        return {"message": msg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@app.get("/api/apps/{name}")
def get_app(name: str):
    app = database.get_app_by_name(name)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    app.status = system_ops.get_service_status(app.name)
    return app


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
    # 0. Domain Conflict Check
    existing_domain_owner = database.get_app_by_domain(req.domain)
    if existing_domain_owner and existing_domain_owner.name != req.name:
        raise HTTPException(
            status_code=409, 
            detail=f"Domain '{req.domain}' is already in use by application '{existing_domain_owner.name}'"
        )

    logs = ""
    is_new_app = False
    try:
        # 1. DB: Save or Update app
        existing_app = database.get_app_by_name(req.name)

        if existing_app:
            app_model = existing_app
            
            # Check if language version changed
            if app_model.language_version != req.language_version:
                logs += f"Language version changed from {app_model.language_version} to {req.language_version}. Wiping directory for clean slate...\n"
                try:
                    system_ops.run_command(f"rm -rf /home/{app_model.name}/www")
                except Exception as e:
                    logs += f"Warning: Failed to wipe directory: {e}\n"

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
            is_static = ":static" in (app_model.language_version or "")
            system_ops.create_app_user(app_model.name, is_static)
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


@app.post("/api/apps/{name}/redeploy")
def redeploy_app_endpoint(name: str):
    app_model = database.get_app_by_name(name)
    if not app_model:
        raise HTTPException(status_code=404, detail="App not found")

    try:
        logs = system_ops.redeploy_app(app_model)
        return {"message": "Redeployed successfully", "logs": logs}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.post("/api/apps/{name}/start")
def start_app_endpoint(name: str):
    if not database.get_app_by_name(name):
        raise HTTPException(status_code=404, detail="App not found")
    
    try:
        system_ops.start_service(name)
        system_ops.update_caddy_config()
        return {"message": "Service started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/apps/{name}/stop")
def stop_app_endpoint(name: str):
    if not database.get_app_by_name(name):
        raise HTTPException(status_code=404, detail="App not found")
    
    try:
        system_ops.stop_service(name)
        system_ops.update_caddy_config()
        return {"message": "Service stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/hooks/{token}")
def webhook_deploy(token: str):
    app_model = database.get_app_by_token(token)
    if not app_model:
        raise HTTPException(status_code=404, detail="Invalid token")

    try:
        logs = system_ops.redeploy_app(app_model)
        return {"message": "Redeployed successfully", "app": app_model.name, "logs": logs}

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})


# --- Frontend Serving (Must be last) ---
frontend_path = os.path.join(os.path.dirname(__file__), "frontend/dist")

if os.path.exists(frontend_path):
    # Mount assets (JS/CSS)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    # Serve index.html for all other routes (SPA support)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to pass through if they weren't caught above
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        # Check if the requested file exists in the frontend_path
        file_path = os.path.join(frontend_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        return FileResponse(os.path.join(frontend_path, "index.html"))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=1323)
