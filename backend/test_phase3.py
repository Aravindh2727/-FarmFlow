import requests
import time

BASE_URL = "http://localhost:8000/api"

# Helper to print colored output
def print_success(msg): print(f"\033[92m{msg}\033[0m")
def print_error(msg): print(f"\033[91m{msg}\033[0m")
def print_header(msg): print(f"\n\033[95m--- {msg} ---\033[0m")

def run_tests():
    print("Waiting for server to start...")
    time.sleep(2)
    
    # 1. Login User A
    print_header("1. Authenticate User A")
    login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "farmer_phase3@test.com", "password": "password123"})
    if login_res.status_code != 200:
        # try registering first
        requests.post(f"{BASE_URL}/auth/register", json={"name": "Farmer A", "email": "farmer_phase3@test.com", "password": "password123", "role": "farmer"})
        login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "farmer_phase3@test.com", "password": "password123"})
    
    token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print_success("User A Authenticated")

    # 2. Create Farm
    print_header("2. Create Farm")
    farm_data = {
        "name": "Test Farm Phase 3",
        "location": "Test Location",
        "total_area": 10.5,
        "area_unit": "acres",
        "description": "A beautiful farm"
    }
    res = requests.post(f"{BASE_URL}/farms/", json=farm_data, headers=headers)
    assert res.status_code == 201, f"Failed to create farm: {res.text}"
    farm = res.json()
    farm_id = farm["_id"]
    print_success(f"Farm created: {farm['name']} (ID: {farm_id})")

    # 3. Create Field
    print_header("3. Create Field")
    field_data = {
        "name": "North Field",
        "area": 5.0,
        "area_unit": "acres",
        "soil_type": "Loamy",
        "irrigation_type": "Drip",
        "description": "Main crop field"
    }
    res = requests.post(f"{BASE_URL}/fields/?farm_id={farm_id}", json=field_data, headers=headers)
    assert res.status_code == 201, f"Failed to create field: {res.text}"
    field = res.json()
    field_id = field["_id"]
    print_success(f"Field created: {field['name']} (ID: {field_id})")

    # 4. Create Crop
    print_header("4. Create Crop")
    crop_data = {
        "name": "Wheat",
        "variety": "Winter Wheat",
        "farm_id": farm_id,
        "field_id": field_id,
        "area": 5.0,
        "area_unit": "acres",
        "status": "planned",
        "expected_yield": 1500,
        "yield_unit": "kg",
        "planting_date": "2026-09-01T00:00:00Z",
        "expected_harvest_date": "2026-12-01T00:00:00Z"
    }
    res = requests.post(f"{BASE_URL}/crops/", json=crop_data, headers=headers)
    assert res.status_code == 201, f"Failed to create crop: {res.text}"
    crop = res.json()
    crop_id = crop["_id"]
    print_success(f"Crop created: {crop['name']} (ID: {crop_id})")

    # 5. Test Filters
    print_header("5. Test Filters")
    res = requests.get(f"{BASE_URL}/crops/?status=planned", headers=headers)
    assert len(res.json()) >= 1, "Filter by status failed"
    print_success("Filter by status working")

    res = requests.get(f"{BASE_URL}/crops/?farm_id={farm_id}", headers=headers)
    assert len(res.json()) >= 1, "Filter by farm_id failed"
    print_success("Filter by farm_id working")

    # 6. Test Validation (Bad Dates)
    print_header("6. Test Date Validation")
    bad_crop = crop_data.copy()
    bad_crop["expected_harvest_date"] = "2026-08-01T00:00:00Z" # Before planting
    res = requests.post(f"{BASE_URL}/crops/", json=bad_crop, headers=headers)
    assert res.status_code == 422, f"Validation failed to catch bad date, got {res.status_code}"
    print_success("Date validation correctly rejected bad dates")

    # 7. Test Ownership / IDOR
    print_header("7. Test Ownership")
    # Register User B
    requests.post(f"{BASE_URL}/auth/register", json={"name": "Farmer B", "email": "farmerB@test.com", "password": "password123", "role": "farmer"})
    resB = requests.post(f"{BASE_URL}/auth/login", data={"username": "farmerB@test.com", "password": "password123"})
    tokenB = resB.json().get("access_token")
    headersB = {"Authorization": f"Bearer {tokenB}"}

    # User B tries to get User A's farm
    res = requests.get(f"{BASE_URL}/farms/{farm_id}", headers=headersB)
    assert res.status_code in [403, 404], "User B could access User A's farm!"
    print_success("IDOR prevented: User B cannot access User A's farm")

    # 8. Test Safe Delete (No cascade)
    print_header("8. Test Safe Delete")
    # Try deleting farm with fields
    res = requests.delete(f"{BASE_URL}/farms/{farm_id}", headers=headers)
    assert res.status_code == 400, "Should not allow deleting farm with fields"
    
    # Try deleting field with crops
    res = requests.delete(f"{BASE_URL}/fields/{field_id}", headers=headers)
    assert res.status_code == 400, "Should not allow deleting field with crops"
    
    # Manually delete bottom up
    res = requests.delete(f"{BASE_URL}/crops/{crop_id}", headers=headers)
    assert res.status_code == 204, "Failed to delete crop"
    
    res = requests.delete(f"{BASE_URL}/fields/{field_id}", headers=headers)
    assert res.status_code == 204, "Failed to delete field after crop was deleted"
    
    res = requests.delete(f"{BASE_URL}/farms/{farm_id}", headers=headers)
    assert res.status_code == 204, "Failed to delete farm after fields were deleted"
    
    print_success("Safe delete successful! Prevented deletion with children, and manually deleted bottom-up.")

    print("\n\033[92mALL TESTS PASSED SUCCESSFULLY!\033[0m")

if __name__ == "__main__":
    run_tests()
