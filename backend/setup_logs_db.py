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
    conn.commit()
    print("user_action_logs table created successfully!")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    setup_db()
