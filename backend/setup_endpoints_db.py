"""
setup_endpoints_db.py — Idempotent schema bootstrap.
Run on every container start; safe to re-run.
"""
import psycopg2
import os

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "rag_state")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123")


def setup_db():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        database=DB_NAME, user=DB_USER, password=DB_PASSWORD,
    )
    cursor = conn.cursor()

    # ── 1. APPLICATIONS ────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        tags        TEXT[] DEFAULT '{}',
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
    );
    """)

    # ── 2. GROUPS ──────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS groups (
        id             TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        name           TEXT NOT NULL,
        description    TEXT DEFAULT '',
        created_at     TIMESTAMP DEFAULT NOW()
    );
    """)

    # ── 3. ENDPOINTS ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS endpoints (
        id             TEXT PRIMARY KEY,
        name           TEXT,
        path           TEXT,
        method         TEXT,
        description    TEXT,
        application_id TEXT,
        group_id       TEXT,
        data           JSONB,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
    );
    """)
    # Idempotent: add columns if missing (for existing deployments)
    cursor.execute("ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS application_id TEXT;")
    cursor.execute("ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS group_id TEXT;")

    # ── 4. OUTBOX (user_action_logs) ───────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_action_logs (
        id            SERIAL PRIMARY KEY,
        action        TEXT NOT NULL,
        resource_type TEXT NOT NULL DEFAULT 'endpoint',
        resource_id   TEXT NOT NULL,
        details       JSONB,
        status        VARCHAR(20) DEFAULT 'PENDING',
        created_at    TIMESTAMP DEFAULT NOW()
    );
    """)
    # Idempotent: add new columns to existing table
    cursor.execute("ALTER TABLE user_action_logs ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'endpoint';")
    cursor.execute("ALTER TABLE user_action_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;")
    # Backfill resource_id from old endpoint_id column if it exists
    cursor.execute("""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='user_action_logs' AND column_name='endpoint_id'
        ) THEN
            UPDATE user_action_logs SET resource_id = endpoint_id WHERE resource_id IS NULL;
        END IF;
    END $$;
    """)
    conn.commit()
    print("✓ DB schema ready: applications, groups, endpoints, user_action_logs")
    
    try:
        cursor.execute("ALTER TABLE user_action_logs ALTER COLUMN endpoint_id DROP NOT NULL;")
        conn.commit()
    except Exception as e:
        conn.rollback()
        print("Ignoring drop not null error:", e)
    cursor.close()
    conn.close()


if __name__ == "__main__":
    setup_db()
