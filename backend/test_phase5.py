import requests
import datetime
import time

BASE_URL = "http://localhost:8000/api"

def print_step(msg):
    print(f"\n[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")

def run_tests():
    print("="*50)
    print("FARMFLOW PHASE 5 LIVESTOCK TESTS")
    print("="*50)
    
    unique_suffix = int(time.time())
    
    # --- SETUP: USERS & FARMS ---
    print_step("1. Registering Test Users")
    u1_data = {"email": f"farmer_{unique_suffix}@test.com", "password": "password123", "name": "Farmer 1", "role": "farmer"}
    u2_data = {"email": f"neighbor_{unique_suffix}@test.com", "password": "password123", "name": "Farmer 2", "role": "farmer"}
    
    requests.post(f"{BASE_URL}/auth/register", json=u1_data)
    requests.post(f"{BASE_URL}/auth/register", json=u2_data)
    
    u1_token = requests.post(f"{BASE_URL}/auth/login", data={"username": u1_data["email"], "password": "password123"}).json()["access_token"]
    u2_token = requests.post(f"{BASE_URL}/auth/login", data={"username": u2_data["email"], "password": "password123"}).json()["access_token"]
    
    h1 = {"Authorization": f"Bearer {u1_token}"}
    h2 = {"Authorization": f"Bearer {u2_token}"}
    
    print_step("2. Creating Farms")
    farm1 = requests.post(f"{BASE_URL}/farms/", json={"name": "Livestock Farm", "location": "Texas", "total_area": 100, "area_unit": "acres"}, headers=h1).json()
    farm2 = requests.post(f"{BASE_URL}/farms/", json={"name": "Other Farm", "location": "Ohio", "total_area": 50, "area_unit": "acres"}, headers=h2).json()
    
    # --- STAGE 1: LIVESTOCK CREATION & ISOLATION ---
    print_step("3. Creating Livestock")
    ls_payload = {
        "farm_id": farm1["_id"],
        "animal_type": "Cow",
        "breed": "Holstein",
        "gender": "Female",
        "purchase_date": "2026-01-01T00:00:00Z",
        "purchase_cost": 5000.0,
        "status": "Active"
    }
    
    ls_resp = requests.post(f"{BASE_URL}/livestock/", json=ls_payload, headers=h1)
    assert ls_resp.status_code == 201, f"Failed to create livestock: {ls_resp.text}"
    livestock = ls_resp.json()
    print(f"   Created livestock: {livestock['animal_id']}")
    assert livestock['animal_id'] == "COW-001"
    
    # IDOR Test: User 2 tries to access User 1's livestock
    resp = requests.get(f"{BASE_URL}/livestock/{livestock['_id']}", headers=h2)
    assert resp.status_code == 403, "IDOR Vulnerability: User 2 accessed User 1's livestock"
    print("   IDOR check passed (User 2 blocked)")
    
    # --- STAGE 2: RECORD CREATION ---
    print_step("4. Logging Child Records")
    
    # Feed
    feed = requests.post(f"{BASE_URL}/livestock/{livestock['_id']}/feed", json={
        "livestock_id": livestock["_id"],
        "farm_id": farm1["_id"],
        "feed_type": "Hay",
        "quantity": 10,
        "unit": "kg",
        "feed_date": "2026-02-01T00:00:00Z",
        "cost": 200.0
    }, headers=h1).json()
    print(f"   Logged feed cost: Rs {feed['cost']}")
    
    # Medical
    med = requests.post(f"{BASE_URL}/livestock/{livestock['_id']}/medical", json={
        "livestock_id": livestock["_id"],
        "farm_id": farm1["_id"],
        "treatment_date": "2026-03-01T00:00:00Z",
        "problem": "Fever",
        "treatment": "Antibiotics",
        "cost": 1500.0
    }, headers=h1).json()
    print(f"   Logged medical cost: Rs {med['cost']}")
    
    # Vaccination
    vac = requests.post(f"{BASE_URL}/livestock/{livestock['_id']}/vaccinations", json={
        "livestock_id": livestock["_id"],
        "farm_id": farm1["_id"],
        "vaccine_name": "FMD",
        "vaccination_date": "2026-01-15T00:00:00Z",
        "next_due_date": "2027-01-15T00:00:00Z",
        "cost": 500.0
    }, headers=h1).json()
    print(f"   Logged vaccination cost: Rs {vac['cost']}")
    
    # Production
    prod = requests.post(f"{BASE_URL}/livestock/{livestock['_id']}/production", json={
        "livestock_id": livestock["_id"],
        "farm_id": farm1["_id"],
        "production_date": "2026-04-01T00:00:00Z",
        "production_type": "Milk",
        "quantity": 20,
        "unit": "litre",
        "selling_price": 50.0
    }, headers=h1).json()
    assert prod["income"] == 1000.0, "Income calculation failed"
    print(f"   Logged production income: Rs {prod['income']}")
    
    # --- STAGE 3: FINANCIAL AGGREGATION ---
    print_step("5. Verifying Financial Summary")
    fin_summary = requests.get(f"{BASE_URL}/finance/summary", headers=h1).json()
    
    expected_expense = 5000.0 + 200.0 + 1500.0 + 500.0
    expected_income = 1000.0
    expected_profit = expected_income - expected_expense
    
    print(f"   Expenses: Expected {expected_expense}, Got {fin_summary['total_expenses']}")
    print(f"   Income: Expected {expected_income}, Got {fin_summary['total_income']}")
    print(f"   Net Profit: Expected {expected_profit}, Got {fin_summary['net_profit']}")
    
    assert fin_summary['total_expenses'] == expected_expense, "Total expenses mismatch"
    assert fin_summary['total_income'] == expected_income, "Total income mismatch"
    assert fin_summary['net_profit'] == expected_profit, "Net profit mismatch"
    
    # --- STAGE 4: SAFE DELETION ---
    print_step("6. Verifying Safe Deletion")
    del_ls = requests.delete(f"{BASE_URL}/livestock/{livestock['_id']}", headers=h1)
    assert del_ls.status_code == 400, "Livestock deleted despite having child records"
    print("   Livestock safe delete passed (blocked)")
    
    del_farm = requests.delete(f"{BASE_URL}/farms/{farm1['_id']}", headers=h1)
    assert del_farm.status_code == 400, "Farm deleted despite having livestock"
    print("   Farm safe delete passed (blocked)")
    
    print_step("All Phase 5 Livestock tests passed! ✅")

if __name__ == "__main__":
    run_tests()
