import requests
import datetime
import time

BASE_URL = "http://localhost:8000/api"

def print_step(msg):
    print(f"\n[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")

def run_tests():
    unique_suffix = int(time.time())
    
    # --- SETUP: USERS ---
    print_step("1. Registering Test Users")
    u1_data = {"email": f"farmer_{unique_suffix}@test.com", "password": "password123", "name": "Farmer 1", "role": "farmer"}
    u2_data = {"email": f"neighbor_{unique_suffix}@test.com", "password": "password123", "name": "Farmer 2", "role": "farmer"}
    
    requests.post(f"{BASE_URL}/auth/register", json=u1_data)
    requests.post(f"{BASE_URL}/auth/register", json=u2_data)
    
    u1_token = requests.post(f"{BASE_URL}/auth/login", data={"username": u1_data["email"], "password": "password123"}).json()["access_token"]
    u2_token = requests.post(f"{BASE_URL}/auth/login", data={"username": u2_data["email"], "password": "password123"}).json()["access_token"]
    
    h1 = {"Authorization": f"Bearer {u1_token}"}
    h2 = {"Authorization": f"Bearer {u2_token}"}
    
    # --- SETUP: FARMS, FIELDS, CROPS, LIVESTOCK, EXPENSES, INCOME ---
    print_step("2. Setting up Data")
    
    # User 1 Farm
    f1_res = requests.post(f"{BASE_URL}/farms/", json={"name": "Farm 1", "location": "Loc 1", "total_area": 10, "area_unit": "acres"}, headers=h1)
    if f1_res.status_code != 201:
        print("Farm creation failed:", f1_res.text)
    f1 = f1_res.json()
    farm_id = f1["_id"]
    
    # Fields
    field1_res = requests.post(f"{BASE_URL}/fields/?farm_id={farm_id}", json={"name": "F1", "area": 5, "area_unit": "acres", "soil_type": "loam", "irrigation_type": "drip"}, headers=h1)
    if field1_res.status_code != 201:
        print("Field creation failed:", field1_res.text)
    field1 = field1_res.json()
    
    # Crops
    requests.post(f"{BASE_URL}/crops/", json={"name": "Corn", "variety": "Sweet", "farm_id": farm_id, "field_id": field1["_id"], "area": 2, "area_unit": "acres"}, headers=h1)
    requests.post(f"{BASE_URL}/crops/", json={"name": "Wheat", "variety": "Winter", "farm_id": farm_id, "field_id": field1["_id"], "area": 3, "area_unit": "acres", "status": "harvested"}, headers=h1)
    
    # Livestock
    requests.post(f"{BASE_URL}/livestock/", json={"farm_id": farm_id, "animal_type": "Cow", "gender": "Female", "purchase_date": "2026-01-01T00:00:00Z", "purchase_cost": 50000, "status": "Active"}, headers=h1)
    requests.post(f"{BASE_URL}/livestock/", json={"farm_id": farm_id, "animal_type": "Goat", "gender": "Male", "purchase_date": "2026-01-01T00:00:00Z", "purchase_cost": 5000, "status": "Sold"}, headers=h1)
    
    # Expenses & Income
    requests.post(f"{BASE_URL}/expenses/", json={"farm_id": farm_id, "amount": 1000, "category": "Seeds", "expense_date": "2026-02-01T00:00:00Z"}, headers=h1)
    requests.post(f"{BASE_URL}/income/", json={"farm_id": farm_id, "amount": 5000, "source": "Crop Sale", "income_date": "2026-03-01T00:00:00Z"}, headers=h1)
    
    # User 2 Farm
    requests.post(f"{BASE_URL}/farms/", json={"name": "Farm 2", "location": "Loc 2", "total_area": 5, "area_unit": "acres"}, headers=h2)
    
    # --- TEST 1: KPIs ---
    print_step("3. Testing KPIs")
    kpi_res = requests.get(f"{BASE_URL}/dashboard/kpis", headers=h1)
    assert kpi_res.status_code == 200
    kpis = kpi_res.json()
    print("KPIs:", kpis)
    assert kpis["total_farms"] == 1
    assert kpis["total_fields"] == 1
    assert kpis["active_crops"] == 1 # one is harvested
    assert kpis["total_livestock"] == 1 # one is sold
    
    # Test User 2 Isolation
    kpi_res2 = requests.get(f"{BASE_URL}/dashboard/kpis", headers=h2)
    kpis2 = kpi_res2.json()
    assert kpis2["total_farms"] == 1
    assert kpis2["total_fields"] == 0
    assert kpis2["active_crops"] == 0
    assert kpis2["total_livestock"] == 0
    print("   IDOR Isolation passed for KPIs")
    
    # --- TEST 2: Charts ---
    print_step("4. Testing Finance Charts")
    fin_res = requests.get(f"{BASE_URL}/dashboard/charts/finance", headers=h1)
    assert fin_res.status_code == 200
    fin_charts = fin_res.json()
    print("Expense Categories:", fin_charts["expense_categories"])
    
    # --- TEST 3: Crops ---
    print_step("5. Testing Crop Analytics")
    crop_res = requests.get(f"{BASE_URL}/dashboard/crops", headers=h1)
    assert crop_res.status_code == 200
    crop_data = crop_res.json()
    print("Crop Status Distribution:", crop_data["status_distribution"])
    
    # --- TEST 4: Livestock ---
    print_step("6. Testing Livestock Analytics")
    ls_res = requests.get(f"{BASE_URL}/dashboard/livestock", headers=h1)
    assert ls_res.status_code == 200
    ls_data = ls_res.json()
    print("Livestock Types:", ls_data["types_distribution"])
    
    # --- TEST 5: Recent Activity ---
    print_step("7. Testing Recent Activity")
    act_res = requests.get(f"{BASE_URL}/dashboard/recent-activity", headers=h1)
    assert act_res.status_code == 200
    act_data = act_res.json()
    print(f"Recent Activities returned: {len(act_data)}")
    assert len(act_data) == 2 # 1 expense, 1 income
    
    print_step("All Phase 6 Dashboard tests passed!")

if __name__ == "__main__":
    try:
        requests.get(f"{BASE_URL}/health")
    except:
        print("Waiting for server to start...")
    try:
        run_tests()
    except Exception as e:
        import traceback
        traceback.print_exc()
