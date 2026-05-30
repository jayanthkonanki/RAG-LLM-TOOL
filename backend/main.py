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

app = FastAPI(title="RAG LLM TOOL API")

# Allow CORS so frontend can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from db_config import get_db_connection


class ActionLog(BaseModel):
    action: str
    endpoint_id: str
    details: dict = {}

class EndpointData(BaseModel):
    id: str
    name: str
    path: str
    method: str
    description: Optional[str] = ""
    # other fields are stored in the json blob

class new_application(BaseModel):
    name : str
    description : Optional[str] = ""
    tags : str

@app.get("/api/endpoints")
def get_endpoints():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, data FROM endpoints")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    # parse jsonb data
    return {"endpoints": [row["data"] for row in rows]}

@app.post("/api/application")
def create_new_application(new_app : new_application):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"INSERT INTO APPLICATIONS (name,description,tags) VALUES ({new_app.name},{new_app.description},{new_app.tags})"
        )
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "success"}

@app.post("/api/endpoints")
def create_endpoint(data: dict):
    # expect the full endpoint object
    endpoint_id = data.get("id")
    name = data.get("name", "")
    path = data.get("path", "")
    method = data.get("method", "")
    description = data.get("description", "")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO endpoints (id, name, path, method, description, data) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
        (endpoint_id, name, path, method, description, json.dumps(data))
    )
    # Log action
    cursor.execute(
        "INSERT INTO user_action_logs (action, endpoint_id, details, status) VALUES (%s, %s, %s, 'PENDING')",
        ("create", endpoint_id, json.dumps(data))
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "success"}

@app.put("/api/endpoints/{endpoint_id}")
def update_endpoint(endpoint_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    name = data.get("name", "")
    path = data.get("path", "")
    method = data.get("method", "")
    description = data.get("description", "")
    cursor.execute(
        "UPDATE endpoints SET name=%s, path=%s, method=%s, description=%s, data=%s, updated_at=NOW() WHERE id=%s",
        (name, path, method, description, json.dumps(data), endpoint_id)
    )
    cursor.execute(
        "INSERT INTO user_action_logs (action, endpoint_id, details, status) VALUES (%s, %s, %s, 'PENDING')",
        ("update", endpoint_id, json.dumps(data))
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "success"}

@app.delete("/api/endpoints/{endpoint_id}")
def delete_endpoint(endpoint_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM endpoints WHERE id=%s", (endpoint_id,))
    cursor.execute(
        "INSERT INTO user_action_logs (action, endpoint_id, details, status) VALUES (%s, %s, %s, 'PENDING')",
        ("delete", endpoint_id, "{}")
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "success"}

@app.post("/api/logs/action")
def log_action(log: ActionLog):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO user_action_logs (action, endpoint_id, details, status) VALUES (%s, %s, %s, 'PENDING')",
            (log.action, log.endpoint_id, json.dumps(log.details))
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "message": "Action logged successfully"}
    except Exception as e:
        print(f"Error logging action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class RagQuery(BaseModel):
    question: str

@app.post("/api/rag/query")
async def query_rag(query: RagQuery):
    try:
        from rag_agent import rag_query
        answer = await rag_query(query.question)
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
    import uvicorn #type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)