import re
import unicodedata

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, AnyHttpUrl

from recipe.clipper import clip_recipe, ClipTimeout
from auth.deps import get_current_user

router = APIRouter(prefix="/clip", tags=["clip"])


class ClipRequest(BaseModel):
    url: AnyHttpUrl
    ml_disable: bool = True
    ml_classify_endpoint: str | None = None


# -----------------------------
# Normalization helpers
# -----------------------------

def remove_accents(text: str) -> str:
    """
    Convert accented characters to ASCII equivalents.
    crème brûlée -> creme brulee
    jalapeño -> jalapeno
    """
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def clean_line(text: str) -> str:
    """
    Logical normalization for recipe lines:
    - trim
    - remove leading bullets (-, •, *, en/em dashes)
    - remove accents
    - normalize whitespace
    """
    if not text:
        return ""

    text = str(text).strip()

    # Remove common leading bullet characters and extra spaces
    text = re.sub(r"^[\-\*\•\–\—\s]+", "", text)

    # Remove accents
    text = remove_accents(text)

    # Normalize whitespace (tabs, multiple spaces)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def _as_lines(value) -> list[str]:
    """
    Convert a value (list/str/other) into a list of normalized, non-empty lines.
    """
    if value is None:
        return []

    if isinstance(value, list):
        raw_lines = [str(x) for x in value]
    elif isinstance(value, str):
        raw_lines = value.splitlines()
    else:
        raw_lines = [str(value)]

    out: list[str] = []
    for line in raw_lines:
        cleaned = clean_line(line)
        if cleaned:
            out.append(cleaned)
    return out


def normalize_recipeclipper_output(rc: dict) -> tuple[str, str, str]:
    """
    Returns (title, ingredients_description, instructions_description) normalized for your app.

    - Ingredients: one per line, no leading "-"
    - Instructions: numbered lines (1., 2., 3., ...)
    - All text: accents removed, whitespace normalized
    """
    title = clean_line(rc.get("title") or rc.get("name") or "Untitled Recipe")

    ingredients = _as_lines(rc.get("ingredients") or rc.get("ingredientList"))
    instructions = _as_lines(rc.get("instructions") or rc.get("steps") or rc.get("directions"))

    ingredients_description = "\n".join(ingredients) if ingredients else ""
    instructions_description = (
        "\n".join(f"{i+1}. {step}" for i, step in enumerate(instructions))
        if instructions else ""
    )

    if not ingredients_description or not instructions_description:
        raise ValueError("Could not extract ingredients/instructions from this page.")

    return title, ingredients_description, instructions_description


# -----------------------------
# Route
# -----------------------------

@router.post("/")
async def clip(req: ClipRequest, user_id: int = Depends(get_current_user)):
    """
    Authenticated scrape-only endpoint:
    - scrapes recipe from URL
    - returns normalized fields
    - does NOT write to database
    """
    try:
        raw = await clip_recipe(
            str(req.url),
            ml_disable=req.ml_disable,
            ml_classify_endpoint=req.ml_classify_endpoint,
        )

        title, ingredients_description, instructions_description = normalize_recipeclipper_output(raw)

        return {
            "ok": True,
            "recipe": {
                "title": title,
                "ingredients_description": ingredients_description,
                "instructions_description": instructions_description,
            },
            # Uncomment to debug what the scraper returned:
            # "raw": raw,
        }

    except ClipTimeout:
        raise HTTPException(status_code=504, detail="Timed out loading or extracting recipe.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clip failed: {e}")