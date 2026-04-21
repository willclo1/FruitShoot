from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from database.connect import get_db
from typing import List, Optional
from models.recipes import Recipe
from models.saved_recipes import SavedRecipe
from models.users import User
from models.userIngredientPref import UserIngredientPreference
from datetime import datetime
from auth.deps import get_current_user
import re

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
    limit: int = 20


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


class IngredientPreferenceResponse(BaseModel):
    ingredient_name: str
    ingredient_count: int


# ---------------------------------------------------------------------------
# SCORING ENGINE
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
                "Peak-ripe strawberries are best fresh",
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
    "apple": "apple",
    "banana": "banana",
    "strawberry": "strawberry",
}
_RIPENESS_ALIASES: dict[str, str] = {
    "ripe": "ripe",
    "underripe": "underripe",
    "rotten": "rotten",
    "n/a": "ripe",
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
    fruit_key = _norm(fruit, _FRUIT_ALIASES)
    ripeness_key = _norm(ripeness, _RIPENESS_ALIASES)

    profile = FRUIT_PROFILE.get(fruit_key)
    if profile is None:
        haystack = f"{recipe.title} {recipe.ingredients_description} {recipe.instructions_description}".lower()
        if fruit_key in haystack:
            return 30.0, f"Contains {fruit}"
        return 0.0, ""

    ingredients_text = recipe.ingredients_description.lower()
    title_text = recipe.title.lower()
    instructions_text = recipe.instructions_description.lower()
    full_text = f"{title_text} {ingredients_text} {instructions_text}"

    fruit_score = 0
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

    if _contains_any(full_text, profile["secondary"]):
        fruit_score += 3
        reason_parts.append("Complementary flavours")

    technique_map = RIPENESS_TECHNIQUE_MAP.get(fruit_key, {})
    clusters = technique_map.get(ripeness_key, [])
    best_pts = 0
    best_reason = ""

    for keywords, pts, label in clusters:
        if _contains_any(full_text, keywords) and pts > best_pts:
            best_pts = pts
            best_reason = label

    if best_pts:
        reason_parts.append(best_reason)
    elif clusters:
        best_pts = 5
        reason_parts.append(f"May suit {ripeness.lower()} {fruit.lower()}")

    ripeness_score = best_pts

    if fruit_confidence == 1.0 and ripeness_confidence == 1.0:
        confidence_bonus = 5.0
    else:
        combined_conf = (fruit_confidence * ripeness_confidence) ** 0.5
        confidence_bonus = round(10.0 * combined_conf, 2)

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

    total = round(fruit_score + ripeness_score + confidence_bonus + soft_bonus, 2)
    reason = " · ".join(reason_parts) if reason_parts else "Possible match"
    return total, reason


# ---------------------------------------------------------------------------
# ALLERGY FILTER
# ---------------------------------------------------------------------------

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
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user or not user.allergies:
        return []
    categories = [a.strip().lower() for a in user.allergies.split(",") if a.strip()]
    keywords: list[str] = []
    for cat in categories:
        keywords.extend(ALLERGEN_KEYWORDS.get(cat, [cat]))
    return keywords


def _recipe_contains_allergen(recipe: Recipe, allergens: list[str]) -> bool:
    if not allergens:
        return False
    text = (recipe.ingredients_description + " " + recipe.title).lower()
    return any(allergen in text for allergen in allergens)


# ---------------------------------------------------------------------------
# INGREDIENT PERSONALIZATION HELPERS
# ---------------------------------------------------------------------------

STOPWORDS = {
    "cup", "cups", "tbsp", "tsp", "teaspoon", "teaspoons", "tablespoon", "tablespoons",
    "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "g", "kg",
    "ml", "l", "pinch", "dash", "can", "cans", "large", "small", "medium",
    "fresh", "ripe", "ground", "chopped", "diced", "sliced", "minced",
    "optional", "to", "taste", "of", "and"
}


def normalize_ingredient(line: str) -> Optional[str]:
    if not line:
        return None

    text = line.strip().lower()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"^\s*[\d\/\.\-]+\s*", "", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)

    words = [w for w in text.split() if w not in STOPWORDS]
    if not words:
        return None

    cleaned = " ".join(words).strip()

    replacements = {
        "bananas": "banana",
        "apples": "apple",
        "strawberries": "strawberry",
        "oat": "oats",
        "rolled oats": "oats",
        "old fashioned oats": "oats",
        "apple sauce": "applesauce",
    }

    if cleaned in replacements:
        return replacements[cleaned]

    if cleaned.endswith("s") and cleaned not in {"oats"}:
        cleaned = cleaned[:-1]

    return cleaned or None


def extract_ingredients(ingredients_description: str) -> list[str]:
    if not ingredients_description:
        return []

    raw_parts = []
    for line in ingredients_description.splitlines():
        line = line.strip()
        if line:
            raw_parts.append(line)

    if not raw_parts:
        raw_parts = [p.strip() for p in ingredients_description.split(",") if p.strip()]

    normalized = []
    for part in raw_parts:
        ingredient = normalize_ingredient(part)
        if ingredient:
            normalized.append(ingredient)

    return list(dict.fromkeys(normalized))


def add_recipe_ingredients_to_user_profile(db: Session, user_id: int, recipe: Recipe) -> None:
    ingredients = extract_ingredients(recipe.ingredients_description)

    for ingredient in ingredients:
        pref = db.execute(
            select(UserIngredientPreference).where(
                UserIngredientPreference.user_id == user_id,
                UserIngredientPreference.ingredient_name == ingredient,
            )
        ).scalar_one_or_none()

        if pref:
            pref.ingredient_count += 1
        else:
            db.add(
                UserIngredientPreference(
                    user_id=user_id,
                    ingredient_name=ingredient,
                    ingredient_count=1,
                )
            )


def remove_recipe_ingredients_from_user_profile(db: Session, user_id: int, recipe: Recipe) -> None:
    ingredients = extract_ingredients(recipe.ingredients_description)

    for ingredient in ingredients:
        pref = db.execute(
            select(UserIngredientPreference).where(
                UserIngredientPreference.user_id == user_id,
                UserIngredientPreference.ingredient_name == ingredient,
            )
        ).scalar_one_or_none()

        if not pref:
            continue

        pref.ingredient_count -= 1
        if pref.ingredient_count <= 0:
            db.delete(pref)


def get_top_user_ingredients(db: Session, user_id: int, limit: int = 5) -> list[tuple[str, int]]:
    rows = db.execute(
        select(
            UserIngredientPreference.ingredient_name,
            UserIngredientPreference.ingredient_count,
        )
        .where(UserIngredientPreference.user_id == user_id)
        .order_by(
            UserIngredientPreference.ingredient_count.desc(),
            UserIngredientPreference.ingredient_name.asc(),
        )
        .limit(limit)
    ).all()

    return [(row.ingredient_name, row.ingredient_count) for row in rows]


def recipe_personalization_score(recipe: Recipe, top_ingredients: list[tuple[str, int]]) -> int:
    text = f"{recipe.title} {recipe.ingredients_description}".lower()
    score = 0

    for ingredient, count in top_ingredients:
        if ingredient in text:
            score += count

    return score


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
    top_ingredients = get_top_user_ingredients(db, current_user, limit=5)

    query = (
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

    candidate_limit = max(limit * 3, 50)

    candidate_recipes = db.execute(
        query.order_by(Recipe.created_at.desc()).limit(candidate_limit)
    ).scalars().all()

    filtered = [r for r in candidate_recipes if not _recipe_contains_allergen(r, allergens)]

    scored_recipes = []
    for recipe in filtered:
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

        personalization_score = recipe_personalization_score(recipe, top_ingredients)
        final_score = (personalization_score * 5) + (save_count * 2)

        scored_recipes.append(
            (final_score, recipe, is_saved, save_count)
        )

    scored_recipes.sort(
        key=lambda x: (x[0], x[1].created_at),
        reverse=True,
    )

    page = scored_recipes[offset: offset + limit]

    results = []
    for _, recipe, is_saved, save_count in page:
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


@router.get("/me/top-ingredients", response_model=List[IngredientPreferenceResponse])
def get_my_top_ingredients(
    db: Session = Depends(get_db),
    current_user: int = Depends(get_current_user),
):
    rows = get_top_user_ingredients(db, current_user, limit=10)
    return [
        IngredientPreferenceResponse(
            ingredient_name=name,
            ingredient_count=count,
        )
        for name, count in rows
    ]


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

    add_recipe_ingredients_to_user_profile(db, current_user, recipe)

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

    recipe = db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    ).scalar_one_or_none()

    if recipe:
        remove_recipe_ingredients_from_user_profile(db, current_user, recipe)

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