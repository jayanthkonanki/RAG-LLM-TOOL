import requests
import time

API_URL = "http://localhost:8000/api"

print("Waiting for API to be ready...")
for _ in range(10):
    try:
        r = requests.get(f"{API_URL}/health")
        if r.status_code == 200:
            print("API is ready!")
            break
    except:
        time.sleep(1)

# 1. Create App
print("Creating Application...")
res = requests.post(f"{API_URL}/applications", json={
    "name": "Test App v2",
    "description": "App for caveman tests",
    "tags": ["test"]
})
if res.status_code != 201: print("Error creating App:", res.status_code, res.text)
assert res.status_code == 201
app_data = res.json()
app_id = app_data["id"]
print(f"Created App: {app_id}")

# 2. Create Group
print("Creating Group...")
res = requests.post(f"{API_URL}/groups", json={
    "application_id": app_id,
    "name": "Test Group v2",
    "description": "Group for caveman tests"
})
assert res.status_code == 201
group_data = res.json()
group_id = group_data["id"]
print(f"Created Group: {group_id}")

# 3. Create Endpoint
print("Creating Endpoint...")
endpoint_payload = {
    "id": "ep-12345",
    "name": "Get Test Data",
    "path": "/test/data",
    "method": "GET",
    "description": "Fetch test data",
    "applicationId": app_id,
    "groupId": group_id,
    "tags": ["test"],
    "category": "data-retrieval",
    "riskLevel": "safe"
}
res = requests.post(f"{API_URL}/endpoints", json=endpoint_payload)
assert res.status_code == 200, res.text
print("Created Endpoint: ep-12345")

# Verify fetch
print("Verifying fetch endpoints...")
res = requests.get(f"{API_URL}/endpoints?application_id={app_id}")
assert res.status_code == 200
eps = res.json()["endpoints"]
assert len(eps) > 0
print("Fetch successful, endpoint found!")
print("Stage 1 CRUD test passed.")
