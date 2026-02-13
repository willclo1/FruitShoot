from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import bcrypt
from pydantic import BaseModel, EmailStr, Field
from database.connect import get_db
from models.users import User
from jose import jwt, JWTError
from auth.jwt import SECRET_KEY, ALGORITHM
from auth.deps import get_current_user
from auth.jwt import create_access_token, create_refresh_token


router = APIRouter(prefix="/users", tags=["users"])


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", status_code=201)
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    existing_email = db.execute(select(User).where(User.email == user.email)).scalar_one_or_none()
    existing_username = db.execute(select(User).where(User.username == user.username)).scalar_one_or_none()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = bcrypt.hashpw(
        user.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    new_user = User(email=user.email, username=user.username, password_hash=password_hash)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully", "user_id": new_user.id}

@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.execute(select(User).where(User.email == user.email)).scalar_one_or_none()
    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    password_bytes = user.password.encode('utf-8')
    stored_hash_bytes = existing_user.password_hash.encode('utf-8')

    if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(existing_user.id)
    refresh_token = create_refresh_token(existing_user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": existing_user.id
    }


@router.post("/refresh")
def refresh_token(data: RefreshRequest):
    try:
        payload = jwt.decode(data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = int(payload.get("sub"))

        new_access = create_access_token(user_id)
        new_refresh = create_refresh_token(user_id)

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer"
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.get("/me")
def me(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }