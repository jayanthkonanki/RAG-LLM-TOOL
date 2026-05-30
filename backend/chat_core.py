"""
chat_core.py — Kept for test compatibility and system prompt constants.

The RAG pipeline is now handled directly by rag_agent.py using PydanticAI
tool-call pattern. This file retains the answer extractor utility used in tests.
"""
import os
from typing import Any

RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

SYSTEM_PROMPT = (
    "You are an API documentation assistant with access to a search tool. "
    "When the user asks about specific endpoints, API capabilities, how to use an endpoint, "
    "or anything that requires knowledge of registered endpoints — call the search_endpoints tool. "
    "When the user asks general questions or greetings — answer directly without calling the tool. "
    "Format responses clearly using Markdown. Be concise and precise."
)


def extract_answer(result: Any) -> str:
    """
    Pull the plain-text answer out of a PydanticAI agent result object.
    Handles both callable and property variants of new_messages().
    """
    data = getattr(result, "data", None)
    if isinstance(data, str) and data.strip():
        return data.strip()

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

    return str(result).strip()
