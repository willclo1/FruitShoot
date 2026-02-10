from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import bcrypt
from pydantic import BaseModel, EmailStr, Field
from database.connect import get_db
from models.users import User

router = APIRouter(prefix="/users", tags=["users"])


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)


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

    return {"message": "Login successful", "user_id": existing_user.id}