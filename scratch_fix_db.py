import psycopg2

conn = psycopg2.connect(
    host="localhost", port=5432,
    database="rag_state", user="postgres", password="123"
)
conn.autocommit = True
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE user_action_logs ALTER COLUMN endpoint_id DROP NOT NULL;")
    print("Dropped NOT NULL constraint on endpoint_id")
except Exception as e:
    print(f"Error dropping constraint: {e}")

try:
    cursor.execute("ALTER TABLE user_action_logs DROP COLUMN IF EXISTS endpoint_id;")
    print("Dropped endpoint_id column entirely")
except Exception as e:
    print(f"Error dropping column: {e}")

cursor.close()
conn.close()
