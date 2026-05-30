import requests

API_URL = "http://localhost:8000/api"
app_id = "app-a49a5442b61a"

print(f"Testing RAG for app: {app_id}")

res = requests.post(f"{API_URL}/rag/query", json={
    "question": "What endpoint retrieves test data?",
    "app_ids": [app_id]
})

if res.status_code == 200:
    data = res.json()
    print("Agent Response:", data.get("answer"))
else:
    print(f"Failed! Status: {res.status_code}")
    print(res.text)
