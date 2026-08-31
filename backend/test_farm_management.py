import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_farm_management():
    print("\nRunning Farm Management Tests...\n")
    
    # 1. Login to get token
    login_data = {
        "username": "farmer@test.com",
        "password": "TestPassword123"
    }
    res = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    if res.status_code != 200:
        print(f"Failed to login. Please ensure farmer@test.com exists. {res.json()}")
        return
    
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login Successful, Token received.")
    
    # 2. Create Farm
    farm_data = {
        "name": "Test Farm",
        "location": "Springfield",
        "area": 100.5
    }
    res = requests.post(f"{BASE_URL}/api/farms/", json=farm_data, headers=headers)
    if res.status_code != 201:
        print(f"Failed to create farm: {res.json()}")
        return
    
    farm = res.json()
    print(f"Farm created: {farm['name']} (ID: {farm['_id']})")
    
    # 3. Create Field
    field_data = {
        "name": "North Field",
        "area": 25.0,
        "soil_type": "Clay"
    }
    res = requests.post(f"{BASE_URL}/api/fields/farm/{farm['_id']}/fields", json=field_data, headers=headers)
    if res.status_code != 201:
        print(f"Failed to create field: {res.json()}")
        return
    
    field = res.json()
    print(f"Field created: {field['name']} (ID: {field['_id']})")
    
    # 4. Create Crop
    crop_data = {
        "name": "Corn",
        "variety": "Sweet",
        "status": "planned"
    }
    res = requests.post(f"{BASE_URL}/api/crops/field/{field['_id']}/crops", json=crop_data, headers=headers)
    if res.status_code != 201:
        print(f"Failed to create crop: {res.json()}")
        return
    
    crop = res.json()
    print(f"Crop created: {crop['name']} (ID: {crop['_id']})")
    
    # 5. Get Field Crops
    res = requests.get(f"{BASE_URL}/api/crops/field/{field['_id']}/crops", headers=headers)
    crops = res.json()
    print(f"Crops in field: {len(crops)}")
    if len(crops) != 1:
        print("Error: Expected 1 crop")
        return
        
    # 6. Delete Farm (Cascade delete test)
    res = requests.delete(f"{BASE_URL}/api/farms/{farm['_id']}", headers=headers)
    if res.status_code != 204:
        print(f"Failed to delete farm: {res.status_code}")
        return
    
    print(f"Farm deleted successfully (cascading).")
    
    print("\nAll Tests Complete!")

if __name__ == "__main__":
    test_farm_management()
