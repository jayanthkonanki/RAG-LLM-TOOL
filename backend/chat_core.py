"""
chat_core.py — Isolated RAG chat logic.

All I/O (Ollama embed, Milvus search, LLM run) is injected via
callables so this module can be unit-tested without any live services.

Public API
----------
build_context(hits)          → str
extract_answer(agent_result) → str
run_chat(question, embed_fn, search_fn, llm_fn) → str   [async]
"""
import os
from typing import Callable, Awaitable, Any

RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

SYSTEM_PROMPT = (
    "You are an API documentation assistant. "
    "Use the provided context to answer the user's questions about the API endpoints. "
    "The context contains JSON data representing the endpoint definitions. "
    "If you cannot answer the question based on the context, say so clearly. "
    "Format your responses nicely using Markdown."
)

# ── 1. Context builder ────────────────────────────────────────────────────────

def build_context(hits: list) -> str:
    """
    Turn Milvus search hits into a plain-text context block.

    hits: list of dicts with keys 'entity' (dict) and 'distance' (float).
    Returns a non-empty string even when hits is empty.
    """
    header = "Here is the information about the available endpoints:\n\n"
    if not hits:
        return header + "(No matching endpoints found.)\n"

    lines = [header]
    for i, hit in enumerate(hits):
        meta = hit.get("entity", {}).get("metadata", {})
        dist = hit.get("distance", 0.0)
        lines.append(f"--- Match {i + 1} (Score: {dist:.3f}) ---")
        lines.append(f"Name: {meta.get('name', '')}")
        lines.append(f"Method: {meta.get('method', '')}")
        lines.append(f"Path: {meta.get('path', '')}")
        lines.append(f"Description: {meta.get('description', '')}")
        lines.append("")
    return "\n".join(lines)


# ── 2. Answer extractor ───────────────────────────────────────────────────────

def extract_answer(result: Any) -> str:
    """
    Pull the plain-text answer out of a PydanticAI agent result object.

    Handles both the callable and property variants of new_messages()
    across pydantic-ai versions, and falls back to result.data / str(result).
    """
    # Fast path: result.data is already a string
    data = getattr(result, "data", None)
    if isinstance(data, str) and data.strip():
        return data.strip()

    # Slow path: dig through message parts
    try:
        new_msgs_attr = getattr(result, "new_messages", None)
        msgs = new_msgs_attr() if callable(new_msgs_attr) else new_msgs_attr
        if msgs:
            text_parts = [
                part.content
                for msg in msgs
                if hasattr(msg, "parts")
                for part in msg.parts
                if type(part).__name__ == "TextPart" and hasattr(part, "content")
            ]
            if text_parts:
                return "\n".join(text_parts).strip()
    except Exception:
        pass

    # Last resort
    return str(result).strip()


# ── 3. Orchestrator ───────────────────────────────────────────────────────────

async def run_chat(
    question: str,
    embed_fn: Callable[[str], list],
    search_fn: Callable[[list], list],
    llm_fn: Callable[[str], Awaitable[Any]],
) -> str:
    """
    Full RAG pipeline with injected I/O.

    Parameters
    ----------
    question  : user's natural-language question
    embed_fn  : fn(text) -> vector list  (sync)
    search_fn : fn(vector) -> list of hits  (sync)
    llm_fn    : async fn(prompt) -> agent result

    Returns
    -------
    Answer string extracted from the LLM result.
    """
    print(f"[chat_core] embedding: {question[:60]}")
    vector = embed_fn(question)

    print(f"[chat_core] searching top {RAG_TOP_K}")
    hits = search_fn(vector)

    context = build_context(hits)
    prompt = f"{context}\n\nUser Question:\n{question}"

    print("[chat_core] invoking LLM")
    result = await llm_fn(prompt)

    answer = extract_answer(result)
    print(f"[chat_core] answer length: {len(answer)} chars")
    return answer
