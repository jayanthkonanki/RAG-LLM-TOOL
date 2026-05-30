"""
milvus_setup.py — Milvus collection bootstrap.

Creates the 'endpoints_collection' with:
  - id          : VARCHAR primary key (endpoint UUID)
  - embedding   : FLOAT_VECTOR dim=768 (nomic-embed-text output)
  - metadata    : JSON  (full endpoint data for retrieval)

Uses HNSW index with COSINE similarity — best for semantic search
over short text embeddings.
"""
import os
from pymilvus import MilvusClient, CollectionSchema, FieldSchema, DataType #type: ignore

MILVUS_URI      = os.getenv("MILVUS_URI", "http://localhost:19530")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "endpoints_collection")
EMBED_DIM       = int(os.getenv("EMBED_DIM", "768"))


def get_milvus_client() -> MilvusClient:
    return MilvusClient(uri=MILVUS_URI)


def ensure_collection(client: MilvusClient) -> str:
    """
    Idempotent collection setup. Creates collection + HNSW index
    if it does not already exist. Returns the collection name.
    """
    if client.has_collection(COLLECTION_NAME):
        return COLLECTION_NAME

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
                name="metadata",
                dtype=DataType.JSON,
            ),
        ],
        auto_id=False,
        enable_dynamic_field=True,
        description="API endpoint vectors for RAG similarity search",
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
    print(f"[milvus_setup] Created collection '{COLLECTION_NAME}' with HNSW/COSINE index.")
    return COLLECTION_NAME


def get_collection_stats(client: MilvusClient) -> dict:
    """Return row count and index info for the collection."""
    try:
        stats = client.get_collection_stats(COLLECTION_NAME)
        # The Milvus SDK may return a proto-like response object or a dict
        # with row_count as a string — normalise both cases.
        if isinstance(stats, dict):
            raw_count = stats.get("row_count", 0)
        else:
            # Fallback: try attribute access, then repr to avoid returning a method
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