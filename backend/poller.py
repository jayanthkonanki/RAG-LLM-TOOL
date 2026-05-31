"""
poller.py — Outbox poller.
Picks PENDING rows from user_action_logs.
- resource_type = 'endpoint' → dispatches to Celery for Milvus embedding
- resource_type = 'application' | 'group' → marks DONE (no vector needed)
"""
import time
import psycopg2
from db_config import get_db_connection
from celery_tasks import process_endpoint_embedding


def poll():
    print("[poller] Started — watching outbox...")
    conn = None

    while True:
        try:
            if conn is None or conn.closed:
                conn = get_db_connection()

            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, resource_type, resource_id, action
            FROM user_action_logs
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED;
            """)
            job = cursor.fetchone()

            if job:
                log_id, resource_type, resource_id, action = job
                print(f"[poller] log={log_id} type={resource_type} id={resource_id} action={action}")

                if resource_type == "endpoint":
                    # Mark QUEUED → hand off to Celery
                    cursor.execute(
                        "UPDATE user_action_logs SET status='QUEUED' WHERE id=%s",
                        (log_id,)
                    )
                    conn.commit()
                    result = process_endpoint_embedding.apply_async(
                        args=[log_id, resource_id, action],
                        queue="endpoint_tasks"
                    )
                    print(f"[poller] Celery task sent: {result.id}")
                else:
                    # application / group — no vector work needed
                    cursor.execute(
                        "UPDATE user_action_logs SET status='DONE' WHERE id=%s",
                        (log_id,)
                    )
                    conn.commit()
                    print(f"[poller] {resource_type} action={action} → DONE (no embedding)")
            else:
                conn.commit()  # release locks
                time.sleep(2)

            cursor.close()

        except psycopg2.OperationalError as e:
            print(f"[poller] DB error: {e}. Retry in 5s...")
            if conn and not conn.closed:
                conn.close()
            conn = None
            time.sleep(5)
        except Exception as e:
            print(f"[poller] Error: {e}")
            if conn and not conn.closed:
                conn.rollback()
            time.sleep(5)


if __name__ == "__main__":
    poll()
