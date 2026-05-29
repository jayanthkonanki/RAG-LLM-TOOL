"""
rag_agent.py — PydanticAI RAG Agent for querying API documentation.
Uses Ollama (LLM) and Milvus (Vector Search).
"""
import os
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIModel
from milvus_setup import get_milvus_client, ensure_collection, COLLECTION_NAME
from celery_tasks import generate_embedding

from pydantic_ai.providers.openai import OpenAIProvider

# We use the pydantic-ai openai provider, but point it to Ollama's local URL
# Ollama provides an OpenAI-compatible API on /v1
OLLAMA_URI = os.getenv("OLLAMA_URI", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))

# The model instance configured for local Ollama
ollama_provider = OpenAIProvider(
    base_url=f"{OLLAMA_URI}/v1", 
    api_key="ollama"
)

ollama_model = OpenAIModel(
    model_name=LLM_MODEL,
    provider=ollama_provider
)

# Initialize the PydanticAI Agent
agent = Agent(
    model=ollama_model,
    system_prompt=(
        "You are an API documentation assistant. "
        "Use the provided context to answer the user's questions about the API endpoints. "
        "The context contains JSON data representing the endpoint definitions. "
        "If you cannot answer the question based on the context, say so clearly. "
        "Format your responses nicely using Markdown."
    ),
)

class RagDependencies:
    def __init__(self):
        self.milvus = get_milvus_client()
        ensure_collection(self.milvus)

# Register a dynamic system prompt to fetch and inject context
@agent.system_prompt
def add_context_from_milvus(ctx: RunContext[RagDependencies]) -> str:
    """
    Dynamically injects context into the system prompt by performing a 
    vector search in Milvus using the user's query.
    Note: PydanticAI's system prompt functions don't receive the user prompt directly
    if we just use it plainly, but we can pass the context directly in the run call,
    so we will handle the search manually in the `rag_query` wrapper.
    """
    pass # we'll pass context explicitly in the run call instead for better control.


async def rag_query(user_question: str) -> str:
    """
    End-to-end RAG query:
    1. Embed user question
    2. Search Milvus for top-k similar endpoints
    3. Build context string
    4. Run PydanticAI agent
    """
    print(f"[rag_agent] Embedding query: {user_question}")
    # 1. Embed question (sync call to ollama embed)
    query_vector = generate_embedding(user_question)

    # 2. Search Milvus
    milvus = get_milvus_client()
    ensure_collection(milvus)
    
    print(f"[rag_agent] Searching Milvus for top {RAG_TOP_K} matches...")
    search_results = milvus.search(
        collection_name=COLLECTION_NAME,
        data=[query_vector],
        limit=RAG_TOP_K,
        output_fields=["metadata"]
    )

    # 3. Build Context
    context_str = "Here is the information about the available endpoints retrieved from the database:\n\n"
    
    if not search_results or not search_results[0]:
        context_str += "(No matching endpoints found.)\n"
    else:
        for i, hit in enumerate(search_results[0]):
            endpoint_data = hit.get("entity", {}).get("metadata", {})
            distance = hit.get("distance", 0)
            context_str += f"--- Match {i+1} (Score: {distance:.3f}) ---\n"
            context_str += f"Name: {endpoint_data.get('name')}\n"
            context_str += f"Method: {endpoint_data.get('method')}\n"
            context_str += f"Path: {endpoint_data.get('path')}\n"
            context_str += f"Description: {endpoint_data.get('description')}\n"
            context_str += "\n"

    # 4. Run Agent
    prompt_with_context = f"{context_str}\n\nUser Question:\n{user_question}"
    
    print("[rag_agent] Invoking LLM...")
    result = await agent.run(prompt_with_context)
    
    # Extract plain text from model response (skip ThinkingPart, grab TextPart only)
    text_parts = []
    if hasattr(result, "new_messages"):
        for msg in result.new_messages:
            if hasattr(msg, "parts"):
                for part in msg.parts:
                    part_type = type(part).__name__
                    if part_type == "TextPart" and hasattr(part, "content"):
                        text_parts.append(part.content)
    
    if text_parts:
        return "\n".join(text_parts)
    
    # Fallback for older versions
    return str(getattr(result, "data", getattr(result, "response", result)))

