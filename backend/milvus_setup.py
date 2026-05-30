"""
milvus_setup.py — Milvus collection bootstrap.

Collection schema (v2):
  - id             : VARCHAR primary key (endpoint UUID)
  - embedding      : FLOAT_VECTOR dim=768 (nomic-embed-text)
  - application_id : VARCHAR — enables per-app filtered search
  - metadata       : JSON  (full endpoint data for retrieval)

HNSW + COSINE — best for semantic similarity over short text.
Supports scalar filtering on application_id for RAG scoping.
"""
import os
from pymilvus import MilvusClient, CollectionSchema, FieldSchema, DataType  # type: ignore

MILVUS_URI      = os.getenv("MILVUS_URI", "http://localhost:19530")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "endpoints_collection")
EMBED_DIM       = int(os.getenv("EMBED_DIM", "768"))


def get_milvus_client() -> MilvusClient:
    return MilvusClient(uri=MILVUS_URI)


def ensure_collection(client: MilvusClient) -> str:
    """
    Idempotent. Drops + recreates collection if schema version changed
    (detected by missing application_id field). Safe to re-run.
    """
    if client.has_collection(COLLECTION_NAME):
        # Check if the collection has the application_id field
        try:
            desc = client.describe_collection(COLLECTION_NAME)
            field_names = [f["name"] for f in desc.get("fields", [])]
            if "application_id" in field_names:
                return COLLECTION_NAME  # already up to date
            else:
                # Old schema — drop and recreate
                print(f"[milvus_setup] Dropping old schema for '{COLLECTION_NAME}'...")
                client.drop_collection(COLLECTION_NAME)
        except Exception:
            client.drop_collection(COLLECTION_NAME)

    schema = CollectionSchema(
        fields=[
            FieldSchema(
                name="id",
                dtype=DataType.VARCHAR,
                is_primary=True,
                max_length=100,
            ),
            FieldSchema(
                name="embedding",
                dtype=DataType.FLOAT_VECTOR,
                dim=EMBED_DIM,
            ),
            FieldSchema(
                name="application_id",
                dtype=DataType.VARCHAR,
                max_length=100,
                default_value="",
            ),
            FieldSchema(
                name="metadata",
                dtype=DataType.JSON,
            ),
        ],
        auto_id=False,
        enable_dynamic_field=True,
        description="API endpoint vectors v2 — app-scoped RAG",
    )

    index_params = client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="HNSW",
        metric_type="COSINE",
        params={"M": 16, "efConstruction": 200},
    )

    client.create_collection(
        collection_name=COLLECTION_NAME,
        schema=schema,
        index_params=index_params,
    )
    print(f"[milvus_setup] Created collection '{COLLECTION_NAME}' v2 with application_id field.")
    return COLLECTION_NAME


def get_collection_stats(client: MilvusClient) -> dict:
    try:
        stats = client.get_collection_stats(COLLECTION_NAME)
        if isinstance(stats, dict):
            raw_count = stats.get("row_count", 0)
        else:
            raw_count = getattr(stats, "row_count", 0)
        return {
            "collection": COLLECTION_NAME,
            "row_count": int(raw_count) if raw_count is not None else 0,
            "embed_dim": EMBED_DIM,
            "index_type": "HNSW",
            "metric": "COSINE",
        }
    except Exception as e:
        return {"collection": COLLECTION_NAME, "error": str(e)}