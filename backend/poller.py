import psycopg2
import time
import os
from celery_tasks import process_endpoint_embedding

DB_HOST = os.getenv("DB_HOST", "localhost")

conn = psycopg2.connect(
    host=DB_HOST,
    database="rag_state",
    user="postgres",
    password="123",
    port=5432
)

cursor = conn.cursor()

print("PostgreSQL Poller Started...")

while True:
    cursor.execute("""
    SELECT id, endpoint_id, action
    FROM user_action_logs
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 1;
    """)

    job = cursor.fetchone()

    if job:
        log_id, endpoint_id, action = job

        print(f"\nFound pending log: {log_id} for endpoint: {endpoint_id} action: {action}")

        # Send task to RabbitMQ through Celery
        result = process_endpoint_embedding.apply_async(
            args=[log_id, endpoint_id, action],
            queue='endpoint_tasks'
        )

        print(f"Task sent to RabbitMQ. Task ID: {result.id}")

        # Mark as queued
        cursor.execute("""
        UPDATE user_action_logs
        SET status = 'QUEUED'
        WHERE id = %s;
        """, (log_id,))

        conn.commit()

    time.sleep(2)
