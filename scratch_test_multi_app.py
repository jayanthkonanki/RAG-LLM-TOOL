import requests
import time

API_URL = "http://localhost:8000/api"

print("=== 1. Testing Persistence ===")
# Fetch applications
res = requests.get(f"{API_URL}/applications")
apps = res.json().get("applications", [])
print(f"Total apps found: {len(apps)}")
for app in apps:
    print(f" - {app['id']}: {app['name']}")

if len(apps) > 0:
    print("Persistence verified: Apps created earlier still exist!\n")
else:
    print("Persistence Failed: No apps found.\n")

print("=== 2. Setting up Multi-App Test ===")
# Create App 2
res = requests.post(f"{API_URL}/applications", json={
    "name": "App 2 - Analytics",
    "description": "Analytics application",
})
app2_id = res.json()["id"]
print(f"Created App 2: {app2_id}")

# Create Group for App 2
res = requests.post(f"{API_URL}/groups", json={
    "application_id": app2_id,
    "name": "Analytics Group",
})
group2_id = res.json()["id"]

# Create Endpoint for App 2
requests.post(f"{API_URL}/endpoints", json={
    "id": "ep-analytics-1",
    "name": "Get User Stats",
    "path": "/stats/users",
    "method": "GET",
    "description": "Retrieves analytical stats about users",
    "applicationId": app2_id,
    "groupId": group2_id,
})
print("Created Endpoint for App 2: /stats/users")

print("Waiting 10s for Outbox -> Celery -> Milvus embedding to complete...")
time.sleep(10)

app1_id = apps[0]['id'] if apps else None

if app1_id:
    print("\n=== 3. Testing LLM Multi-App RAG ===")
    
    print("\n--- Querying App 1 ONLY (Test Data App) ---")
    res = requests.post(f"{API_URL}/rag/query", json={
        "question": "What endpoints are available?",
        "app_ids": [app1_id]
    })
    print("Agent Response:\n", res.json().get("answer"))
    
    print("\n--- Querying App 2 ONLY (Analytics App) ---")
    res = requests.post(f"{API_URL}/rag/query", json={
        "question": "What endpoints are available?",
        "app_ids": [app2_id]
    })
    print("Agent Response:\n", res.json().get("answer"))
    
    print("\n--- Querying BOTH Apps ---")
    res = requests.post(f"{API_URL}/rag/query", json={
        "question": "What endpoints are available?",
        "app_ids": [app1_id, app2_id]
    })
    print("Agent Response:\n", res.json().get("answer"))

