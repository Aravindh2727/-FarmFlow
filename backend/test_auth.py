import requests

BASE_URL = "http://localhost:8000/api"

def test_auth_flow():
    print("Running Tests...\n")
    
    # User info
    email = "farmer@test.com"
    password = "TestPassword123"
    name = "Demo Farmer"
    
    print(f"Test 1 - Registration: {email}")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    
    # If already exists, we might get 400. Let's handle it gracefully for the script.
    if res.status_code == 200:
        print("Registration Successful:", res.json())
    else:
        print(f"Registration returned {res.status_code}: {res.json()}")
        
    print(f"\nTest 2 - Duplicate Registration: {email}")
    res_dup = requests.post(f"{BASE_URL}/auth/register", json={
        "name": name,
        "email": email,
        "password": password
    })
    print(f"Duplicate Registration returned {res_dup.status_code}: {res_dup.json()}")
    
    print(f"\nTest 3 - Login: {email}")
    res_login = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if res_login.status_code == 200:
        token = res_login.json().get("access_token")
        print("Login Successful, Token received.")
    else:
        print(f"Login returned {res_login.status_code}: {res_login.json()}")
        return

    print(f"\nTest 4 - Invalid Login: {email}")
    res_inv_login = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": "WrongPassword123"
    })
    print(f"Invalid Login returned {res_inv_login.status_code}: {res_inv_login.json()}")

    print(f"\nTest 5 - Protected API Without JWT")
    res_no_jwt = requests.get(f"{BASE_URL}/auth/me")
    print(f"Protected API (No JWT) returned {res_no_jwt.status_code}: {res_no_jwt.json()}")

    print(f"\nTest 6 - Protected API With JWT")
    res_with_jwt = requests.get(f"{BASE_URL}/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    print(f"Protected API (With JWT) returned {res_with_jwt.status_code}: {res_with_jwt.json()}")

    print("\nTests complete!")

if __name__ == "__main__":
    test_auth_flow()
