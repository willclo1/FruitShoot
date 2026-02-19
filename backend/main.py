from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, Depends, Form, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from routers import userRoutes
from models.users import Base, User
from models.images import UserImage
from database.connect import engine, get_db

from ml.model import get_model
from ml.download import ensure_model
from ml.predict import predict_image

app = FastAPI(title="FruitShoot API")
Base.metadata.create_all(bind=engine)

app.include_router(userRoutes.router)

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
IMAGE_DIR = ROOT_DIR / "database" / "data" / "images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=IMAGE_DIR), name="uploads")

@app.on_event("startup")
def _startup():
    ensure_model()
    get_model()

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
    pred = predict_image(model, str(file_path))

    return {
        "id": image.id,
        "filename": image.location,
        "url": f"/uploads/{image.location}",
        "uploaded_at": image.uploaded_at,
        "prediction": pred,
    }