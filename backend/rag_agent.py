"""
rag_agent.py — PydanticAI agent with tool-call RAG pattern.

Flow:
  1. LLM receives user question + system prompt
  2. LLM decides IF it needs endpoint data
  3. If yes → calls search_endpoints tool → Milvus filtered by app_ids
  4. LLM composes final answer using retrieved context

Embedding model + Milvus are NOT called on every message.
Only called when the LLM determines endpoint lookup is needed.
"""
import os
from typing import Any
from pydantic_ai import Agent, RunContext                        # type: ignore
from pydantic_ai.models.openai import OpenAIModel               # type: ignore
from pydantic_ai.providers.openai import OpenAIProvider         # type: ignore
from dataclasses import dataclass

from milvus_setup import get_milvus_client, ensure_collection, COLLECTION_NAME
from celery_tasks import generate_embedding

OLLAMA_URI  = os.getenv("OLLAMA_URI", "http://localhost:11434")
LLM_MODEL   = os.getenv("LLM_MODEL",  "llama3.2")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
RAG_TOP_K   = int(os.getenv("RAG_TOP_K", "5"))

SYSTEM_PROMPT = """You are an API documentation assistant with access to a search tool.

When the user asks about specific endpoints, API capabilities, how to use an endpoint,
or anything that requires knowledge of the registered endpoints — call the search_endpoints tool.

When the user asks general questions, greetings, or clarifications that don't require
endpoint data — answer directly without calling the tool.

Always format responses clearly using Markdown. Be concise and precise."""


@dataclass
class AgentDeps:
    app_ids: list[str]


_provider = OpenAIProvider(base_url=f"{OLLAMA_URI}/v1", api_key="ollama")
_model    = OpenAIModel(model_name=LLM_MODEL, provider=_provider)
_agent    = Agent(model=_model, system_prompt=SYSTEM_PROMPT, deps_type=AgentDeps)


@_agent.tool
def search_endpoints(ctx: RunContext[AgentDeps], query: str) -> str:
    """
    Search the API endpoint registry for endpoints relevant to the query.
    Only searches within the applications selected by the user.
    Returns a formatted list of matching endpoints with their details.
    
    Args:
        query: Natural language description of what you are looking for
    """
    app_ids = ctx.deps.app_ids
    print(f"[rag_agent] Tool called: search_endpoints(query='{query[:60]}', app_ids={app_ids})")

    # Embed the query
    vector = generate_embedding(query)

    # Build Milvus filter for selected apps
    if app_ids:
        escaped = [aid.replace("'", "\\'") for aid in app_ids]
        id_list = "', '".join(escaped)
        filter_expr = f"application_id in ['{id_list}']"
    else:
        filter_expr = None

    milvus = get_milvus_client()
    ensure_collection(milvus)

    search_kwargs: dict[str, Any] = {
        "collection_name": COLLECTION_NAME,
        "data": [vector],
        "limit": RAG_TOP_K,
        "output_fields": ["metadata", "application_id"],
    }
    if filter_expr:
        search_kwargs["filter"] = filter_expr

    results = milvus.search(**search_kwargs)
    try:
        hits = results[0]
    except (IndexError, TypeError):
        hits = []

    if not hits:
        return "No matching endpoints found for the selected applications."

    lines = [f"Found {len(hits)} matching endpoint(s):\n"]
    for i, hit in enumerate(hits):
        meta = hit.get("entity", {}).get("metadata", {})
        score = hit.get("distance", 0.0)
        lines.append(f"### {i+1}. {meta.get('name', 'Unknown')} (score: {score:.3f})")
        lines.append(f"- **Method**: `{meta.get('method', '')}`")
        lines.append(f"- **Path**: `{meta.get('path', '')}`")
        lines.append(f"- **Description**: {meta.get('shortDescription', meta.get('description', ''))}")
        bp = meta.get("agentContextLabels", {}).get("businessPurpose", "")
        if bp:
            lines.append(f"- **Purpose**: {bp}")
        wtu = meta.get("agentContext", {}).get("whenToUse", "")
        if wtu:
            lines.append(f"- **When to use**: {wtu}")
        lines.append("")

    return "\n".join(lines)


async def rag_query(user_question: str, app_ids: list[str]) -> str:
    """Entry point called by main.py /api/rag/query."""
    deps = AgentDeps(app_ids=app_ids)
    result = await _agent.run(user_question, deps=deps)
    # Extract text from result
    data = getattr(result, "data", getattr(result, "output", None))
    if isinstance(data, str) and data.strip():
        return data.strip()
    return str(data or result).strip()
