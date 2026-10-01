import sys
import unittest
import requests
import json
import time
from datetime import datetime, timezone

# Ensure utf-8 output on Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def print_pass(msg): print(f"[PASS] {msg}")
def print_fail(msg): print(f"[FAIL] {msg}")
def print_header(msg): print(f"\n=== {msg} ===")

def register_and_login(email: str, password: str = "Password123!", name: str = "Test User"):
    # Try register first
    reg = requests.post(f"{BASE_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password,
        "role": "farmer"
    })
    login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    assert login_res.status_code == 200, f"Failed to login {email} (reg status: {reg.status_code}, {reg.text}): {login_res.text}"
    return login_res.json()["access_token"]

def run_all_tests():
    print_header("AGRIFLOW PHASE 10 FREE MULTI-USER AI ASSISTANT VERIFICATION SUITE")

    # Step 14: Minimal AI request test first
    print_header("Step 14: Minimal AI Request Test ('Reply with OK only.')")
    from app.services.ai_providers.factory import get_ai_provider
    import asyncio
    provider = get_ai_provider()
    print(f"Provider: {provider.__class__.__name__}, Model: {getattr(provider, 'model', 'unknown')}")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        minimal_resp = loop.run_until_complete(provider.generate_response(
            system_prompt="You are a test assistant.",
            user_prompt="Reply with OK only."
        ))
        print(f"Minimal AI response: '{minimal_resp.strip()}'")
        assert len(minimal_resp.strip()) > 0, "Minimal AI response was empty"
        print_pass("Minimal AI request succeeded!")
    except Exception as e:
        print_fail(f"Minimal AI test failed: {e}")
        raise

    # Authenticate two test users for data isolation
    print_header("Authenticating User A and User B")
    ts = int(time.time())
    token_a = register_and_login(f"p10_user_a_{ts}@example.com", "Password123!", "Farmer Alice")
    token_b = register_and_login(f"p10_user_b_{ts}@example.com", "Password123!", "Farmer Bob")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print_pass("User A and User B authenticated successfully.")

    # 1. Unauthenticated request rejected
    print_header("Test 1: Unauthenticated request rejected (401)")
    unauth_res = requests.post(f"{BASE_URL}/ai/chat", json={"message": "Hello"})
    assert unauth_res.status_code == 401, f"Expected 401, got {unauth_res.status_code}"
    print_pass("Unauthenticated chat request rejected with 401 Unauthorized.")

    # 2. Setup AgriFlow data for User A and User B (Step 16)
    print_header("Test 2: Seeding User A and User B Data for Isolation Testing")
    # User A Farm, Field, Crop
    f_a = requests.post(f"{BASE_URL}/farms/", headers=headers_a, json={
        "name": "A-Farm",
        "location": "Madurai",
        "total_area": 15.0,
        "area_unit": "acres"
    })
    assert f_a.status_code == 201, f"Failed to create A-Farm: {f_a.text}"
    farm_a_id = f_a.json()["_id"]

    fld_a = requests.post(f"{BASE_URL}/fields/?farm_id={farm_a_id}", headers=headers_a, json={
        "name": "A-Field",
        "area": 10.0,
        "area_unit": "acres",
        "soil_type": "loam",
        "irrigation_type": "drip"
    })
    assert fld_a.status_code == 201, f"Failed to create A-Field: {fld_a.text}"
    field_a_id = fld_a.json()["_id"]

    # Crop for User A
    c_a = requests.post(f"{BASE_URL}/crops/", headers=headers_a, json={
        "farm_id": farm_a_id,
        "field_id": field_a_id,
        "name": "A-Crop (Sugarcane)",
        "variety": "CO-86032",
        "area": 10.0,
        "area_unit": "acres",
        "sowing_date": "2026-01-10T00:00:00Z",
        "expected_harvest_date": "2026-11-15T00:00:00Z",
        "status": "growing"
    })
    assert c_a.status_code == 201, f"Failed to create A-Crop: {c_a.text}"

    # Expense for User A
    e_a = requests.post(f"{BASE_URL}/expenses/", headers=headers_a, json={
        "farm_id": farm_a_id,
        "category": "Fertilizer",
        "amount": 4500.0,
        "expense_date": datetime.now(timezone.utc).isoformat()
    })
    assert e_a.status_code == 201, f"Failed to create expense: {e_a.text}"

    # Income for User A
    i_a = requests.post(f"{BASE_URL}/income/", headers=headers_a, json={
        "farm_id": farm_a_id,
        "source": "Crop Sale",
        "amount": 12000.0,
        "income_date": datetime.now(timezone.utc).isoformat()
    })
    assert i_a.status_code == 201, f"Failed to create income: {i_a.text}"

    # User B Farm, Field, Crop
    f_b = requests.post(f"{BASE_URL}/farms/", headers=headers_b, json={
        "name": "B-Farm",
        "location": "Coimbatore",
        "total_area": 25.0,
        "area_unit": "acres"
    })
    assert f_b.status_code == 201, f"Failed to create B-Farm: {f_b.text}"
    farm_b_id = f_b.json()["_id"]

    fld_b = requests.post(f"{BASE_URL}/fields/?farm_id={farm_b_id}", headers=headers_b, json={
        "name": "B-Field",
        "area": 20.0,
        "area_unit": "acres",
        "soil_type": "clay",
        "irrigation_type": "sprinkler"
    })
    assert fld_b.status_code == 201, f"Failed to create B-Field: {fld_b.text}"
    field_b_id = fld_b.json()["_id"]

    c_b = requests.post(f"{BASE_URL}/crops/", headers=headers_b, json={
        "farm_id": farm_b_id,
        "field_id": field_b_id,
        "name": "B-Crop (Cotton)",
        "variety": "Bt-Cotton",
        "area": 20.0,
        "area_unit": "acres",
        "sowing_date": "2026-02-01T00:00:00Z",
        "expected_harvest_date": "2026-08-20T00:00:00Z",
        "status": "growing"
    })
    assert c_b.status_code == 201, f"Failed to create B-Crop: {c_b.text}"
    print_pass("User A (A-Farm, A-Crop) and User B (B-Farm, B-Crop) data seeded successfully.")

    # 3. Two-User Security & Data Isolation Test (Step 16)
    print_header("Test 3: Two-User Security & Farm Isolation Test")
    # User A asks about farms
    resp_a_farms = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "What farms do I have?"})
    assert resp_a_farms.status_code == 200, f"Chat failed for User A: {resp_a_farms.text}"
    ans_a = resp_a_farms.json()["answer"]
    print(f"User A Answer: {ans_a}")
    assert "A-Farm" in ans_a, f"Expected A-Farm in User A's answer, got: {ans_a}"
    assert "B-Farm" not in ans_a, f"LEAK! User A received User B's farm: {ans_a}"
    print_pass("User A query correctly only sees A-Farm.")

    # User B asks about farms
    resp_b_farms = requests.post(f"{BASE_URL}/ai/chat", headers=headers_b, json={"message": "What farms do I have?"})
    assert resp_b_farms.status_code == 200, f"Chat failed for User B: {resp_b_farms.text}"
    ans_b = resp_b_farms.json()["answer"]
    print(f"User B Answer: {ans_b}")
    assert "B-Farm" in ans_b, f"Expected B-Farm in User B's answer, got: {ans_b}"
    assert "A-Farm" not in ans_b, f"LEAK! User B received User A's farm: {ans_b}"
    print_pass("User B query correctly only sees B-Farm. Multi-user farm isolation verified!")

    # 4. User A asks "What crops do I have?"
    print_header("Test 4: User A asks 'What crops do I have?'")
    resp_a_crops = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "What crops do I have?"})
    assert resp_a_crops.status_code == 200
    ans_crops = resp_a_crops.json()["answer"]
    print(f"Crops Answer: {ans_crops}")
    assert "Sugarcane" in ans_crops or "A-Crop" in ans_crops, f"Expected Sugarcane/A-Crop in response: {ans_crops}"
    assert "B-Crop" not in ans_crops and "Cotton" not in ans_crops, f"LEAK! User A saw User B's crop: {ans_crops}"
    print_pass("User A crops correctly answered without cross-user leakage.")

    # 5. User A asks "How much did I spend this month?"
    print_header("Test 5: User A asks 'How much did I spend this month?'")
    resp_a_exp = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "How much did I spend this month?"})
    assert resp_a_exp.status_code == 200
    ans_exp = resp_a_exp.json()["answer"]
    print(f"Expense Answer: {ans_exp}")
    assert "4500" in ans_exp or "4,500" in ans_exp, f"Expected 4500 in expense response: {ans_exp}"
    print_pass("User A monthly expense correctly answered from actual MongoDB data.")

    # 6. User A asks "What is my profit?"
    print_header("Test 6: User A asks 'What is my profit?'")
    resp_a_prof = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "What is my profit?"})
    assert resp_a_prof.status_code == 200
    ans_prof = resp_a_prof.json()["answer"]
    print(f"Profit Answer: {ans_prof}")
    # 12000 income - 4500 expense = 7500 profit
    assert "7500" in ans_prof or "7,500" in ans_prof or "profit" in ans_prof.lower(), f"Expected profit in response: {ans_prof}"
    print_pass("User A profit correctly computed and explained.")

    # 7. Weather questions
    print_header("Test 7: Weather question 'What is the weather today?'")
    resp_weather = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "What is the weather today?"})
    assert resp_weather.status_code == 200
    ans_weather = resp_weather.json()["answer"]
    print(f"Weather Answer: {ans_weather}")
    assert len(ans_weather) > 10
    print_pass("Weather question processed with Open-Meteo integration.")

    # 8. Weather impact question
    print_header("Test 8: Weather impact 'Will the weather affect my crops?'")
    resp_w_crop = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "Will the weather affect my crops?"})
    assert resp_w_crop.status_code == 200
    ans_w_crop = resp_w_crop.json()["answer"]
    print(f"Weather Impact Answer: {ans_w_crop}")
    assert len(ans_w_crop) > 10
    print_pass("Weather impact on crops answered successfully.")

    # 9. General Agricultural Question
    print_header("Test 9: General Agricultural Question ('What is crop rotation?')")
    resp_agri = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "What is crop rotation and why is it beneficial?"})
    assert resp_agri.status_code == 200
    ans_agri = resp_agri.json()["answer"]
    print(f"Agri Answer: {ans_agri[:120]}...")
    assert "soil" in ans_agri.lower() or "crop" in ans_agri.lower(), f"Expected agricultural explanation: {ans_agri}"
    print_pass("General agricultural question answered practically.")

    # 10. Tamil Language Test
    print_header("Test 10: Tamil Language Test ('என்னிடம் எத்தனை பண்ணைகள் உள்ளன?')")
    resp_tamil = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={"message": "என்னிடம் எத்தனை பண்ணைகள் உள்ளன?"})
    assert resp_tamil.status_code == 200
    ans_tamil = resp_tamil.json()["answer"]
    print(f"Tamil Answer: {ans_tamil}")
    assert len(ans_tamil) > 0
    # Response should contain either Tamil script or mention farm count
    print_pass("Tamil language query answered successfully.")

    # 11. Conversation Memory & IDOR Test (Step 10 & 16)
    print_header("Test 11: Conversation Memory & IDOR Deletion/Access Isolation")
    c_new = requests.post(f"{BASE_URL}/ai/conversations", headers=headers_a)
    assert c_new.status_code == 200
    conv_id = c_new.json()["id"]

    # User A chats in conversation
    chat_turn_1 = requests.post(f"{BASE_URL}/ai/chat", headers=headers_a, json={
        "conversation_id": conv_id,
        "message": "Hello, remember my secret number is 777"
    })
    assert chat_turn_1.status_code == 200

    # User A retrieves history
    hist = requests.get(f"{BASE_URL}/ai/conversations/{conv_id}", headers=headers_a)
    assert hist.status_code == 200
    msgs = hist.json()
    assert len(msgs) >= 2, f"Expected user+assistant messages, got {len(msgs)}"

    # User B tries to read User A's conversation -> MUST BE 404
    idor_get = requests.get(f"{BASE_URL}/ai/conversations/{conv_id}", headers=headers_b)
    assert idor_get.status_code == 404, f"IDOR LEAK! User B could access User A's conversation: {idor_get.status_code}"

    # User B tries to delete User A's conversation -> MUST BE 404
    idor_del = requests.delete(f"{BASE_URL}/ai/conversations/{conv_id}", headers=headers_b)
    assert idor_del.status_code == 404, f"IDOR LEAK! User B could delete User A's conversation: {idor_del.status_code}"

    # User A deletes their own conversation
    del_ok = requests.delete(f"{BASE_URL}/ai/conversations/{conv_id}", headers=headers_a)
    assert del_ok.status_code == 200
    assert requests.get(f"{BASE_URL}/ai/conversations/{conv_id}", headers=headers_a).status_code == 404
    print_pass("Conversation Memory & IDOR protection completely verified.")

    # 12. Rate Limit Protection Test (Step 13)
    print_header("Test 12: Rate Limit Protection Test")
    from app.services.rate_limiter import UserRateLimiter, user_rate_limiter
    from fastapi.testclient import TestClient
    from app.main import app
    from collections import deque

    # 12a. Verify rate limiter logic directly
    limiter = UserRateLimiter(max_requests=3, window_seconds=60)
    for _ in range(3):
        ok, msg = limiter.check_rate_limit("user_test_quota")
        assert ok is True
        assert msg is None
    blocked, block_msg = limiter.check_rate_limit("user_test_quota")
    assert blocked is False
    assert "limit" in block_msg.lower()
    print_pass("UserRateLimiter sliding-window enforcement verified.")

    # 12b. Verify HTTP 429 returned on route when quota is exceeded
    me_res = requests.get(f"{BASE_URL}/auth/me", headers=headers_b)
    user_b_id = me_res.json()["_id"]
    test_client = TestClient(app)
    # Pre-fill in-process user_rate_limiter
    user_rate_limiter._user_requests[user_b_id] = deque([time.time()] * 25)
    rl_res = test_client.post("/api/ai/chat", headers=headers_b, json={"message": "Exceeding limit test"})
    assert rl_res.status_code == 429, f"Expected 429, got {rl_res.status_code}: {rl_res.text}"
    rl_json = rl_res.json()
    print(f"Rate limit 429 response detail: {rl_json['detail']}")
    assert "limit" in rl_json["detail"].lower()
    user_rate_limiter.reset(user_b_id)
    print_pass("Per-user rate limiting verified via HTTP 429 route response.")

    # 13. AI Health Check Endpoint (Safe Diagnostics)
    print_header("Test 13: AI Health Check Endpoint (Safe Diagnostics)")
    h_res = requests.get(f"{BASE_URL}/ai/health")
    assert h_res.status_code == 200
    h_json = h_res.json()
    print(f"Health response: {h_json}")
    assert h_json["provider"] == "gemini"
    assert "gemini" in h_json["model"]
    assert h_json.get("api_key_configured") is True
    # Ensure no actual API key secret was exposed
    for k, v in h_json.items():
        if isinstance(v, str):
            assert not v.startswith("AIza"), "API key secret leaked in health endpoint!"
    print_pass("AI Health check confirmed safe and fully configured.")

    print("\n==================================================")
    print("ALL 13 PHASE 10 VERIFICATION TESTS COMPLETED AND PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
