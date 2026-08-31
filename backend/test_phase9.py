import requests
import json
import time
import os
import pymongo

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "farmflow")
API_URL = "http://localhost:8000"

def clear_db():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]
    db.users.delete_many({})
    db.farms.delete_many({})
    db.fields.delete_many({})
    db.crops.delete_many({})
    db.livestock.delete_many({})
    db.vaccinations.delete_many({})
    db.notifications.delete_many({})
    db.expenses.delete_many({})
    db.incomes.delete_many({})

def run_test():
    clear_db()
    try:
        print("\n==================================================")
        print("FARMFLOW PHASE 9 NOTIFICATIONS & REPORTS TESTS")
        print("==================================================")
        
        # 1. Register User & Auth
        res = requests.post(f"{API_URL}/api/auth/register", json={
            "email": "report_user@test.com", "password": "password123", "name": "Report Tester", "role": "farmer"
        })
        assert res.status_code == 201
        
        res = requests.post(f"{API_URL}/api/auth/login", data={
            "username": "report_user@test.com", "password": "password123"
        })
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
            
        print("\n[PASS] User Registered and Authenticated")

        # 2. Setup Data
        # Farm
        res = requests.post(f"{API_URL}/api/farms/", headers=headers, json={
            "name": "Report Farm", "location": "Test Area", "total_area": 100, "area_unit": "Acres"
        })
        farm_id = res.json()["_id"]
        
        # Field
        res = requests.post(f"{API_URL}/api/fields/", headers=headers, json={
            "farm_id": farm_id, "name": "Report Field", "area": 50, "soil_type": "Clay"
        })
        field_id = res.json()["_id"]
        
        # Growing Crop (Nearing harvest)
        now = time.time()
        harvest_date = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now + (2*86400))) # 2 days from now
        
        res = requests.post(f"{API_URL}/api/crops/", headers=headers, json={
            "farm_id": farm_id, "field_id": field_id, "name": "Test Corn", "crop_type": "Corn", "variety": "Sweet",
            "planting_date": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now - (90*86400))),
            "expected_harvest_date": harvest_date,
            "status": "Growing", "expected_yield": 1000, "yield_unit": "kg"
        })
        
        # Expenses and Incomes
        requests.post(f"{API_URL}/api/expenses/", headers=headers, json={
            "farm_id": farm_id, "amount": 5000, "category": "Fertilizer", "expense_date": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now - 86400))
        })
        requests.post(f"{API_URL}/api/income/", headers=headers, json={
            "farm_id": farm_id, "amount": 12000, "source": "Crop Sales", "income_date": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now))
        })

        print("[PASS] Foundation Data Seeded")

        # 3. Test Notifications
        # Fetching notifications should trigger the sync for the crop we just created
        res = requests.get(f"{API_URL}/api/notifications/", headers=headers)
        assert res.status_code == 200
        notifs = res.json()
        assert len(notifs) >= 1, "Should have generated a harvest notification"
        
        notif_id = notifs[0]["_id"]
        assert notifs[0]["is_read"] == False
        
        # Mark as read
        res = requests.patch(f"{API_URL}/api/notifications/{notif_id}/read", headers=headers)
        assert res.status_code == 200
        assert res.json()["is_read"] == True
        
        # Unread count
        res = requests.get(f"{API_URL}/api/notifications/unread-count", headers=headers)
        assert res.json()["count"] == 0

        print("[PASS] Notification Sync and Read API Verified")

        # 4. Test Reports (Preview)
        # Financial Preview
        res = requests.get(f"{API_URL}/api/reports/financial/preview?farm_id={farm_id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total_income"] == 12000
        assert data["total_expenses"] == 5000
        assert data["net_profit"] == 7000
        
        # Farm Preview
        res = requests.get(f"{API_URL}/api/reports/farm/{farm_id}/preview", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["farm_name"] == "Report Farm"
        assert data["field_count"] == 1
        assert data["active_crops"] == 1
            
        print("[PASS] Report Aggregation JSON API Verified")
        
        # 5. Test Export Streams
        # Financial PDF
        res = requests.get(f"{API_URL}/api/reports/financial/pdf", headers=headers)
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert len(res.content) > 100 # Verify actual PDF content was streamed
        
        # Financial CSV
        res = requests.get(f"{API_URL}/api/reports/financial/csv", headers=headers)
        assert res.status_code == 200
        assert res.headers["content-type"] == "text/csv; charset=utf-8"
        assert len(res.text) > 10 # Verify CSV content
            
        print("[PASS] PDF and CSV Export Streams Verified")

        print("\nALL PHASE 9 TESTS PASSED SUCCESSFULLY!")
    finally:
        clear_db()

if __name__ == "__main__":
    run_test()
