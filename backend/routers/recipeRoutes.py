from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, Field
from database.connect import get_db
from models.recipes import Recipe
from datetime import datetime
from auth.deps import get_current_user

router = APIRouter(prefix="/recipes", tags=["recipes"])


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    ingredients_description: str = Field(min_length=1)
    instructions_description: str = Field(min_length=1)


class RecipeResponse(BaseModel):
    id: int
    user_id: int
    title: str
    ingredients_description: str
    instructions_description: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/", status_code=201, response_model=RecipeResponse)
def create_recipe(
    recipe: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Create a new recipe for the current user"""
    new_recipe = Recipe(
        user_id=current_user,
        title=recipe.title,
        ingredients_description=recipe.ingredients_description,
        instructions_description=recipe.instructions_description,
    )
    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    return new_recipe


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Get a specific recipe by ID"""
    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to view this recipe")

    return recipe


@router.get("/")
def get_user_recipes(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Get all recipes for the current user"""
    recipes = db.execute(
        select(Recipe).where(Recipe.user_id == current_user).order_by(Recipe.created_at.desc())
    ).scalars().all()

    return recipes


@router.put("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    recipe: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Update an existing recipe"""
    existing_recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not existing_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if existing_recipe.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to update this recipe")

    existing_recipe.title = recipe.title
    existing_recipe.ingredients_description = recipe.ingredients_description
    existing_recipe.instructions_description = recipe.instructions_description
    db.commit()
    db.refresh(existing_recipe)
    return existing_recipe


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    """Delete a recipe"""
    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")

    db.delete(recipe)
    db.commit()
