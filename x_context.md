# Context: Code Map

## Frontend (`api-context-manager/src/`)
- `store/applicationsStore.ts`: Fetches `/api/applications` & `/api/groups`.
- `store/endpointsStore.ts`: Fetches `/api/endpoints`.
- `store/uiStore.ts`: UI state (selected app/group/endpoint, chat app_ids).
- `components/Modals.tsx`: Creates Apps, Groups, Endpoints.
- `components/RightPanel.tsx`: Displays endpoint metadata.
- `app/chat/page.tsx`, `components/BottomPanel.tsx`: Chat UI, posts to `/api/rag/query`.

## Backend (`backend/`)
- `main.py`: FastAPI routes (CRUD for apps/groups/endpoints, RAG query).
- `setup_endpoints_db.py`: Postgres schema setup.
- `poller.py`: Outbox watcher.
- `celery_tasks.py`: Milvus embedding logic.
- `rag_agent.py`: PydanticAI logic (`search_endpoints` tool).
- `milvus_setup.py`: Milvus connection.
