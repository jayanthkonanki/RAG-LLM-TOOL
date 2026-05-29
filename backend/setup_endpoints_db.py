import psycopg2
import os

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", "5432"))
DB_NAME     = os.getenv("DB_NAME", "rag_state")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123")

def setup_db():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    cursor = conn.cursor()

    # Create user_action_logs table first (other tables may depend on it)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_action_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        endpoint_id TEXT NOT NULL,
        details JSONB,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    # Create endpoints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS endpoints (
        id TEXT PRIMARY KEY,
        name TEXT,
        path TEXT,
        method TEXT,
        description TEXT,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """)

    # Ensure status column exists (idempotent for existing deployments)
    cursor.execute("""
    ALTER TABLE user_action_logs 
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS APPLICATIONS (
        name TEXT,
        description TEXT,
        tags TEXT           
    );
    """)

    conn.commit()
    print("Database tables created/verified successfully!")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    setup_db()
