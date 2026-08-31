import requests
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

def print_header(title):
    print(f"\n{'='*50}")
    print(f" {title}")
    print(f"{'='*50}")

def print_success(msg):
    print(f"\033[92m[PASS] {msg}\033[0m")

def run_tests():
    # 1. Setup Users
    import time
    ts = int(time.time())
    print_header("1. Authenticate Users")
    user_a = {"name": "Farmer 4A", "email": f"farmer4a_{ts}@test.com", "password": "password123", "role": "farmer"}
    user_b = {"name": "Farmer 4B", "email": f"farmer4b_{ts}@test.com", "password": "password123", "role": "farmer"}
    
    
    for u in [user_a, user_b]:
        res = requests.post(f"{BASE_URL}/auth/login", data={"username": u["email"], "password": u["password"]})
        if res.status_code != 200:
            requests.post(f"{BASE_URL}/auth/register", json=u)
            res = requests.post(f"{BASE_URL}/auth/login", data={"username": u["email"], "password": u["password"]})
        u["token"] = res.json().get("access_token")
        
    headers_a = {"Authorization": f"Bearer {user_a['token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['token']}"}
    print_success("User A and User B Authenticated")

    # 2. Setup Farm, Field, Crop
    print_header("2. Setup Foundation Data")
    farm_res = requests.post(f"{BASE_URL}/farms/", json={
        "name": "Phase 4 Farm", "location": "Test", "total_area": 10, "area_unit": "acres"
    }, headers=headers_a)
    farm_id = farm_res.json()["_id"]
    
    field_res = requests.post(f"{BASE_URL}/fields/?farm_id={farm_id}", json={
        "name": "Phase 4 Field", "area": 5, "area_unit": "acres", "soil_type": "loam", "irrigation_type": "drip"
    }, headers=headers_a)
    field_id = field_res.json()["_id"]
    
    crop_res = requests.post(f"{BASE_URL}/crops/", json={
        "name": "Corn", "variety": "Sweet", "farm_id": farm_id, "field_id": field_id, "area": 5, "area_unit": "acres"
    }, headers=headers_a)
    crop_id = crop_res.json()["_id"]
    print_success(f"Farm ({farm_id}), Field ({field_id}), Crop ({crop_id}) Created")

    # 3. Test Activity (total_cost backend calc)
    print_header("3. Test Activity")
    act_res = requests.post(f"{BASE_URL}/activities/", json={
        "farm_id": farm_id,
        "field_id": field_id,
        "crop_id": crop_id,
        "activity_type": "Sowing",
        "activity_date": datetime.utcnow().isoformat(),
        "labour_count": 2,
        "labour_cost": 1000.50,
        "equipment_cost": 500,
        "other_cost": 100
        # Omit total_cost to ensure backend calculates it
    }, headers=headers_a)
    assert act_res.status_code == 201, f"Failed: {act_res.text}"
    activity_id = act_res.json()["_id"]
    total_cost = act_res.json()["total_cost"]
    assert total_cost == 1600.50, f"Expected 1600.50, got {total_cost}"
    print_success("Activity created and total_cost calculated securely on backend")

    # 4. Test Expense (validation)
    print_header("4. Test Expense")
    # Negative test
    exp_neg = requests.post(f"{BASE_URL}/expenses/", json={
        "farm_id": farm_id, "amount": -50, "category": "Seeds", "expense_date": datetime.utcnow().isoformat()
    }, headers=headers_a)
    assert exp_neg.status_code == 422, "Failed to reject negative amount"
    print_success("Negative amount rejected")

    # Valid expense
    exp_res = requests.post(f"{BASE_URL}/expenses/", json={
        "farm_id": farm_id,
        "field_id": field_id,
        "crop_id": crop_id,
        "amount": 29500.00,
        "category": "Seeds",
        "expense_date": datetime.utcnow().isoformat(),
        "payment_method": "Bank Transfer"
    }, headers=headers_a)
    assert exp_res.status_code == 201, f"Failed: {exp_res.text}"
    expense_id = exp_res.json()["_id"]
    print_success("Valid expense created")

    # 5. Test Income (amount calc)
    print_header("5. Test Income")
    inc_res = requests.post(f"{BASE_URL}/income/", json={
        "farm_id": farm_id,
        "field_id": field_id,
        "crop_id": crop_id,
        "source": "Crop Sale",
        "income_date": datetime.utcnow().isoformat(),
        "quantity": 100,
        "selling_price": 880
        # Backend should calculate 100 * 880 = 88000
    }, headers=headers_a)
    assert inc_res.status_code == 201, f"Failed: {inc_res.text}"
    income_id = inc_res.json()["_id"]
    assert inc_res.json()["amount"] == 88000, "Backend failed to calculate amount"
    
    # Generic income without qty/price
    inc_res2 = requests.post(f"{BASE_URL}/income/", json={
        "farm_id": farm_id,
        "source": "Government Support",
        "income_date": datetime.utcnow().isoformat(),
        "amount": 10000.00
    }, headers=headers_a)
    assert inc_res2.status_code == 201
    income_id2 = inc_res2.json()["_id"]
    print_success("Income recorded (both calculated and manual)")

    # 6. Test Financial Summary
    print_header("6. Test Financial Aggregation")
    fin_res = requests.get(f"{BASE_URL}/finance/summary", headers=headers_a)
    assert fin_res.status_code == 200, f"Failed: {fin_res.text}"
    fin_data = fin_res.json()
    assert fin_data["total_income"] == 98000.00, f"Income wrong: {fin_data['total_income']}"
    assert fin_data["total_expenses"] == 29500.00, f"Expenses wrong: {fin_data['total_expenses']}"
    assert fin_data["net_profit"] == 68500.00, f"Profit wrong: {fin_data['net_profit']}"
    print_success("Financial aggregation is mathematically correct")

    # 7. Test Cross-User Isolation (IDOR)
    print_header("7. Test Data Isolation (IDOR)")
    idor_res = requests.get(f"{BASE_URL}/expenses/{expense_id}", headers=headers_b)
    assert idor_res.status_code in [403, 404], "User B accessed User A's expense!"
    print_success("User B successfully blocked from accessing User A's expense")

    # 8. Test Safe Delete
    print_header("8. Test Safe Delete Blocks")
    del_farm = requests.delete(f"{BASE_URL}/farms/{farm_id}", headers=headers_a)
    assert del_farm.status_code == 400, "Should not delete farm with financial records"
    del_crop = requests.delete(f"{BASE_URL}/crops/{crop_id}", headers=headers_a)
    assert del_crop.status_code == 400, "Should not delete crop with financial records"
    print_success("Financial records correctly blocked parent deletion")

    # Cleanup
    requests.delete(f"{BASE_URL}/activities/{activity_id}", headers=headers_a)
    requests.delete(f"{BASE_URL}/expenses/{expense_id}", headers=headers_a)
    requests.delete(f"{BASE_URL}/income/{income_id}", headers=headers_a)
    requests.delete(f"{BASE_URL}/income/{income_id2}", headers=headers_a)
    requests.delete(f"{BASE_URL}/crops/{crop_id}", headers=headers_a)
    requests.delete(f"{BASE_URL}/fields/{field_id}", headers=headers_a)
    requests.delete(f"{BASE_URL}/farms/{farm_id}", headers=headers_a)
    print_success("Test data cleaned up successfully")
    
    print("\n\033[92mALL PHASE 4 TESTS PASSED SUCCESSFULLY!\033[0m")

if __name__ == "__main__":
    try:
        requests.get(f"{BASE_URL}/health")
    except:
        print("Waiting for server to start...")
    run_tests()
