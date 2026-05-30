"""
rag_agent.py — Wires live Ollama + Milvus I/O into chat_core.run_chat.
"""
import os
from pydantic_ai import Agent                       # type: ignore
from pydantic_ai.models.openai import OpenAIModel   # type: ignore
from pydantic_ai.providers.openai import OpenAIProvider  # type: ignore

from milvus_setup import get_milvus_client, ensure_collection, COLLECTION_NAME
from celery_tasks import generate_embedding
from chat_core import run_chat, RAG_TOP_K, SYSTEM_PROMPT

OLLAMA_URI = os.getenv("OLLAMA_URI", "http://localhost:11434")
LLM_MODEL  = os.getenv("LLM_MODEL",  "llama3.2")

_provider = OpenAIProvider(base_url=f"{OLLAMA_URI}/v1", api_key="ollama")
_model    = OpenAIModel(model_name=LLM_MODEL, provider=_provider)
_agent    = Agent(model=_model, system_prompt=SYSTEM_PROMPT)


def _embed(text: str) -> list:
    return generate_embedding(text)


def _search(vector: list) -> list:
    milvus = get_milvus_client()
    ensure_collection(milvus)
    results = milvus.search(
        collection_name=COLLECTION_NAME,
        data=[vector],
        limit=RAG_TOP_K,
        output_fields=["metadata"],
    )
    return results[0] if results else []


async def _llm(prompt: str):
    return await _agent.run(prompt)


async def rag_query(user_question: str) -> str:
    """Entry point called by main.py /api/rag/query."""
    return await run_chat(user_question, _embed, _search, _llm)
