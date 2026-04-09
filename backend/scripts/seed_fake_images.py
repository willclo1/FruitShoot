#!/usr/bin/env python3

import random

from dotenv import load_dotenv
load_dotenv(".env")
load_dotenv(".env.local", override=True)

import os
from pathlib import Path
import pymysql

try:
    from PIL import Image, ImageDraw
except ImportError:
    raise SystemExit("Install Pillow first: pip install Pillow")

FRUIT_CLASSES = 5
RIPENESS_CLASSES = 4
PER_BUCKET = 10

SEED_DIR = Path("test_seed_images")
SEED_DIR.mkdir(parents=True, exist_ok=True)


def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def ensure_test_user(conn) -> int:
    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM users WHERE email=%s LIMIT 1", ("test@fruitshoot.local",))
        row = cursor.fetchone()
        if row:
            return row["id"]

        cursor.execute(
            """
            INSERT INTO users (email, username, password_hash)
            VALUES (%s, %s, %s)
            """,
            ("test@fruitshoot.local", "testuser", "not_a_real_hash_for_testing"),
        )
        return cursor.lastrowid


def make_dummy_image(path: Path, fruit_index: int, ripeness_index: int, n: int) -> None:
    img = Image.new("RGB", (256, 256), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    text = f"fruit={fruit_index}\nripeness={ripeness_index}\n#{n}"
    draw.text((20, 20), text, fill=(0, 0, 0))
    img.save(path)


def main():
    conn = get_db_connection()
    try:
        user_id = ensure_test_user(conn)

        inserted = 0

        with conn.cursor() as cursor:
            for fruit_index in range(FRUIT_CLASSES):
                for ripeness_index in range(RIPENESS_CLASSES):
                    for n in range(1, PER_BUCKET + 1):
                        filename = f"fruit_{fruit_index}_ripeness_{ripeness_index}_{n:03d}.jpg"
                        filepath = SEED_DIR / filename
                        make_dummy_image(filepath, fruit_index, ripeness_index, n)

                        abs_path = str(filepath.resolve())

                        cursor.execute(
                            """
                            INSERT INTO images (user_id, description, location)
                            VALUES (%s, %s, %s)
                            """,
                            (
                                user_id,
                                f"Test seed image fruit={fruit_index} ripeness={ripeness_index} n={n}",
                                abs_path,
                            ),
                        )
                        image_id = cursor.lastrowid

                        cursor.execute(
                            """
                            INSERT INTO retraining_samples (
                                image_id,
                                fruit_index,
                                ripeness_index,
                                fruit_confidence,
                                ripeness_confidence,
                                used_for_training
                            )
                            VALUES (%s, %s, %s, %s, %s, FALSE)
                            """,
                            (
                                image_id,
                                fruit_index,
                                ripeness_index,
                                random.random() * 0.5 + 0.5,  # 0.5 to 1.0
                                random.random() * 0.5 + 0.5,  # 0.5 to 1.0
                            ),
                        )
                        inserted += 1

        conn.commit()
        print(f"Inserted {inserted} test images and retraining samples.")

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()