from dotenv import load_dotenv
load_dotenv()  # make sure env is loaded first

import os
import uuid
from fastapi import FastAPI, Depends, Form, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from .routers import userRoutes
from .models.users import Base, User
from .models.images import UserImage

from .database.connect import engine, get_db

app = FastAPI(title="FruitShoot API")
Base.metadata.create_all(bind=engine)

@app.get("/hello")
def hello():
    return {"message": "Hello, FruitShoot!"}

app.include_router(userRoutes.router)

@app.post("/images/upload")
def upload_image(user_id: int = Form(...), description: str = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    IMAGE_DIR = "database/data/images"
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(IMAGE_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    image = UserImage(
        user_id=user_id,
        description=description,
        location=filename,
    )

    db.add(image)
    db.commit()
    db.refresh(image)

    return {
        "id": image.id,
        "filename": image.location,
        "uploaded_at": image.uploaded_at,
    }


