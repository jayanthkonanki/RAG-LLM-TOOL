"""
api_executor.py — Send real HTTP requests to registered endpoints.

Used by:
  - rag_agent.py (PydanticAI tool: execute_endpoint)
  - Direct import for testing / scripting

Schema expected from DB  (endpoints.data JSONB):
  {
    "id":          str,
    "name":        str,
    "path":        str,          # e.g. "/weather/current" or full URL
    "method":      str,          # GET | POST | PUT | PATCH | DELETE
    "baseUrl":     str | None,   # e.g. "https://api.example.com"
    "authType":    str | None,   # "none" | "bearer" | "api_key"
    "authValue":   str | None,   # token / key value
    "authHeader":  str | None,   # header name for api_key auth (default "X-Api-Key")
    "description": str | None,
  }
"""
import os
import json
import requests
from typing import Any

DEFAULT_TIMEOUT = int(os.getenv("API_EXEC_TIMEOUT", "15"))


# ── core ──────────────────────────────────────────────────────────────────────

def send_request(
    method: str,
    url: str,
    *,
    headers: dict | None = None,
    params: dict | None = None,
    body: Any = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict:
    """
    Generic HTTP sender. Returns a normalised dict:
      { status_code, ok, headers, body }
    """
    headers = headers or {}
    resp = requests.request(
        method.upper(),
        url,
        headers=headers,
        params=params or {},
        json=body if body and method.upper() not in ("GET", "DELETE") else None,
        timeout=timeout,
    )
    try:
        body_out = resp.json()
    except Exception:
        body_out = resp.text

    return {
        "status_code": resp.status_code,
        "ok": resp.ok,
        "headers": dict(resp.headers),
        "body": body_out,
    }


def execute_endpoint(
    endpoint_data: dict,
    *,
    params: dict | None = None,
    body: Any = None,
    path_params: dict | None = None,
) -> dict:
    """
    Execute a registered endpoint using its stored metadata.

    Args:
        endpoint_data: Raw endpoint dict from DB (or manually supplied).
        params:        Query-string parameters.
        body:          JSON body (for POST/PUT/PATCH).
        path_params:   Values to interpolate into path, e.g. {"id": "123"}.

    Returns:
        Normalised response dict from send_request().
    """
    base_url = (endpoint_data.get("baseUrl") or "").rstrip("/")
    path     = (endpoint_data.get("path") or "").lstrip("/")
    method   = endpoint_data.get("method", "GET")

    # Support full URLs in path field
    if path.startswith("http://") or path.startswith("https://"):
        url = path
    else:
        url = f"{base_url}/{path}" if base_url else path

    # Path-param substitution  /users/{id} → /users/123
    if path_params:
        for k, v in path_params.items():
            url = url.replace(f"{{{k}}}", str(v))

    # Auth headers
    headers: dict = {}
    auth_type  = (endpoint_data.get("authType") or "none").lower()
    auth_value = endpoint_data.get("authValue") or ""
    if auth_type == "bearer" and auth_value:
        headers["Authorization"] = f"Bearer {auth_value}"
    elif auth_type == "api_key" and auth_value:
        header_name = endpoint_data.get("authHeader") or "X-Api-Key"
        headers[header_name] = auth_value

    return send_request(method, url, headers=headers, params=params, body=body)


# ── PydanticAI tool helper (called from rag_agent.py) ────────────────────────

def execute_endpoint_by_id(
    endpoint_id: str,
    params: dict | None = None,
    body: Any = None,
    path_params: dict | None = None,
) -> str:
    """
    Fetch endpoint from DB by ID, then execute it.
    Returns a human-readable string (for LLM consumption).
    """
    from db_config import get_db_connection
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT data FROM endpoints WHERE id = %s", (endpoint_id,))
        row = cur.fetchone()
        cur.close()
    finally:
        conn.close()

    if not row:
        return f"No endpoint found with id={endpoint_id}"

    ep_data = row[0]  # psycopg2 returns JSONB as dict
    result  = execute_endpoint(ep_data, params=params, body=body, path_params=path_params)

    status = result["status_code"]
    ok     = result["ok"]
    body_s = json.dumps(result["body"], indent=2) if isinstance(result["body"], (dict, list)) else str(result["body"])

    return (
        f"**HTTP {status}** ({'✓ OK' if ok else '✗ Error'})\n\n"
        f"```json\n{body_s[:3000]}\n```"
    )
