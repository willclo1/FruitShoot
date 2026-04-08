import os
import hmac
import hashlib
from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/admin-auth", tags=["admin-auth"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
ADMIN_SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "")

COOKIE_NAME = "fruitshoot_admin"

class AdminLoginRequest(BaseModel):
    password: str

def _sign_value(value: str) -> str:
    sig = hmac.new(
        ADMIN_SESSION_SECRET.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{value}.{sig}"

def _verify_signed_value(signed_value: str) -> bool:
    try:
        value, sig = signed_value.rsplit(".", 1)
    except ValueError:
        return False

    expected_sig = hmac.new(
        ADMIN_SESSION_SECRET.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(sig, expected_sig) and value == "admin"

def require_admin(request: Request):
    cookie = request.cookies.get(COOKIE_NAME)
    if not cookie or not _verify_signed_value(cookie):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    return True

@router.post("/login")
def admin_login(body: AdminLoginRequest, response: Response):
    if not ADMIN_PASSWORD or not ADMIN_SESSION_SECRET:
        raise HTTPException(status_code=500, detail="Admin auth is not configured")

    if not hmac.compare_digest(body.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Invalid admin password")

    signed_cookie = _sign_value("admin")

    response.set_cookie(
        key=COOKIE_NAME,
        value=signed_cookie,
        httponly=True,
        samesite="lax",
        secure=False,  
        max_age=60 * 60 * 8, 
    )

    return {"ok": True}

@router.post("/logout")
def admin_logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}

@router.get("/check")
def admin_check(_: bool = Depends(require_admin)):
    return {"ok": True}