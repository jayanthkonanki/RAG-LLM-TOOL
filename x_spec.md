# Spec: RAG LLM Tool v2

## 1. Domain
A multi-app API documentation search tool using RAG. 
User creates Apps -> Groups -> Endpoints. 
Endpoints sync to Milvus via Outbox + Celery. 
User chats with LLM, filtering by App.

## 2. Architecture
- **Frontend**: Next.js (React), Zustand stores, TailwindCSS.
- **Backend**: FastAPI (Python), PostgreSQL, RabbitMQ, Celery, Milvus.
- **Agent**: PydanticAI (Ollama/llama3.2). 

## 3. Data Flow
- **CRUD**: React UI -> FastAPI -> PostgreSQL (`applications`, `groups`, `endpoints`, `user_action_logs`).
- **Outbox**: `poller.py` reads `user_action_logs` -> pushes to `celery_tasks.py` (via RabbitMQ) -> embeddings to Milvus.
- **Chat**: React UI -> FastAPI `/api/rag/query` (with `app_ids`) -> `rag_agent.py` -> Milvus (filter by `application_id`) -> LLM Response.
