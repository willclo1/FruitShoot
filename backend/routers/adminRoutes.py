from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from database.connect import get_db
from typing import List, Optional
from models.users import User
from models.recipes import Recipe
from models.images import UserImage
from datetime import datetime
from auth.deps import get_current_user
from routers.adminAuth import require_admin

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get('/users')
def get_users(db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    return {"users": [{"id": user.id, "username": user.username, "email": user.email} for user in users]}


@router.get('/user/{user_id}/images')
def get_user_images(user_id:int, db: Session = Depends(get_db)):
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

@router.get('/user/{user_id}/recipes')
def get_user_recipes(user_id:int, db: Session = Depends(get_db)):
    recipes = db.execute(
        select(Recipe).where(Recipe.user_id == user_id).order_by(Recipe.created_at.desc())
    ).scalars().all()

    return recipes

@router.delete('/delete/{user_id}')
def delete_user(user_id:int, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(User.id == user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    

@router.delete('/delete/image/{image_id}')
def delete_image(image_id:int, db: Session = Depends(get_db)):
    image = db.execute(
        select(UserImage).where(UserImage.id == image_id)
    ).scalar_one_or_none()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    db.delete(image)
    db.commit()

@router.delete('/delete/recipe/{recipe_id}')
def delete_recipe(recipe_id:int, db: Session = Depends(get_db)):
    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(recipe)
    db.commit()

    