import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from auth.deps import get_current_user
from dotenv import load_dotenv
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import shutil
from PIL import Image
from pillow_heif import register_heif_opener
from pathlib import Path

from fastapi import FastAPI, Depends, Form, UploadFile, File, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI

from routers.clip import router as clip_router
from routers.adminRoutes import router as admin_router
from recipe.clipper import init_browser, shutdown_browser
from routers.retraining import router as retraining_router

from routers import userRoutes, recipeRoutes
from models.users import Base, User
from routers.adminAuth import router as admin_auth_router

from models.images import UserImage
from models.recipes import Recipe
from database.connect import engine, get_db

from ml.model import get_model
from ml.download import ensure_model
from ml.predict import predict_image_path

register_heif_opener()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_browser()

    print("Installing model")
    ensure_model()


    get_model()
    print("Model installed")

    yield

    await shutdown_browser()


app = FastAPI(title="FruitShoot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Keep 422 semantics, but surface actionable field-level errors in server logs.
    errors = exc.errors()
    print(f"422 validation error on {request.method} {request.url.path}: {errors}")
    return JSONResponse(status_code=422, content={"detail": errors})

app.include_router(userRoutes.router)
app.include_router(clip_router) 
app.include_router(recipeRoutes.router)
app.include_router(retraining_router)
app.include_router(admin_router)
app.include_router(admin_auth_router)

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

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = IMAGE_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Convert HEIC/HEIF to JPG directly here
    if file_path.suffix.lower() in [".heic", ".heif"]:
        img = Image.open(file_path).convert("RGB")

        new_filename = f"{uuid.uuid4()}.jpg"
        new_path = IMAGE_DIR / new_filename

        img.save(new_path, format="JPEG", quality=92)

        try:
            file_path.unlink()
        except Exception:
            pass

        file_path = new_path
        filename = new_filename

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

@app.get("/images")
def get_images(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    imgs = (
        db.query(UserImage)
        .filter(UserImage.user_id == user.id)
        .order_by(UserImage.uploaded_at.desc())
        .all()
    )

    if not imgs:
        raise HTTPException(status_code=404, detail="No images found for user")

    return [
        {
            "id": img.id,
            "filename": img.location,
            "url": f"/uploads/{img.location}",
            "uploaded_at": img.uploaded_at,
        }
        for img in imgs
    ]