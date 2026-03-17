from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from database.connect import get_db
from typing import List
from models.recipes import Recipe
from models.saved_recipes import SavedRecipe
from datetime import datetime
from auth.deps import get_current_user

router = APIRouter(prefix="/recipes", tags=["recipes"])


class RecipeSuggestionRequest(BaseModel):
    fruit: str
    ripeness: str
    fruit_confidence: float = 1.0
    ripeness_confidence: float = 1.0
    limit: int = 5

class PublicRecipeResponse(BaseModel):
    id: int
    user_id: int
    title: str
    ingredients_description: str
    instructions_description: str
    created_at: datetime
    is_saved: bool
    save_count: int

    class Config:
        from_attributes = True

class RecipeSuggestionItem(BaseModel):
    id: int
    title: str
    ingredients_description: str
    instructions_description: str
    created_at: datetime
    score: float
    reason: str


class RecipeSuggestionResponse(BaseModel):
    fruit: str
    ripeness: str
    suggestions: List[RecipeSuggestionItem]


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


class ExploreRecipeResponse(BaseModel):
    id: int
    user_id: int
    title: str
    ingredients_description: str
    instructions_description: str
    created_at: datetime
    is_saved: bool
    save_count: int

    class Config:
        from_attributes = True


class SaveRecipeResponse(BaseModel):
    recipe_id: int
    is_saved: bool




@router.post("/", status_code=201, response_model=RecipeResponse)
def create_recipe(
    recipe: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
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


def score_recipe(recipe: Recipe, fruit: str, ripeness: str):
    text = f"{recipe.title} {recipe.ingredients_description} {recipe.instructions_description}".lower()

    fruit = fruit.lower()
    ripeness = ripeness.lower()

    score = 0
    reason_parts = []
    fruit_matched = False

    if fruit in recipe.ingredients_description.lower():
        score += 50
        fruit_matched = True
        reason_parts.append(f"Uses {fruit}")
    elif fruit in recipe.title.lower():
        score += 30
        fruit_matched = True
        reason_parts.append(f"Features {fruit}")

    if fruit_matched:
        if "over" in ripeness and any(k in text for k in ["bread", "bake", "cake", "muffin", "smoothie"]):
            score += 30
            reason_parts.append("Best for overripe fruit")
        elif "ripe" in ripeness and any(k in text for k in ["fresh", "salad", "bowl", "smoothie"]):
            score += 20
            reason_parts.append("Good for ripe fruit")
        elif "under" in ripeness and any(k in text for k in ["cook", "roast", "fry"]):
            score += 20
            reason_parts.append("Better when cooked")

    reason = " · ".join(reason_parts) if reason_parts else "Possible match"
    return score, reason


@router.post("/suggestions", response_model=RecipeSuggestionResponse)
def suggest_recipes(
    payload: RecipeSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    recipes = db.execute(
        select(Recipe)
        .where(Recipe.user_id == current_user)
        .order_by(Recipe.created_at.desc())
    ).scalars().all()

    scored = []
    for r in recipes:
        score, reason = score_recipe(r, payload.fruit, payload.ripeness)

        if score > 0:
            scored.append(
                RecipeSuggestionItem(
                    id=r.id,
                    title=r.title,
                    ingredients_description=r.ingredients_description,
                    instructions_description=r.instructions_description,
                    created_at=r.created_at,
                    score=score,
                    reason=reason,
                )
            )

    scored.sort(key=lambda x: x.score, reverse=True)

    return RecipeSuggestionResponse(
        fruit=payload.fruit,
        ripeness=payload.ripeness,
        suggestions=scored[: payload.limit],
    )


@router.get("/explore", response_model=List[ExploreRecipeResponse])
def explore_recipes(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    recipes = db.execute(
        select(Recipe)
        .where(Recipe.user_id != current_user)
        .order_by(Recipe.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    results = []
    for recipe in recipes:
        is_saved = db.execute(
            select(SavedRecipe).where(
                SavedRecipe.user_id == current_user,
                SavedRecipe.recipe_id == recipe.id,
            )
        ).scalar_one_or_none() is not None

        save_count = db.execute(
            select(func.count(SavedRecipe.id)).where(SavedRecipe.recipe_id == recipe.id)
        ).scalar_one()

        results.append(
            ExploreRecipeResponse(
                id=recipe.id,
                user_id=recipe.user_id,
                title=recipe.title,
                ingredients_description=recipe.ingredients_description,
                instructions_description=recipe.instructions_description,
                created_at=recipe.created_at,
                is_saved=is_saved,
                save_count=save_count,
            )
        )

    return results


@router.get("/saved", response_model=List[ExploreRecipeResponse])
def get_saved_recipes(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    saved_rows = db.execute(
        select(SavedRecipe)
        .where(SavedRecipe.user_id == current_user)
        .order_by(SavedRecipe.created_at.desc())
    ).scalars().all()

    results = []
    for saved in saved_rows:
        recipe = db.execute(
            select(Recipe).where(Recipe.id == saved.recipe_id)
        ).scalar_one_or_none()

        if not recipe:
            continue

        save_count = db.execute(
            select(func.count(SavedRecipe.id)).where(SavedRecipe.recipe_id == recipe.id)
        ).scalar_one()

        results.append(
            ExploreRecipeResponse(
                id=recipe.id,
                user_id=recipe.user_id,
                title=recipe.title,
                ingredients_description=recipe.ingredients_description,
                instructions_description=recipe.instructions_description,
                created_at=recipe.created_at,
                is_saved=True,
                save_count=save_count,
            )
        )

    return results

class PublicRecipeResponse(BaseModel):
    id: int
    user_id: int
    title: str
    ingredients_description: str
    instructions_description: str
    created_at: datetime
    is_saved: bool
    save_count: int

    class Config:
        from_attributes = True




@router.post("/{recipe_id}/save", response_model=SaveRecipeResponse)
def save_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe.user_id == current_user:
        raise HTTPException(status_code=400, detail="You cannot save your own recipe")

    existing = db.execute(
        select(SavedRecipe).where(
            SavedRecipe.user_id == current_user,
            SavedRecipe.recipe_id == recipe_id,
        )
    ).scalar_one_or_none()

    if existing:
        return SaveRecipeResponse(recipe_id=recipe_id, is_saved=True)

    saved = SavedRecipe(user_id=current_user, recipe_id=recipe_id)
    db.add(saved)
    db.commit()

    return SaveRecipeResponse(recipe_id=recipe_id, is_saved=True)


@router.delete("/{recipe_id}/save", response_model=SaveRecipeResponse)
def unsave_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    saved = db.execute(
        select(SavedRecipe).where(
            SavedRecipe.user_id == current_user,
            SavedRecipe.recipe_id == recipe_id,
        )
    ).scalar_one_or_none()

    if not saved:
        return SaveRecipeResponse(recipe_id=recipe_id, is_saved=False)

    db.delete(saved)
    db.commit()

    return SaveRecipeResponse(recipe_id=recipe_id, is_saved=False)

@router.get("/public/{recipe_id}", response_model=PublicRecipeResponse)
def get_public_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    is_saved = db.execute(
        select(SavedRecipe).where(
            SavedRecipe.user_id == current_user,
            SavedRecipe.recipe_id == recipe.id,
        )
    ).scalar_one_or_none() is not None

    save_count = db.execute(
        select(func.count(SavedRecipe.id)).where(SavedRecipe.recipe_id == recipe.id)
    ).scalar_one()

    return PublicRecipeResponse(
        id=recipe.id,
        user_id=recipe.user_id,
        title=recipe.title,
        ingredients_description=recipe.ingredients_description,
        instructions_description=recipe.instructions_description,
        created_at=recipe.created_at,
        is_saved=is_saved,
        save_count=save_count,
    )


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
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
    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")

    db.delete(recipe)
    db.commit()

