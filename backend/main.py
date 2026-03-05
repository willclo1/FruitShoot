from auth.deps import get_current_user
from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, Depends, Form, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI

from routers.clip import router as clip_router
from recipe.clipper import init_browser, shutdown_browser

from routers import userRoutes, recipeRoutes
from models.users import Base, User
from models.images import UserImage
from models.recipes import Recipe
from database.connect import engine, get_db

from ml.model import get_model
from ml.download import ensure_model
from ml.predict import predict_image_path


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(">>> lifespan start (process boot)")
    await init_browser()

    print("Installing model")
    ensure_model()


    get_model()
    print("Model installed")

    yield

    print(">>> lifespan shutdown")
    await shutdown_browser()


app = FastAPI(title="FruitShoot API", lifespan=lifespan)
Base.metadata.create_all(bind=engine)

app.include_router(userRoutes.router)
app.include_router(clip_router) 
app.include_router(recipeRoutes.router)

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
IMAGE_DIR = ROOT_DIR / "database" / "data" / "images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=IMAGE_DIR), name="uploads")


@app.get("/hello")
def hello():
    return {"message": "Hello, FruitShoot!"}

@app.post("/images/upload")
def upload_image(
    user_id: int = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = IMAGE_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image = UserImage(
        user_id=user_id,
        description=description,
        location=filename,
    )

    db.add(image)
    db.commit()
    db.refresh(image)

    model = get_model()
    pred = predict_image_path(model, str(file_path))

    return {
        "id": image.id,
        "filename": image.location,
        "url": f"/uploads/{image.location}",
        "uploaded_at": image.uploaded_at,
        "prediction": pred,
    }

@app.post("/user/profile/upload")
def upload_image(
    user_id: int = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")


    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = IMAGE_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image = UserImage(
        user_id=user_id,
        description=description,
        location=filename,
    )

    db.add(image)
    db.commit()
    db.refresh(image)

    user.profile_id = image.id
    db.commit()
    db.refresh(user)

    return {
        "id": image.id,
        "filename": image.location,
        "url": f"/uploads/{image.location}",
        "uploaded_at": image.uploaded_at,
    }



@app.get("/me/avatar/url")
def get_avatar_url(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.profile_id:
        raise HTTPException(status_code=404, detail="No avatar set")

    img = db.query(UserImage).filter(UserImage.id == user.profile_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Avatar record missing")

    return {
        "url": f"/uploads/{img.location}"
    }