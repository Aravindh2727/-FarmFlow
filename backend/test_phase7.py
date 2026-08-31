import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def print_step(msg):
    print(f"\n[{time.strftime('%H:%M:%S')}] {msg}")

def run_tests():
    print("==================================================")
    print("FARMFLOW PHASE 7 AI/ML TESTS")
    print("==================================================")

    # --- TEST 0: Health and Status ---
    print_step("0. Checking API Health and AI Models")
    res = requests.get(f"{BASE_URL}/health")
    if res.status_code != 200:
        print("Backend is not running. Please start uvicorn app.main:app")
        return
    
    ai_status = requests.get(f"{BASE_URL}/ai/status").json()
    if ai_status.get("status") != "ready":
        print(f"AI Models not ready: {ai_status.get('message')}")
        return
    print("   AI Models loaded successfully!")

    # --- TEST 1: Register Users ---
    print_step("1. Registering Test Users")
    suffix = int(time.time())
    u1_data = {"name": "AI Farmer A", "email": f"ai_a_{suffix}@example.com", "password": "password123"}
    u2_data = {"name": "AI Farmer B", "email": f"ai_b_{suffix}@example.com", "password": "password123"}

    requests.post(f"{BASE_URL}/auth/register", json=u1_data)
    requests.post(f"{BASE_URL}/auth/register", json=u2_data)

    u1_token = requests.post(f"{BASE_URL}/auth/login", data={"username": u1_data["email"], "password": "password123"}).json()["access_token"]
    u2_token = requests.post(f"{BASE_URL}/auth/login", data={"username": u2_data["email"], "password": "password123"}).json()["access_token"]

    h1 = {"Authorization": f"Bearer {u1_token}"}
    h2 = {"Authorization": f"Bearer {u2_token}"}

    # --- TEST 2: Data Setup ---
    print_step("2. Data Setup (Farms)")
    f1 = requests.post(f"{BASE_URL}/farms/", json={"name": "Farm A", "location": "Loc A", "total_area": 10, "area_unit": "acres"}, headers=h1).json()
    farm_id = f1["_id"]

    f2 = requests.post(f"{BASE_URL}/farms/", json={"name": "Farm B", "location": "Loc B", "total_area": 5, "area_unit": "acres"}, headers=h2).json()
    farm_id2 = f2["_id"]

    # --- TEST 3: Yield Prediction ---
    print_step("3. Testing Yield Prediction")
    y_req = {"crop_type": "Paddy", "season": "Kharif", "area": 5.0, "farm_id": farm_id}
    y_res = requests.post(f"{BASE_URL}/ai/yield/predict", json=y_req, headers=h1)
    
    if y_res.status_code == 200:
        yield_data = y_res.json()
        print(f"   Yield Prediction: {yield_data['estimated_yield_kg']} kg")
        assert yield_data['estimated_yield_kg'] > 0
    else:
        print(f"   Yield failed: {y_res.text}")
        assert False

    # --- TEST 4: Profit Prediction ---
    print_step("4. Testing Profit Prediction")
    p_req = {"crop_type": "Wheat", "season": "Rabi", "area": 10.0, "farm_id": farm_id}
    p_res = requests.post(f"{BASE_URL}/ai/profit/predict", json=p_req, headers=h1)
    
    if p_res.status_code == 200:
        profit_data = p_res.json()
        print(f"   Profit Prediction: {profit_data['estimated_profit']} INR")
        assert profit_data['estimated_profit'] != 0
    else:
        print(f"   Profit failed: {p_res.text}")
        assert False

    # --- TEST 5: Anomaly Detection ---
    print_step("5. Testing Anomaly Detection")
    # Normal expense
    n_req = {"category": "Seeds", "amount": 2500.0, "farm_id": farm_id, "farm_area": 5.0}
    n_res = requests.post(f"{BASE_URL}/ai/expense/anomaly", json=n_req, headers=h1).json()
    print(f"   Normal Expense (2500 for Seeds): Is Anomaly? {n_res['is_anomaly']}")
    
    # Abnormal expense
    ab_req = {"category": "Seeds", "amount": 95000.0, "farm_id": farm_id, "farm_area": 5.0}
    ab_res = requests.post(f"{BASE_URL}/ai/expense/anomaly", json=ab_req, headers=h1).json()
    print(f"   Abnormal Expense (95000 for Seeds): Is Anomaly? {ab_res['is_anomaly']}")
    assert ab_res['is_anomaly'] == True

    # --- TEST 6: NLP Categorization ---
    print_step("6. Testing NLP Categorization")
    nlp_req = {"description": "Bought 2 bags of DAP fertilizer for the field"}
    nlp_res = requests.post(f"{BASE_URL}/ai/expense/categorize", json=nlp_req, headers=h1).json()
    print(f"   Text: '{nlp_req['description']}'")
    print(f"   Predicted Category: {nlp_res['category']} (Confidence: {nlp_res['confidence']}%)")
    assert nlp_res['category'] == 'Fertilizer'

    print_step("All Phase 7 AI/ML tests passed!")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        import traceback
        traceback.print_exc()
