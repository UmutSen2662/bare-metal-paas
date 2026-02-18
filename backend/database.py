import sqlite3
from pydantic import BaseModel
from typing import Optional, List
import uuid

import os
DB_PATH = os.path.join(os.path.dirname(__file__), "paas.db")


class AppModel(BaseModel):
    id: Optional[int] = None
    name: str
    repo_url: str
    domain: str
    port: Optional[int] = None
    build_command: str
    start_command: str
    language_version: str
    deploy_token: Optional[str] = None
    status: str = "stopped"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create table if not exists
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            repo_url TEXT,
            domain TEXT,
            port INTEGER,
            build_command TEXT,
            start_command TEXT,
            language_version TEXT,
            deploy_token TEXT UNIQUE
        );
    """
    )
    
    # Simple migration: check if deploy_token exists
    cursor.execute("PRAGMA table_info(apps)")
    columns = [info[1] for info in cursor.fetchall()]
    if "deploy_token" not in columns:
        print("Migrating DB: Adding deploy_token column...")
        cursor.execute("ALTER TABLE apps ADD COLUMN deploy_token TEXT UNIQUE")
        
        # Generate tokens for existing apps
        cursor.execute("SELECT id FROM apps")
        rows = cursor.fetchall()
        for row in rows:
            token = uuid.uuid4().hex
            cursor.execute("UPDATE apps SET deploy_token = ? WHERE id = ?", (token, row["id"]))

    # Create settings table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    """
    )

    conn.commit()
    conn.close()


def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )
    conn.commit()
    conn.close()


def get_apps() -> List[AppModel]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM apps")
    rows = cursor.fetchall()
    conn.close()

    apps = []
    for row in rows:
        apps.append(
            AppModel(
                id=row["id"],
                name=row["name"],
                repo_url=row["repo_url"],
                domain=row["domain"],
                port=row["port"],
                build_command=row["build_command"],
                start_command=row["start_command"],
                language_version=row["language_version"],
                deploy_token=row["deploy_token"]
            )
        )
    return apps


def get_app_by_name(name: str) -> Optional[AppModel]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM apps WHERE name = ?", (name,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return AppModel(
            id=row["id"],
            name=row["name"],
            repo_url=row["repo_url"],
            domain=row["domain"],
            port=row["port"],
            build_command=row["build_command"],
            start_command=row["start_command"],
            language_version=row["language_version"],
            deploy_token=row["deploy_token"]
        )
    return None


def get_app_by_domain(domain: str) -> Optional[AppModel]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM apps WHERE domain = ?", (domain,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return AppModel(
            id=row["id"],
            name=row["name"],
            repo_url=row["repo_url"],
            domain=row["domain"],
            port=row["port"],
            build_command=row["build_command"],
            start_command=row["start_command"],
            language_version=row["language_version"],
            deploy_token=row["deploy_token"]
        )
    return None


def get_app_by_token(token: str) -> Optional[AppModel]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM apps WHERE deploy_token = ?", (token,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return AppModel(
            id=row["id"],
            name=row["name"],
            repo_url=row["repo_url"],
            domain=row["domain"],
            port=row["port"],
            build_command=row["build_command"],
            start_command=row["start_command"],
            language_version=row["language_version"],
            deploy_token=row["deploy_token"]
        )
    return None


def upsert_app(app: AppModel):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if app exists
    cursor.execute("SELECT port, deploy_token FROM apps WHERE name = ?", (app.name,))
    row = cursor.fetchone()

    if row:
        # Update
        # Keep existing port if not provided
        current_port = row["port"]
        if app.port is None:
            app.port = current_port
        
        # Keep existing token if not provided
        current_token = row["deploy_token"]
        if app.deploy_token is None:
            app.deploy_token = current_token

        cursor.execute(
            """
            UPDATE apps SET repo_url=?, domain=?, build_command=?, start_command=?, language_version=?, deploy_token=? WHERE name=?
        """,
            (app.repo_url, app.domain, app.build_command, app.start_command, app.language_version, app.deploy_token, app.name),
        )
    else:
        # Insert
        if not app.deploy_token:
            app.deploy_token = uuid.uuid4().hex

        cursor.execute(
            """
            INSERT INTO apps (name, repo_url, domain, port, build_command, start_command, language_version, deploy_token) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (app.name, app.repo_url, app.domain, app.port, app.build_command, app.start_command, app.language_version, app.deploy_token),
        )

    conn.commit()
    conn.close()


def delete_app(name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM apps WHERE name = ?", (name,))
    conn.commit()
    conn.close()
