from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, AnyHttpUrl
from sqlalchemy.orm import Session

from recipe.clipper import clip_recipe, ClipTimeout
from database.connect  import get_db  
from auth.deps import get_current_user 
from models.recipes import Recipe

router = APIRouter(prefix="/clip", tags=["clip"])


class ClipRequest(BaseModel):
    url: AnyHttpUrl
    ml_disable: bool = True
    ml_classify_endpoint: str | None = None


def _as_lines(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        return [line.strip() for line in value.splitlines() if line.strip()]
    return [str(value).strip()]


def normalize_recipeclipper_output(rc: dict) -> tuple[str, str, str]:
    title = (rc.get("title") or rc.get("name") or "Untitled Recipe").strip()

    ingredients = _as_lines(rc.get("ingredients") or rc.get("ingredientList"))
    instructions = _as_lines(rc.get("instructions") or rc.get("steps") or rc.get("directions"))

    ingredients_description = "\n".join(f"- {x}" for x in ingredients) if ingredients else ""
    instructions_description = "\n".join(f"{i+1}. {x}" for i, x in enumerate(instructions)) if instructions else ""

    if not ingredients_description or not instructions_description:
        raise ValueError("Could not extract ingredients/instructions from this page.")

    return title, ingredients_description, instructions_description


@router.post("/")
async def clip(req: ClipRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        raw = await clip_recipe(
            str(req.url),
            ml_disable=req.ml_disable,
            ml_classify_endpoint=req.ml_classify_endpoint,
        )

        title, ingredients_description, instructions_description = normalize_recipeclipper_output(raw)

        recipe_row = Recipe(
            user_id=user, 
            title=title,
            ingredients_description=ingredients_description,
            instructions_description=instructions_description,
        )

        db.add(recipe_row)
        db.commit()
        db.refresh(recipe_row)

        return {
            "ok": True,
            "recipe": {
                "id": recipe_row.id,
                "title": recipe_row.title,
                "ingredients_description": recipe_row.ingredients_description,
                "instructions_description": recipe_row.instructions_description,
            },
        }

    except ClipTimeout:
        raise HTTPException(status_code=504, detail="Timed out loading or extracting recipe.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clip failed: {e}")