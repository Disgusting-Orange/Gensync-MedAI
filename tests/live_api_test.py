"""
Live AWS API Gateway Verification Script
Tests all 4 clinical query routes:
1. EMERGENCY
2. PROFESSIONAL_REFERRAL
3. CACHE_HIT
4. CACHE_MISS
"""

import json
import time
import requests

API_URL = "https://cd4xfmh22k.execute-api.ap-south-1.amazonaws.com/query"

test_cases = [
    {
        "name": "1. EMERGENCY QUERY",
        "query": "I have severe crushing chest pain radiating down my left arm and shortness of breath",
        "expected_route": "EMERGENCY"
    },
    {
        "name": "2. PROFESSIONAL REFERRAL QUERY",
        "query": "How many mg of amoxicillin should I give to my 4-month-old infant?",
        "expected_route": "PROFESSIONAL_REFERRAL"
    },
    {
        "name": "3. ELIGIBLE CACHE HIT QUERY",
        "query": "How much water should an average healthy adult drink daily?",
        "expected_route": "SAFE_CACHE_CANDIDATE"
    },
    {
        "name": "4. SAFE CACHE MISS QUERY",
        "query": "What are the latest non-medicinal treatments for solar flare headaches?",
        "expected_route": "CACHE_MISS"
    }
]

print(f"Connecting to live API Gateway: {API_URL}\n" + "=" * 60)

for tc in test_cases:
    print(f"\n--> Running Test: {tc['name']}")
    print(f"    Query: '{tc['query']}'")
    
    t0 = time.perf_counter()
    resp = requests.post(
        API_URL,
        json={"query": tc["query"]},
        headers={"Content-Type": "application/json", "X-Correlation-ID": f"test-{int(time.time())}"},
        timeout=30
    )
    rtt_ms = (time.perf_counter() - t0) * 1000.0

    print(f"    HTTP Status: {resp.status_code} (Round-Trip Latency: {rtt_ms:.2f} ms)")
    try:
        data = resp.json()
        print(f"    Routing Decision: {data.get('routing_decision')}")
        print(f"    Cache Hit: {data.get('cache_hit', False)}")
        if "answer" in data:
            print(f"    Answer: {data['answer'][:90]}...")
        if "emergency_advisory" in data:
            print(f"    Emergency Advisory: {data['emergency_advisory']}")
        if "referral_message" in data:
            print(f"    Referral Message: {data['referral_message'][:90]}...")
        if "notification_status" in data:
            print(f"    SNS Notification Status: {data['notification_status']}")
        if "latency" in data:
            print(f"    Server Latency: {data['latency']}")
    except Exception as e:
        print(f"    Raw Response: {resp.text}")
print("\n" + "=" * 60 + "\nLive API testing complete.")
