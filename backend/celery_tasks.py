import psycopg2
import json
import requests
import os
from celery_app import celery_app
from pymilvus import MilvusClient, CollectionSchema, FieldSchema, DataType

MILVUS_URI = os.getenv("MILVUS_URI", "http://localhost:19530")
DB_HOST = os.getenv("DB_HOST", "localhost")
OLLAMA_URI = os.getenv("OLLAMA_URI", "http://localhost:11434")

# Initialize Milvus Client
milvus_client = MilvusClient(uri=MILVUS_URI)
COLLECTION_NAME = "endpoints_collection"

# Create collection if not exists
if not milvus_client.has_collection(COLLECTION_NAME):
    schema = CollectionSchema(
        fields=[
            FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, max_length=100),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768),
            FieldSchema(name="metadata", dtype=DataType.JSON)
        ],
        auto_id=False,
        enable_dynamic_field=True
    )
    # Define index params
    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="embedding", 
        index_type="FLAT", 
        metric_type="L2"
    )
    
    milvus_client.create_collection(
        collection_name=COLLECTION_NAME,
        schema=schema,
        index_params=index_params
    )

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database="rag_state",
        user="postgres",
        password="123",
        port=5432
    )

def generate_embedding(text: str):
    response = requests.post(
        f"{OLLAMA_URI}/api/embeddings",
        json={
            "model": "nomic-embed-text:latest",
            "prompt": text
        }
    )
    if response.status_code == 200:
        return response.json().get("embedding")
    else:
        raise Exception(f"Failed to generate embedding: {response.text}")

@celery_app.task(name="process_endpoint_embedding", queue="endpoint_tasks")
def process_endpoint_embedding(log_id: int, endpoint_id: str, action: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if action == "delete":
            milvus_client.delete(
                collection_name=COLLECTION_NAME,
                filter=f"id == '{endpoint_id}'"
            )
            print(f"Deleted {endpoint_id} from Milvus")
        else:
            # Get endpoint data for create/update
            cursor.execute("SELECT data FROM endpoints WHERE id=%s", (endpoint_id,))
            row = cursor.fetchone()
            
            if row:
                data = row[0]
                text_to_embed = f"Name: {data.get('name')}\nPath: {data.get('path')}\nMethod: {data.get('method')}\nDescription: {data.get('description')}"
                
                embedding = generate_embedding(text_to_embed)
                
                milvus_client.upsert(
                    collection_name=COLLECTION_NAME,
                    data=[
                        {
                            "id": endpoint_id,
                            "embedding": embedding,
                            "metadata": data
                        }
                    ]
                )
                print(f"Upserted {endpoint_id} to Milvus with embeddings")
        
        # Mark log as done
        cursor.execute("UPDATE user_action_logs SET status='DONE' WHERE id=%s", (log_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return f"Successfully processed log {log_id}"
    except Exception as e:
        print(f"Error processing task: {e}")
        # Optional: mark as FAILED
        raise
