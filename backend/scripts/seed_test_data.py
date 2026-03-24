from __future__ import annotations

import random
import sys
from pathlib import Path

# Allow running from backend root with:
# python3 -m scripts.seed_test_data
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database.connect import SessionLocal
from models.users import User
from models.images import UserImage, RetrainingImage
from models.recipes import Recipe

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TEST_PASSWORD = "FruitShoot123!"

TEST_USERS = [
    {"email": "emma.parker@fruitshoot.app", "username": "emma_parker"},
    {"email": "liam.bennett@fruitshoot.app", "username": "liam_bennett"},
    {"email": "olivia.hayes@fruitshoot.app", "username": "olivia_hayes"},
    {"email": "noah.turner@fruitshoot.app", "username": "noah_turner"},
    {"email": "ava.mitchell@fruitshoot.app", "username": "ava_mitchell"},
    {"email": "ethan.collins@fruitshoot.app", "username": "ethan_collins"},
    {"email": "sophia.reed@fruitshoot.app", "username": "sophia_reed"},
    {"email": "mason.ward@fruitshoot.app", "username": "mason_ward"},
    {"email": "isabella.cook@fruitshoot.app", "username": "isabella_cook"},
    {"email": "jackson.bailey@fruitshoot.app", "username": "jackson_bailey"},
    {"email": "mia.foster@fruitshoot.app", "username": "mia_foster"},
    {"email": "lucas.morgan@fruitshoot.app", "username": "lucas_morgan"},
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def ingredient_text(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def instruction_text(items: list[str]) -> str:
    return "\n".join(f"{i + 1}. {item}" for i, item in enumerate(items))


def get_or_create_user(db: Session, email: str, username: str, password: str) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing

    user = User(
        email=email,
        username=username,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.flush()
    return user


def recipe_exists(db: Session, user_id: int, title: str) -> bool:
    return (
        db.query(Recipe)
        .filter(Recipe.user_id == user_id, Recipe.title == title)
        .first()
        is not None
    )


def create_recipe_for_user(db: Session, user_id: int, recipe_data: dict) -> None:
    if recipe_exists(db, user_id, recipe_data["title"]):
        return

    recipe = Recipe(
        user_id=user_id,
        title=recipe_data["title"],
        ingredients_description=ingredient_text(recipe_data["ingredients"]),
        instructions_description=instruction_text(recipe_data["steps"]),
    )
    db.add(recipe)


def make_recipe(title: str, ingredients: list[str], steps: list[str]) -> dict:
    return {
        "title": title,
        "ingredients": ingredients,
        "steps": steps,
    }


def build_recipe_library() -> list[dict]:
    recipes: list[dict] = []

    fruits = {
        "Banana": {
            "single": "banana",
            "plural": "bananas",
            "prep": "sliced bananas",
            "fresh": "ripe bananas",
            "overripe": "overripe bananas",
        },
        "Apple": {
            "single": "apple",
            "plural": "apples",
            "prep": "diced apples",
            "fresh": "crisp apples",
            "overripe": "soft apples",
        },
        "Strawberry": {
            "single": "strawberry",
            "plural": "strawberries",
            "prep": "sliced strawberries",
            "fresh": "fresh strawberries",
            "overripe": "soft strawberries",
        },
    }

    # Smoothies
    smoothie_bases = [
        ("Yogurt Smoothie", ["1 cup Greek yogurt", "1/2 cup milk", "1 tsp honey"]),
        ("Oat Smoothie", ["1/2 cup rolled oats", "1 cup milk", "1 tsp cinnamon"]),
        ("Protein Smoothie", ["1 scoop vanilla protein powder", "1 cup milk", "1/2 cup ice"]),
        ("Breakfast Smoothie", ["1/2 cup yogurt", "1/2 cup oats", "1 tsp honey"]),
        ("Honey Smoothie", ["1 cup milk", "1 tbsp honey", "1/2 cup ice"]),
    ]
    for fruit_name, f in fruits.items():
        for style_name, extras in smoothie_bases:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style_name}",
                    [f"2 {f['plural']}" if fruit_name == "Banana" else f"2 cups {f['prep']}"] + extras,
                    [
                        "Add all ingredients to a blender.",
                        "Blend until smooth and creamy.",
                        "Taste and adjust sweetness if needed.",
                        "Serve cold.",
                    ],
                )
            )

    # Oatmeal / overnight oats
    oat_styles = ["Overnight Oats", "Cinnamon Oat Bowl", "Breakfast Oats", "Honey Oats"]
    for fruit_name, f in fruits.items():
        for style in oat_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        "1/2 cup oats",
                        "1/2 cup milk",
                        "1/4 cup yogurt",
                        f"1 cup {f['prep']}",
                        "1 tsp honey",
                    ],
                    [
                        "Combine oats, milk, yogurt, and honey.",
                        f"Stir in the {f['prep']}.",
                        "Let chill overnight or warm before serving.",
                        "Serve in a bowl.",
                    ],
                )
            )

    # Parfaits / yogurt bowls
    bowl_styles = ["Yogurt Bowl", "Parfait", "Granola Bowl", "Breakfast Bowl"]
    for fruit_name, f in fruits.items():
        for style in bowl_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        f"1 cup {f['prep']}",
                        "1 cup vanilla yogurt",
                        "1/3 cup granola",
                        "1 tsp honey",
                    ],
                    [
                        "Add yogurt to a bowl or glass.",
                        f"Top with {f['prep']} and granola.",
                        "Drizzle with honey.",
                        "Serve immediately.",
                    ],
                )
            )

    # Salads
    salad_styles = ["Fresh Salad", "Walnut Salad", "Mint Salad", "Garden Salad"]
    for fruit_name, f in fruits.items():
        for style in salad_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        f"2 cups {f['prep']}",
                        "2 cups mixed greens",
                        "1/4 cup nuts or seeds",
                        "2 tbsp vinaigrette",
                    ],
                    [
                        "Place greens in a large bowl.",
                        f"Add the {f['prep']}.",
                        "Top with nuts or seeds.",
                        "Drizzle with vinaigrette and toss gently.",
                    ],
                )
            )

    # Toasts
    toast_styles = ["Toast", "Honey Toast", "Cinnamon Toast", "Yogurt Toast"]
    for fruit_name, f in fruits.items():
        for style in toast_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        "2 slices bread",
                        f"1 cup {f['prep']}",
                        "1 tbsp honey or nut butter",
                        "Pinch of cinnamon",
                    ],
                    [
                        "Toast the bread.",
                        "Spread honey or nut butter on each slice.",
                        f"Top with the {f['prep']}.",
                        "Finish with cinnamon and serve.",
                    ],
                )
            )

    # Pancakes / muffins / baked
    baked_styles = [
        ("Pancakes", ["1 cup flour", "1 tsp baking powder", "1 egg", "3/4 cup milk"]),
        ("Muffins", ["1 1/2 cups flour", "1 tsp baking powder", "1 egg", "1/2 cup milk"]),
        ("Crisp", ["1/2 cup oats", "1/3 cup flour", "1/4 cup butter", "1/3 cup brown sugar"]),
        ("Bake", ["1 tbsp honey", "1/2 tsp cinnamon", "1 tbsp butter"]),
    ]
    for fruit_name, f in fruits.items():
        for style_name, extras in baked_styles:
            ingredient_fruit = (
                f"2 {f['overripe']}" if fruit_name == "Banana" and style_name in {"Pancakes", "Muffins"}
                else f"2 cups {f['prep']}"
            )
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style_name}",
                    [ingredient_fruit] + extras,
                    [
                        "Preheat and prepare your pan or baking dish.",
                        "Combine the ingredients until just mixed.",
                        "Cook or bake until set and golden.",
                        "Cool slightly and serve.",
                    ],
                )
            )

    # Compotes / sauces / toppings
    sauce_styles = ["Compote", "Sauce", "Topping", "Warm Fruit Mix"]
    for fruit_name, f in fruits.items():
        for style in sauce_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        f"2 cups {f['prep']}",
                        "2 tbsp sugar or honey",
                        "1 tbsp water",
                        "1/2 tsp cinnamon",
                    ],
                    [
                        f"Add the {f['prep']} to a small saucepan.",
                        "Stir in sweetener, water, and cinnamon.",
                        "Cook over low heat until softened.",
                        "Serve warm over toast, oats, or yogurt.",
                    ],
                )
            )

    # Frozen / chilled
    frozen_styles = ["Frozen Bites", "Chilled Cups", "Fruit Pops", "Ice Bowl"]
    for fruit_name, f in fruits.items():
        for style in frozen_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        f"2 cups {f['prep']}",
                        "1 cup yogurt or juice",
                        "1 tsp honey",
                    ],
                    [
                        "Mix the fruit with yogurt or juice.",
                        "Portion into molds or cups.",
                        "Freeze or chill until set.",
                        "Serve cold.",
                    ],
                )
            )

    # Simple snacks
    snack_styles = ["Snack Cup", "Fruit Mix", "Sweet Snack", "Quick Bowl"]
    for fruit_name, f in fruits.items():
        for style in snack_styles:
            recipes.append(
                make_recipe(
                    f"{fruit_name} {style}",
                    [
                        f"1 1/2 cups {f['prep']}",
                        "1 tbsp honey",
                        "1 tbsp nuts or seeds",
                    ],
                    [
                        "Add fruit to a bowl or cup.",
                        "Top with honey and nuts or seeds.",
                        "Mix lightly if desired.",
                        "Serve immediately.",
                    ],
                )
            )

    # Extra mixed-fruit recipes limited to strawberry/banana/apple
    mixed_recipes = [
        make_recipe(
            "Strawberry Banana Smoothie",
            ["1 cup sliced strawberries", "2 bananas", "1 cup milk", "1/2 cup yogurt", "1 tsp honey"],
            [
                "Add all ingredients to a blender.",
                "Blend until smooth.",
                "Serve immediately.",
            ],
        ),
        make_recipe(
            "Apple Banana Oat Smoothie",
            ["1 apple, diced", "1 banana", "1/2 cup oats", "1 cup milk", "1 tsp cinnamon"],
            [
                "Add all ingredients to a blender.",
                "Blend until creamy.",
                "Serve cold.",
            ],
        ),
        make_recipe(
            "Strawberry Apple Salad",
            ["1 cup sliced strawberries", "1 apple, diced", "2 cups greens", "2 tbsp vinaigrette"],
            [
                "Place greens in a bowl.",
                "Add strawberries and apple.",
                "Drizzle with vinaigrette.",
                "Toss and serve.",
            ],
        ),
        make_recipe(
            "Banana Apple Pancakes",
            ["1 banana", "1 apple, diced", "1 cup flour", "1 egg", "3/4 cup milk", "1 tsp baking powder"],
            [
                "Mash the banana and mix with the remaining ingredients.",
                "Cook on a skillet until golden.",
                "Serve warm.",
            ],
        ),
        make_recipe(
            "Strawberry Banana Parfait",
            ["1 cup sliced strawberries", "1 banana", "1 cup yogurt", "1/3 cup granola"],
            [
                "Layer yogurt, fruit, and granola in a glass.",
                "Repeat layers.",
                "Serve immediately.",
            ],
        ),
        make_recipe(
            "Apple Strawberry Overnight Oats",
            ["1 apple, diced", "1 cup sliced strawberries", "1/2 cup oats", "1/2 cup milk", "1/4 cup yogurt"],
            [
                "Combine oats, milk, and yogurt.",
                "Fold in the fruit.",
                "Chill overnight.",
                "Serve cold or warmed.",
            ],
        ),
    ]

    recipes.extend(mixed_recipes)

    # De-duplicate by title just in case
    deduped = {}
    for recipe in recipes:
        deduped[recipe["title"]] = recipe

    return list(deduped.values())


RECIPE_LIBRARY = build_recipe_library()


def seed_users_and_recipes() -> None:
    db = SessionLocal()
    try:
        users: list[User] = []

        for user_data in TEST_USERS:
            user = get_or_create_user(
                db,
                email=user_data["email"],
                username=user_data["username"],
                password=TEST_PASSWORD,
            )
            users.append(user)

        db.flush()

        recipes_per_user = 30
        shuffled = RECIPE_LIBRARY[:]
        random.shuffle(shuffled)

        recipe_index = 0
        for user in users:
            for _ in range(recipes_per_user):
                recipe_data = shuffled[recipe_index % len(shuffled)]
                recipe_index += 1
                create_recipe_for_user(db, user.id, recipe_data)

        db.commit()

        print("Seed complete.")
        print(f"Users seeded: {len(users)}")
        print(f"Recipe templates available: {len(RECIPE_LIBRARY)}")
        print(f"Recipes attempted per user: {recipes_per_user}")
        print(f"Approx recipes attempted total: {len(users) * recipes_per_user}")
        print()
        print("Tester login credentials:")
        print(f"Password for all test users: {TEST_PASSWORD}")
        for u in TEST_USERS:
            print(f"- {u['email']} / {u['username']}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users_and_recipes()