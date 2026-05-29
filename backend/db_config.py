"""
db_config.py — Shared PostgreSQL connection config.
All backend services (api, poller, celery worker) import from here
so DB credentials are defined in exactly one place.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "rag_state")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123")


def get_db_connection():
    """Return a new psycopg2 connection using env-var credentials."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def get_dict_connection():
    """Return a connection + RealDictCursor for SELECT queries."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    return conn, cursor
