from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..auth.jwt import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        user_id = int(payload.get("sub"))
        return user_id

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid access token")