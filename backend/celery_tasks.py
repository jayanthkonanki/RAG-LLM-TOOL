"""
celery_tasks.py — Async task: embed endpoint text → store/delete in Milvus.

Flow triggered by the poller:
  1. Poller picks PENDING log from PostgreSQL
  2. Poller dispatches process_endpoint_embedding to RabbitMQ
  3. This worker fetches endpoint data, calls Ollama for embedding
  4. Upserts (or deletes) the vector in Milvus
  5. Marks the log as DONE (or FAILED)
"""
import os
import json
import requests

from celery_app import celery_app
from db_config import get_db_connection
from milvus_setup import get_milvus_client, ensure_collection, COLLECTION_NAME

OLLAMA_URI  = os.getenv("OLLAMA_URI", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "rag_state")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123")


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def generate_embedding(text: str) -> list:
    """
    Call Ollama /api/embed and return the embedding vector.
    Uses the newer 'input' field format (Ollama ≥ 0.1.26).
    """
    response = requests.post(
        f"{OLLAMA_URI}/api/embed",
        json={"model": EMBED_MODEL, "input": text},
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    # Ollama returns {"embeddings": [[...]]}
    return data["embeddings"][0]


def build_embed_text(data: dict) -> str:
    """Build a rich text representation of an endpoint for embedding."""
    return (
        f"Name: {data.get('name', '')}\n"
        f"Path: {data.get('path', '')}\n"
        f"Method: {data.get('method', '')}\n"
        f"Description: {data.get('description', '')}"
    )


# ──────────────────────────────────────────────────────────────
# Celery Task
# ──────────────────────────────────────────────────────────────

@celery_app.task(
    name="process_endpoint_embedding",
    queue="endpoint_tasks",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def process_endpoint_embedding(self, log_id: int, endpoint_id: str, action: str):
    """
    Main Celery task.

    Args:
        log_id      : ID in user_action_logs (used to mark DONE/FAILED)
        endpoint_id : UUID of the endpoint in the endpoints table
        action      : 'create' | 'update' | 'delete'
    """
    conn = None
    try:
        # ── 1. Get Milvus client + ensure collection exists ──────────
        milvus = get_milvus_client()
        ensure_collection(milvus)

        # ── 2. Open DB connection ─────────────────────────────────────
        conn = get_db_connection()
        cursor = conn.cursor()

        # ── 3. Process based on action ───────────────────────────────
        if action == "delete":
            milvus.delete(
                collection_name=COLLECTION_NAME,
                filter=f"id == '{endpoint_id}'",
            )
            print(f"[celery] Deleted vector for endpoint {endpoint_id}")

        else:
            # create or update: fetch current endpoint data
            cursor.execute("SELECT data FROM endpoints WHERE id = %s", (endpoint_id,))
            row = cursor.fetchone()

            if row is None:
                print(f"[celery] Endpoint {endpoint_id} not found in DB — skipping.")
            else:
                endpoint_data = row[0]  # psycopg2 returns JSONB as dict
                embed_text = build_embed_text(endpoint_data)

                print(f"[celery] Generating embedding for {endpoint_id}...")
                embedding = generate_embedding(embed_text)

                milvus.upsert(
                    collection_name=COLLECTION_NAME,
                    data=[
                        {
                            "id": endpoint_id,
                            "embedding": embedding,
                            "metadata": endpoint_data,
                        }
                    ],
                )
                print(f"[celery] Upserted vector for {endpoint_id} in Milvus ✓")

        # ── 4. Mark log as DONE ──────────────────────────────────────
        cursor.execute(
            "UPDATE user_action_logs SET status = 'DONE' WHERE id = %s",
            (log_id,),
        )
        conn.commit()
        cursor.close()
        return f"log_id={log_id} endpoint={endpoint_id} action={action} → DONE"

    except Exception as exc:
        print(f"[celery] ERROR processing log {log_id}: {exc}")

        # Mark log as FAILED in Postgres (best-effort)
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE user_action_logs SET status = 'FAILED' WHERE id = %s",
                    (log_id,),
                )
                conn.commit()
            except Exception:
                pass

        # Celery retry with exponential back-off
        raise self.retry(exc=exc)

    finally:
        if conn:
            conn.close()
