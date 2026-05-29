"""
poller.py — PostgreSQL Poller.
Continuously checks the 'user_action_logs' table for PENDING tasks
and dispatches them to RabbitMQ via Celery.
"""
import time
import psycopg2
from db_config import get_db_connection
from celery_tasks import process_endpoint_embedding

def poll():
    print("PostgreSQL Poller Started...")
    conn = None
    
    while True:
        try:
            if conn is None or conn.closed:
                conn = get_db_connection()
            
            cursor = conn.cursor()
            
            cursor.execute("""
            SELECT id, endpoint_id, action
            FROM user_action_logs
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED;
            """)
            
            job = cursor.fetchone()
            
            if job:
                log_id, endpoint_id, action = job
                print(f"\n[poller] Found pending log: {log_id} | endpoint: {endpoint_id} | action: {action}")
                
                # Mark as QUEUED immediately before committing
                cursor.execute("""
                UPDATE user_action_logs
                SET status = 'QUEUED'
                WHERE id = %s;
                """, (log_id,))
                conn.commit()
                
                # Send task to RabbitMQ via Celery
                result = process_endpoint_embedding.apply_async(
                    args=[log_id, endpoint_id, action],
                    queue='endpoint_tasks'
                )
                print(f"[poller] Task sent to RabbitMQ. Task ID: {result.id}")
                
            else:
                conn.commit()  # release any locks if needed
                time.sleep(2)
                
            cursor.close()
            
        except psycopg2.OperationalError as e:
            print(f"[poller] Database connection error: {e}. Retrying in 5s...")
            if conn and not conn.closed:
                conn.close()
            conn = None
            time.sleep(5)
        except Exception as e:
            print(f"[poller] Unexpected error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    poll()
