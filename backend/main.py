# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional
# pyrefly: ignore [missing-import]
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import uuid

app = FastAPI(title="RAG LLM TOOL API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from db_config import get_db_connection


# ── Models ─────────────────────────────────────────────────────────────────────

class NewApplication(BaseModel):
    name: str
    description: Optional[str] = ""
    tags: list[str] = []

class NewGroup(BaseModel):
    application_id: str
    name: str
    description: Optional[str] = ""

class RagQuery(BaseModel):
    question: str
    app_ids: list[str] = []   # optional — defaults to empty list


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Applications ───────────────────────────────────────────────────────────────

@app.get("/api/applications")
def list_applications():
    conn, cursor = get_db_connection(), None
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM applications ORDER BY created_at ASC")
        rows = cursor.fetchall()
        # tags stored as TEXT[] — psycopg2 returns it as list already
        return {"applications": [dict(r) for r in rows]}
    finally:
        if cursor: cursor.close()
        conn.close()


@app.post("/api/applications", status_code=201)
def create_application(body: NewApplication):
    app_id = f"app-{uuid.uuid4().hex[:12]}"
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO applications (id, name, description, tags) VALUES (%s, %s, %s, %s)",
            (app_id, body.name, body.description, body.tags)
        )
        # Outbox entry
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("create", "application", app_id, json.dumps({"name": body.name}))
        )
        conn.commit()
        return {"id": app_id, "name": body.name}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/applications/{app_id}")
def delete_application(app_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM applications WHERE id=%s", (app_id,))
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("delete", "application", app_id, json.dumps({}))
        )
        conn.commit()
        return {"status": "deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ── Groups ─────────────────────────────────────────────────────────────────────

@app.get("/api/groups")
def list_groups(application_id: Optional[str] = None):
    conn, cursor = get_db_connection(), None
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        if application_id:
            cursor.execute("SELECT * FROM groups WHERE application_id=%s ORDER BY created_at ASC", (application_id,))
        else:
            cursor.execute("SELECT * FROM groups ORDER BY created_at ASC")
        rows = cursor.fetchall()
        return {"groups": [dict(r) for r in rows]}
    finally:
        if cursor: cursor.close()
        conn.close()


@app.post("/api/groups", status_code=201)
def create_group(body: NewGroup):
    group_id = f"grp-{uuid.uuid4().hex[:12]}"
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Verify app exists
        cursor.execute("SELECT id FROM applications WHERE id=%s", (body.application_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Application not found")
        cursor.execute(
            "INSERT INTO groups (id, application_id, name, description) VALUES (%s, %s, %s, %s)",
            (group_id, body.application_id, body.name, body.description)
        )
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("create", "group", group_id, json.dumps({"name": body.name, "application_id": body.application_id}))
        )
        conn.commit()
        return {"id": group_id, "name": body.name, "application_id": body.application_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/groups/{group_id}")
def delete_group(group_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM groups WHERE id=%s", (group_id,))
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("delete", "group", group_id, json.dumps({}))
        )
        conn.commit()
        return {"status": "deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/api/endpoints")
def get_endpoints(application_id: Optional[str] = None, group_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        if group_id:
            cursor.execute("SELECT data FROM endpoints WHERE group_id=%s", (group_id,))
        elif application_id:
            cursor.execute("SELECT data FROM endpoints WHERE application_id=%s", (application_id,))
        else:
            cursor.execute("SELECT data FROM endpoints")
        rows = cursor.fetchall()
        return {"endpoints": [row["data"] for row in rows]}
    finally:
        cursor.close()
        conn.close()


@app.post("/api/endpoints")
def create_endpoint(data: dict):
    endpoint_id = data.get("id")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO endpoints (id, name, path, method, description, application_id, group_id, data)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (id) DO NOTHING""",
            (
                endpoint_id,
                data.get("name", ""),
                data.get("path", ""),
                data.get("method", ""),
                data.get("shortDescription", data.get("description", "")),
                data.get("applicationId"),
                data.get("groupId"),
                json.dumps(data),
            )
        )
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("create", "endpoint", endpoint_id, json.dumps(data))
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.put("/api/endpoints/{endpoint_id}")
def update_endpoint(endpoint_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """UPDATE endpoints
               SET name=%s, path=%s, method=%s, description=%s,
                   application_id=%s, group_id=%s, data=%s, updated_at=NOW()
               WHERE id=%s""",
            (
                data.get("name", ""),
                data.get("path", ""),
                data.get("method", ""),
                data.get("shortDescription", data.get("description", "")),
                data.get("applicationId"),
                data.get("groupId"),
                json.dumps(data),
                endpoint_id,
            )
        )
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("update", "endpoint", endpoint_id, json.dumps(data))
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/endpoints/{endpoint_id}")
def delete_endpoint(endpoint_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM endpoints WHERE id=%s", (endpoint_id,))
        cursor.execute(
            "INSERT INTO user_action_logs (action, resource_type, resource_id, details, status) VALUES (%s, %s, %s, %s, 'PENDING')",
            ("delete", "endpoint", endpoint_id, json.dumps({}))
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ── RAG ────────────────────────────────────────────────────────────────────────

@app.post("/api/rag/query")
async def query_rag(query: RagQuery):
    try:
        from rag_agent import rag_query
        answer = await rag_query(query.question, query.app_ids)
        return {"answer": answer}
    except Exception as e:
        print(f"Error querying RAG: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rag/status")
def get_rag_status():
    try:
        from milvus_setup import get_milvus_client, get_collection_stats, ensure_collection
        milvus = get_milvus_client()
        ensure_collection(milvus)
        return get_collection_stats(milvus)
    except Exception as e:
        print(f"Error getting RAG status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)