from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from pydantic import BaseModel, Field
from database.connect import get_db
from typing import List, Optional
from models.recipes import Recipe
from models.saved_recipes import SavedRecipe
from models.users import User
from datetime import datetime
from auth.deps import get_current_user

router = APIRouter(prefix="/recipes", tags=["recipes"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class RecipeSuggestionRequest(BaseModel):
    fruit: str
    ripeness: str
    fruit_confidence: float = 1.0
    ripeness_confidence: float = 1.0
    fruit_probs: Optional[List[float]] = None
    ripeness_probs: Optional[List[float]] = None
    limit: int = 20  # ← default raised from 5


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


# ---------------------------------------------------------------------------
# SCORING ENGINE
# ---------------------------------------------------------------------------
#
# FRUIT_LABELS    = ["Apple", "Banana", "Strawberry", "Non-Fruit"]  # idx 0-3
# RIPENESS_LABELS = ["Ripe", "Rotten", "N/A", "Underripe"]          # idx 0-3
#
# For real fruits (f_idx < 3), predict.py masks index 2 (N/A) to -inf, so
# only three ripeness states are reachable: Ripe(0), Rotten(1), Underripe(3).
#
# Score breakdown (max ≈ 93):
#   ┌──────────────────────────────────────┬──────┐
#   │ Fruit keyword in ingredients list    │  50  │
#   │ Fruit keyword in title               │  30  │
#   │ Fruit keyword in instructions only   │  20  │
#   │ Secondary / flavour-pair keywords    │   3  │
#   │ Ripeness technique cluster (best)    │  35  │
#   │ Confidence bonus                     │  5–10│
#   │ Soft ripeness bonus (prob-weighted)  │   0–5│
#   └──────────────────────────────────────┴──────┘
#
# Label thresholds (calibrated to real distribution):
#   92+  → Excellent  (ingredients + perfect technique + flavour pairs)
#   88+  → Good       (ingredients + perfect technique)
#   65+  → Fair       (title + technique, or ingredients + weak technique)
#   <65  → Weak
#
# A recipe with no primary fruit keyword scores 0 and is excluded entirely.
# ---------------------------------------------------------------------------

FRUIT_PROFILE: dict[str, dict] = {
    "apple": {
        "primary": [
            "apple", "apples", "applesauce", "apple sauce",
            "apple cider", "apple juice", "cider",
        ],
        "secondary": [
            "cinnamon", "caramel", "walnut", "walnuts",
            "pecan", "pecans", "brown sugar", "clove",
            "nutmeg", "allspice", "maple",
        ],
    },
    "banana": {
        "primary": [
            "banana", "bananas", "plantain", "plantains",
        ],
        "secondary": [
            "peanut butter", "chocolate", "oat", "oats",
            "honey", "vanilla", "cinnamon", "rum", "coconut",
        ],
    },
    "strawberry": {
        "primary": [
            "strawberry", "strawberries", "strawberry jam",
            "strawberry sauce", "strawberry puree",
        ],
        "secondary": [
            "cream", "whipped cream", "shortcake", "vanilla",
            "lemon", "honey", "balsamic", "chocolate", "mint", "rhubarb",
        ],
    },
}

# RIPENESS_LABELS indices reachable for our fruits:
#   0 = Ripe  |  1 = Rotten  |  3 = Underripe
#
# Each cluster: (trigger_keywords, max_points, human_readable_reason)
# Only the highest-scoring cluster per recipe is used.
RIPENESS_TECHNIQUE_MAP: dict[str, dict[str, list[tuple[list[str], int, str]]]] = {
    "apple": {
        "ripe": [
            (
                [
                    "fresh", "raw", "slice", "sliced", "snack",
                    "salad", "dip", "yogurt", "parfait",
                    "smoothie", "juice", "bowl",
                ],
                35,
                "Ripe apples shine fresh or lightly dressed",
            ),
            (
                [
                    "pie", "tart", "galette", "bake", "baked",
                    "crumble", "crisp", "sauce", "compote",
                ],
                22,
                "Classic baking is also a great use",
            ),
        ],
        "underripe": [
            (
                [
                    "bake", "baked", "roast", "roasted", "poach", "poached",
                    "sauté", "sautéed", "caramelise", "caramelize",
                    "pie", "tart", "galette", "crumble", "crisp",
                    "compote", "sauce", "butter", "chutney",
                    "pickle", "pickled", "jam", "preserve",
                ],
                35,
                "Heat or pickling tames a tart underripe apple",
            ),
            (
                ["slaw", "coleslaw", "salad"],
                18,
                "The crisp texture works well raw in salads",
            ),
        ],
        "rotten": [
            (
                [
                    "smoothie", "blend", "blended", "juice",
                    "sauce", "applesauce", "apple sauce", "butter",
                    "jam", "jelly", "compote", "preserve",
                    "muffin", "muffins", "cake", "loaf", "bread",
                    "pancake", "pancakes", "waffle", "waffles",
                    "vinegar", "ferment", "fermented",
                ],
                35,
                "Oversoft apples are best blended, baked into batters, or preserved",
            ),
            (
                ["soup", "purée", "puree"],
                15,
                "Pureeing completely masks texture issues",
            ),
        ],
    },

    "banana": {
        "ripe": [
            (
                [
                    "smoothie", "shake", "bowl", "acai",
                    "yogurt", "parfait", "overnight oats",
                    "pancake", "pancakes", "waffle", "waffles",
                    "ice cream", "nice cream", "banana split",
                    "snack", "fresh", "slice", "sliced",
                    "cereal", "granola",
                ],
                35,
                "A ripe banana is perfect fresh, sliced, or blended",
            ),
            (
                [
                    "muffin", "muffins", "bread", "loaf",
                    "cookie", "cookies", "bar", "bars", "cake",
                ],
                20,
                "Still great for baking",
            ),
        ],
        "underripe": [
            (
                [
                    "fry", "fried", "deep fry", "deep fried",
                    "sauté", "sautéed", "roast", "roasted",
                    "grill", "grilled", "cook", "cooked", "bake", "baked",
                    "chip", "chips", "crispy",
                    "curry", "stew", "savoury", "savory",
                    "plantain", "tostones", "porridge", "oatmeal",
                ],
                35,
                "Starchy underripe bananas excel in cooked and savoury dishes",
            ),
            (
                ["smoothie", "overnight oats"],
                12,
                "Blending or soaking softens the starchiness",
            ),
        ],
        "rotten": [
            (
                [
                    "banana bread", "banana loaf", "bread", "loaf",
                    "muffin", "muffins", "cake", "cupcake", "cupcakes",
                    "pancake", "pancakes", "waffle", "waffles",
                    "cookie", "cookies", "brownie", "brownies",
                    "bar", "bars", "batter",
                ],
                35,
                "Overripe bananas are the secret ingredient in banana bread & bakes",
            ),
            (
                [
                    "smoothie", "blend", "blended", "ice cream",
                    "nice cream", "milkshake", "shake",
                    "sauce", "caramel", "pudding",
                ],
                20,
                "Blending hides texture while keeping the intense sweetness",
            ),
        ],
    },

    "strawberry": {
        "ripe": [
            (
                [
                    "fresh", "raw", "slice", "sliced",
                    "shortcake", "tart", "pavlova", "cheesecake",
                    "salad", "fruit salad", "bowl",
                    "yogurt", "parfait", "dip", "chocolate dip",
                    "smoothie", "shake", "juice", "lemonade",
                    "ice cream", "sorbet", "gelato",
                    "garnish", "topping", "sauce", "coulis",
                ],
                35,
                "Peak-ripe strawberries are best fresh or barely cooked",
            ),
            (
                ["jam", "jelly", "preserve", "compote"],
                18,
                "Also excellent in jams and preserves",
            ),
        ],
        "underripe": [
            (
                [
                    "macerate", "macerated", "pickle", "pickled",
                    "roast", "roasted", "bake", "baked",
                    "compote", "sauce", "coulis",
                    "jam", "jelly", "preserve",
                    "syrup", "shrub", "vinegar",
                    "sauté", "sautéed", "grill", "grilled",
                ],
                35,
                "Macerating or cooking coaxes sweetness from an underripe strawberry",
            ),
            (
                ["smoothie", "blend", "blended"],
                15,
                "Blending with sweetener compensates for low natural sugar",
            ),
        ],
        "rotten": [
            (
                [
                    "jam", "jelly", "preserve", "compote",
                    "sauce", "coulis", "syrup",
                    "smoothie", "blend", "blended",
                    "cake", "muffin", "muffins", "bread", "loaf",
                    "pancake", "pancakes",
                    "vinegar", "shrub", "sorbet", "ice cream",
                ],
                35,
                "Very ripe strawberries are perfect for jams, sauces, and blended dishes",
            ),
            (
                ["soup", "gazpacho"],
                12,
                "Works in chilled strawberry soups too",
            ),
        ],
    },
}

_FRUIT_ALIASES: dict[str, str] = {
    "apple":      "apple",
    "banana":     "banana",
    "strawberry": "strawberry",
}
_RIPENESS_ALIASES: dict[str, str] = {
    "ripe":      "ripe",
    "underripe": "underripe",
    "rotten":    "rotten",
    "n/a":       "ripe",
}


def _norm(value: str, alias_map: dict[str, str]) -> str:
    return alias_map.get(value.strip().lower(), value.strip().lower())


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(kw in text for kw in keywords)


def score_recipe(
    recipe: Recipe,
    fruit: str,
    ripeness: str,
    fruit_confidence: float = 1.0,
    ripeness_confidence: float = 1.0,
    ripeness_probs: Optional[List[float]] = None,
) -> tuple[float, str]:
    """
    Score a recipe against a detected fruit and ripeness state.
    Returns (score, reason) — score of 0 means exclude from results.

    Score anatomy:
      1. Fruit presence       0–50 pts  (ingredients > title > instructions)
      2. Flavour pairs        0–3  pts  (secondary keyword bonus)
      3. Ripeness technique   0–35 pts  (best matching cluster only)
      4. Confidence bonus     5–10 pts  (geometric mean; 5 flat for defaults)
      5. Soft ripeness bonus  0–5  pts  (neighbour states via prob vector)

    Label thresholds:
      92+  Excellent  |  88+  Good  |  65+  Fair  |  <65  Weak
    """
    fruit_key    = _norm(fruit, _FRUIT_ALIASES)
    ripeness_key = _norm(ripeness, _RIPENESS_ALIASES)

    profile = FRUIT_PROFILE.get(fruit_key)
    if profile is None:
        haystack = f"{recipe.title} {recipe.ingredients_description} {recipe.instructions_description}".lower()
        if fruit_key in haystack:
            return 30.0, f"Contains {fruit}"
        return 0.0, ""

    ingredients_text  = recipe.ingredients_description.lower()
    title_text        = recipe.title.lower()
    instructions_text = recipe.instructions_description.lower()
    full_text         = f"{title_text} {ingredients_text} {instructions_text}"

    # ── 1. Fruit presence ────────────────────────────────────────────────
    fruit_score  = 0
    reason_parts: list[str] = []

    if _contains_any(ingredients_text, profile["primary"]):
        fruit_score = 50
        reason_parts.append(f"Uses {fruit}")
    elif _contains_any(title_text, profile["primary"]):
        fruit_score = 30
        reason_parts.append(f"Features {fruit}")
    elif _contains_any(instructions_text, profile["primary"]):
        fruit_score = 20
        reason_parts.append(f"Mentions {fruit}")
    else:
        return 0.0, ""

    # ── 2. Flavour-pair bonus (small — prevents inflating rank) ──────────
    if _contains_any(full_text, profile["secondary"]):
        fruit_score += 3
        reason_parts.append("Complementary flavours")

    # ── 3. Ripeness technique match ───────────────────────────────────────
    technique_map = RIPENESS_TECHNIQUE_MAP.get(fruit_key, {})
    clusters      = technique_map.get(ripeness_key, [])
    best_pts      = 0
    best_reason   = ""

    for keywords, pts, label in clusters:
        if _contains_any(full_text, keywords) and pts > best_pts:
            best_pts    = pts
            best_reason = label

    if best_pts:
        reason_parts.append(best_reason)
    elif clusters:
        best_pts = 5
        reason_parts.append(f"May suit {ripeness.lower()} {fruit.lower()}")

    ripeness_score = best_pts

    # ── 4. Confidence bonus ───────────────────────────────────────────────
    # Both exactly 1.0 → caller passed defaults, not real model output.
    # Give a flat 5 pts so genuine high-confidence results rank above them.
    if fruit_confidence == 1.0 and ripeness_confidence == 1.0:
        confidence_bonus = 5.0
    else:
        combined_conf    = (fruit_confidence * ripeness_confidence) ** 0.5
        confidence_bonus = round(10.0 * combined_conf, 2)

    # ── 5. Soft ripeness bonus ────────────────────────────────────────────
    # RIPENESS_LABELS = ["Ripe", "Rotten", "N/A", "Underripe"]
    #                     idx 0    idx 1    idx 2    idx 3
    soft_bonus = 0.0
    if ripeness_probs and len(ripeness_probs) >= 4:
        neighbour_index_map = {0: "ripe", 1: "rotten", 3: "underripe"}
        for idx, label in neighbour_index_map.items():
            if label == ripeness_key:
                continue
            neighbour_prob = ripeness_probs[idx]
            if neighbour_prob < 0.10:
                continue
            for keywords, pts, _ in technique_map.get(label, []):
                if _contains_any(full_text, keywords):
                    soft_bonus += pts * neighbour_prob * 0.15
                    break

    soft_bonus = min(round(soft_bonus, 2), 5.0)

    total  = round(fruit_score + ripeness_score + confidence_bonus + soft_bonus, 2)
    reason = " · ".join(reason_parts) if reason_parts else "Possible match"
    return total, reason


# ---------------------------------------------------------------------------
# ALLERGY FILTER
# ---------------------------------------------------------------------------

# Map each allergen category to specific ingredient keywords that indicate
# its presence.  The category name itself is always included.
ALLERGEN_KEYWORDS: dict[str, list[str]] = {
    "milk": [
        "milk", "cream", "butter", "cheese", "yogurt", "yoghurt",
        "whey", "casein", "ghee", "custard", "ice cream",
    ],
    "eggs": [
        "egg", "eggs", "meringue", "mayonnaise", "mayo",
    ],
    "fish": [
        "fish", "salmon", "tuna", "cod", "tilapia", "trout", "halibut",
        "sardine", "anchovy", "anchovies", "mackerel", "bass", "haddock",
        "mahi", "swordfish", "catfish",
    ],
    "shellfish": [
        "shellfish", "shrimp", "prawn", "prawns", "crab", "lobster",
        "clam", "clams", "mussel", "mussels", "oyster", "oysters",
        "scallop", "scallops", "crawfish", "crayfish", "calamari", "squid",
    ],
    "tree nuts": [
        "tree nut", "tree nuts", "almond", "almonds", "walnut", "walnuts",
        "pecan", "pecans", "cashew", "cashews", "pistachio", "pistachios",
        "macadamia", "hazelnut", "hazelnuts", "brazil nut", "brazil nuts",
        "chestnut", "chestnuts", "pine nut", "pine nuts", "nuts"
    ],
    "peanuts": [
        "peanut", "peanuts", "peanut butter",
    ],
    "wheat": [
        "wheat", "flour", "bread", "breadcrumb", "breadcrumbs",
        "pasta", "noodle", "noodles", "couscous", "semolina",
        "tortilla", "pita", "cracker", "crackers",
    ],
    "soybeans": [
        "soy", "soybean", "soybeans", "soy sauce", "tofu", "tempeh",
        "edamame", "miso",
    ],
    "sesame": [
        "sesame", "sesame oil", "sesame seed", "sesame seeds", "tahini",
    ],
}


def _get_user_allergens(db: Session, user_id: int) -> list[str]:
    """Return expanded lowercased allergen keywords for the current user."""
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user or not user.allergies:
        return []
    categories = [a.strip().lower() for a in user.allergies.split(",") if a.strip()]
    keywords: list[str] = []
    for cat in categories:
        keywords.extend(ALLERGEN_KEYWORDS.get(cat, [cat]))
    return keywords


def _recipe_contains_allergen(recipe: Recipe, allergens: list[str]) -> bool:
    """Check if a recipe's ingredients or title contain any of the user's allergens."""
    if not allergens:
        return False
    text = (recipe.ingredients_description + " " + recipe.title).lower()
    return any(allergen in text for allergen in allergens)


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------

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


@router.post("/suggestions", response_model=RecipeSuggestionResponse)
def suggest_recipes(
    payload: RecipeSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    allergens = _get_user_allergens(db, current_user)

    recipes = db.execute(
        select(Recipe)
        .order_by(Recipe.created_at.desc())
    ).scalars().all()

    scored = []
    for r in recipes:
        if _recipe_contains_allergen(r, allergens):
            continue
        score, reason = score_recipe(
            recipe=r,
            fruit=payload.fruit,
            ripeness=payload.ripeness,
            fruit_confidence=payload.fruit_confidence,
            ripeness_confidence=payload.ripeness_confidence,
            ripeness_probs=payload.ripeness_probs,
        )
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
    ingredients: Optional[List[str]] = Query(default=None),
    exclude_ingredients: Optional[List[str]] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    allergens = _get_user_allergens(db, current_user)
    query = db.execute(
        select(Recipe)
        .where(Recipe.user_id != current_user)
    )

    if ingredients:
        for ingredient in ingredients:
            query = query.where(
                Recipe.ingredients_description.ilike(f"%{ingredient}%")
            )

    if exclude_ingredients:
        for excluded in exclude_ingredients:
            query = query.where(
                ~Recipe.ingredients_description.ilike(f"%{excluded}%")
            )

    query = (
        query
        .order_by(Recipe.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    recipes = db.execute(query).scalars().all()
    filtered = [r for r in recipes if not _recipe_contains_allergen(r, allergens)]
    page = filtered[offset : offset + limit]

    results = []
    for recipe in page:
        is_saved = db.execute(
            select(SavedRecipe).where(
                SavedRecipe.user_id == current_user,
                SavedRecipe.recipe_id == recipe.id,
            )
        ).scalar_one_or_none() is not None

        save_count = db.execute(
            select(func.count(SavedRecipe.id))
            .where(SavedRecipe.recipe_id == recipe.id)
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