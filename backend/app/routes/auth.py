from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, Token, UserInDB, GoogleAuthRequest
from app.core import database
from app.core.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate):
    # Check if user exists
    user = await database.db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    user_dict = user_in.model_dump(exclude={"password"})
    user_dict["role"] = "farmer" # Enforce farmer role for public registration
    
    user_db = UserInDB(
        **user_dict,
        hashed_password=get_password_hash(user_in.password)
    )
    
    result = await database.db.users.insert_one(user_db.model_dump(by_alias=True))
    created_user = await database.db.users.find_one({"_id": result.inserted_id})
    return created_user

@router.post("/login", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await database.db.users.find_one({"email": form_data.username})
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.get("hashed_password") or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user["email"], expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.post("/google", response_model=Token)
async def google_auth(google_in: GoogleAuthRequest):
    user = await database.db.users.find_one({"email": google_in.email})
    now = datetime.now(timezone.utc)
    
    if not user:
        user_name = google_in.name if google_in.name else google_in.email.split("@")[0]
        user_doc = {
            "email": google_in.email,
            "name": user_name,
            "role": "farmer",
            "hashed_password": None,
            "google_id": google_in.google_id,
            "photo_url": google_in.photo_url,
            "created_at": now,
            "updated_at": now
        }
        result = await database.db.users.insert_one(user_doc)
        user = await database.db.users.find_one({"_id": result.inserted_id})
    else:
        update_fields = {"updated_at": now}
        if google_in.name and not user.get("name"):
            update_fields["name"] = google_in.name
        if google_in.google_id:
            update_fields["google_id"] = google_in.google_id
        if google_in.photo_url:
            update_fields["photo_url"] = google_in.photo_url
        await database.db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})
        user = await database.db.users.find_one({"_id": user["_id"]})

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user["email"], expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user
