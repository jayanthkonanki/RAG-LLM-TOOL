"""
setup_endpoints_db.py — Idempotent schema bootstrap.
Run on every container start; safe to re-run.

Strategy: CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
for every column on every table. This ensures old schemas are always migrated.
"""
import psycopg2
from db_config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def _add_columns(cur, table: str, cols: list[tuple[str, str]]):
    """ADD COLUMN IF NOT EXISTS for each (col_name, col_definition) pair."""
    for col, defn in cols:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {defn};")


def setup_db():
    import time
    # Wait for Postgres to be reachable (handles DNS delay on container start)
    for attempt in range(30):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT,
                database=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            )
            break
        except psycopg2.OperationalError as e:
            print(f"[setup_db] Waiting for postgres ({attempt+1}/30): {e}")
            time.sleep(2)
    else:
        raise RuntimeError("Could not connect to postgres after 60s")
    cur = conn.cursor()

    # ── 1. APPLICATIONS ────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        tags        TEXT[] DEFAULT '{}',
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
    );
    """)
    # Migrate old schemas missing these columns
    _add_columns(cur, "applications", [
        ("description", "TEXT DEFAULT ''"),
        ("tags",        "TEXT[] DEFAULT '{}'"),
        ("updated_at",  "TIMESTAMP DEFAULT NOW()"),
    ])

    # ── 2. GROUPS ──────────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS groups (
        id             TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        name           TEXT NOT NULL,
        description    TEXT DEFAULT '',
        created_at     TIMESTAMP DEFAULT NOW()
    );
    """)
    _add_columns(cur, "groups", [
        ("application_id", "TEXT"),
        ("description",    "TEXT DEFAULT ''"),
    ])
    # FK: add only if applications.id exists and FK not already present
    cur.execute("""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='applications' AND column_name='id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name='groups' AND constraint_name='groups_application_id_fkey'
        ) THEN
            ALTER TABLE groups
                ADD CONSTRAINT groups_application_id_fkey
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
        END IF;
    END $$;
    """)

    # ── 3. ENDPOINTS ───────────────────────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS endpoints (
        id             TEXT PRIMARY KEY,
        name           TEXT,
        path           TEXT,
        method         TEXT,
        description    TEXT,
        base_url       TEXT DEFAULT '',
        auth_type      TEXT DEFAULT 'none',
        auth_value     TEXT DEFAULT '',
        auth_header    TEXT DEFAULT 'X-Api-Key',
        application_id TEXT,
        group_id       TEXT,
        data           JSONB,
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
    );
    """)
    _add_columns(cur, "endpoints", [
        ("name",           "TEXT"),
        ("path",           "TEXT"),
        ("method",         "TEXT"),
        ("description",    "TEXT"),
        ("base_url",       "TEXT DEFAULT ''"),
        ("auth_type",      "TEXT DEFAULT 'none'"),
        ("auth_value",     "TEXT DEFAULT ''"),
        ("auth_header",    "TEXT DEFAULT 'X-Api-Key'"),
        ("application_id", "TEXT"),
        ("group_id",       "TEXT"),
        ("data",           "JSONB"),
        ("updated_at",     "TIMESTAMP DEFAULT NOW()"),
    ])

    # ── 4. OUTBOX (user_action_logs) ───────────────────────────────
    cur.execute("""
    CREATE TABLE IF NOT EXISTS user_action_logs (
        id            SERIAL PRIMARY KEY,
        action        TEXT NOT NULL,
        resource_type TEXT DEFAULT 'endpoint',
        resource_id   TEXT,
        details       JSONB,
        status        VARCHAR(20) DEFAULT 'PENDING',
        created_at    TIMESTAMP DEFAULT NOW()
    );
    """)
    _add_columns(cur, "user_action_logs", [
        ("resource_type", "TEXT DEFAULT 'endpoint'"),
        ("resource_id",   "TEXT"),
        ("details",       "JSONB"),
        ("status",        "VARCHAR(20) DEFAULT 'PENDING'"),
    ])

    # Backfill resource_id from legacy endpoint_id column if it exists
    cur.execute("""
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
    print("OK: DB schema ready: applications, groups, endpoints, user_action_logs")

    # Drop NOT NULL on legacy endpoint_id column (best-effort, column may not exist)
    try:
        cur.execute("ALTER TABLE user_action_logs ALTER COLUMN endpoint_id DROP NOT NULL;")
        conn.commit()
    except Exception:
        conn.rollback()

    cur.close()
    conn.close()


if __name__ == "__main__":
    setup_db()
