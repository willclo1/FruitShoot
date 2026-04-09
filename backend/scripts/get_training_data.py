#!/usr/bin/env python3
"""
Generate a balanced retraining manifest from FruitShoot's retraining_samples table.

Reads config from:
- .env
- .env.local (overrides .env if present)

What it does:
- Selects up to N unused retraining samples
- Balances across (fruit_index, ripeness_index) buckets
- Joins to images to get file locations
- Writes:
    1. a CSV manifest with labels + paths
    2. a TXT file with just image paths
    3. a summary TXT with bucket counts
- Optionally marks selected samples as used_for_training = TRUE

Required packages:
    pip install pymysql python-dotenv
"""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv(".env")
load_dotenv(".env.local", override=True)

import csv
import os
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import pymysql


@dataclass
class Sample:
    retraining_sample_id: int
    image_id: int
    location: str
    fruit_index: int
    ripeness_index: int
    fruit_confidence: float
    ripeness_confidence: float
    created_at: datetime


def get_env(name: str, default: str | None = None, required: bool = False) -> str:
    value = os.getenv(name, default)
    if required and (value is None or value == ""):
        raise ValueError(f"Missing required environment variable: {name}")
    return value or ""


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def get_db_connection():
    return pymysql.connect(
        host=get_env("DB_HOST", required=True),
        port=int(get_env("DB_PORT", "3306")),
        user=get_env("DB_USER", required=True),
        password=get_env("DB_PASSWORD", required=True),
        database=get_env("DB_NAME", required=True),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def fetch_candidate_samples(
    conn,
    min_fruit_conf: float,
    min_ripeness_conf: float,
) -> List[Sample]:
    query = """
        SELECT
            rs.id AS retraining_sample_id,
            rs.image_id,
            i.location,
            rs.fruit_index,
            rs.ripeness_index,
            rs.fruit_confidence,
            rs.ripeness_confidence,
            rs.created_at
        FROM retraining_samples rs
        INNER JOIN images i
            ON i.id = rs.image_id
        WHERE rs.used_for_training = FALSE
          AND rs.fruit_confidence >= %s
          AND rs.ripeness_confidence >= %s
        ORDER BY rs.created_at ASC, rs.id ASC
    """

    with conn.cursor() as cursor:
        cursor.execute(query, (min_fruit_conf, min_ripeness_conf))
        rows = cursor.fetchall()

    samples: List[Sample] = []
    for row in rows:
        samples.append(
            Sample(
                retraining_sample_id=int(row["retraining_sample_id"]),
                image_id=int(row["image_id"]),
                location=str(row["location"]),
                fruit_index=int(row["fruit_index"]),
                ripeness_index=int(row["ripeness_index"]),
                fruit_confidence=float(row["fruit_confidence"]),
                ripeness_confidence=float(row["ripeness_confidence"]),
                created_at=row["created_at"],
            )
        )
    return samples


def bucketize(samples: List[Sample]) -> Dict[Tuple[int, int], List[Sample]]:
    buckets: Dict[Tuple[int, int], List[Sample]] = defaultdict(list)

    for sample in samples:
        key = (sample.fruit_index, sample.ripeness_index)
        buckets[key].append(sample)

    for key in buckets:
        buckets[key].sort(
            key=lambda s: (
                -((s.fruit_confidence + s.ripeness_confidence) / 2.0),
                s.created_at,
                s.retraining_sample_id,
            )
        )

    return buckets


def select_balanced_samples(samples: List[Sample], batch_size: int) -> List[Sample]:
    if not samples or batch_size <= 0:
        return []

    buckets = bucketize(samples)
    active_bucket_keys = [key for key, bucket in buckets.items() if bucket]

    if not active_bucket_keys:
        return []

    selected: List[Sample] = []

    per_bucket_target = max(1, batch_size // len(active_bucket_keys))

    for key in active_bucket_keys:
        available = buckets[key]
        take_count = min(per_bucket_target, len(available))
        selected.extend(available[:take_count])
        buckets[key] = available[take_count:]

    remaining_needed = batch_size - len(selected)

    while remaining_needed > 0:
        made_progress = False

        for key in active_bucket_keys:
            if remaining_needed <= 0:
                break
            if buckets[key]:
                selected.append(buckets[key].pop(0))
                remaining_needed -= 1
                made_progress = True

        if not made_progress:
            break

    return selected[:batch_size]


def write_manifest_csv(samples: List[Sample], filepath: Path) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)

    with filepath.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "retraining_sample_id",
                "image_id",
                "location",
                "fruit_index",
                "ripeness_index",
                "fruit_confidence",
                "ripeness_confidence",
                "created_at",
            ]
        )

        for s in samples:
            writer.writerow(
                [
                    s.retraining_sample_id,
                    s.image_id,
                    s.location,
                    s.fruit_index,
                    s.ripeness_index,
                    s.fruit_confidence,
                    s.ripeness_confidence,
                    s.created_at.isoformat() if hasattr(s.created_at, "isoformat") else str(s.created_at),
                ]
            )


def write_paths_txt(samples: List[Sample], filepath: Path) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)

    with filepath.open("w", encoding="utf-8") as f:
        for s in samples:
            f.write(f"{s.location}\n")


def write_summary_txt(samples: List[Sample], filepath: Path) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)

    counts: Dict[Tuple[int, int], int] = defaultdict(int)
    for s in samples:
        counts[(s.fruit_index, s.ripeness_index)] += 1

    with filepath.open("w", encoding="utf-8") as f:
        f.write(f"Selected samples: {len(samples)}\n")
        f.write("Bucket counts (fruit_index, ripeness_index):\n")
        for key in sorted(counts.keys()):
            f.write(f"  {key}: {counts[key]}\n")


def mark_samples_used(conn, sample_ids: List[int]) -> None:
    if not sample_ids:
        return

    placeholders = ",".join(["%s"] * len(sample_ids))
    query = f"""
        UPDATE retraining_samples
        SET used_for_training = TRUE
        WHERE id IN ({placeholders})
    """

    with conn.cursor() as cursor:
        cursor.execute(query, sample_ids)


def main() -> int:
    try:
        output_dir = Path(get_env("OUTPUT_DIR", "./output"))
        batch_size = int(get_env("BATCH_SIZE", "200"))
        min_fruit_conf = float(get_env("MIN_FRUIT_CONFIDENCE", "0.0"))
        min_ripeness_conf = float(get_env("MIN_RIPENESS_CONFIDENCE", "0.0"))
        mark_used = parse_bool(get_env("MARK_USED", "false"))

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        manifest_csv = output_dir / f"retraining_manifest_{timestamp}.csv"
        paths_txt = output_dir / f"retraining_paths_{timestamp}.txt"
        summary_txt = output_dir / f"retraining_summary_{timestamp}.txt"

        conn = get_db_connection()

        try:
            candidates = fetch_candidate_samples(
                conn=conn,
                min_fruit_conf=min_fruit_conf,
                min_ripeness_conf=min_ripeness_conf,
            )

            print(f"Found {len(candidates)} candidate unused samples.")

            if len(candidates) < batch_size:
                print(f"Not enough samples to build a batch of {batch_size}. Exiting.")
                conn.rollback()
                return 0

            selected = select_balanced_samples(candidates, batch_size)

            if not selected:
                print("No samples selected.")
                conn.rollback()
                return 0

            print(f"Selected {len(selected)} samples.")

            write_manifest_csv(selected, manifest_csv)
            write_paths_txt(selected, paths_txt)
            write_summary_txt(selected, summary_txt)

            print(f"Wrote CSV manifest: {manifest_csv}")
            print(f"Wrote TXT paths:    {paths_txt}")
            print(f"Wrote summary:      {summary_txt}")

            if mark_used:
                sample_ids = [s.retraining_sample_id for s in selected]
                mark_samples_used(conn, sample_ids)
                conn.commit()
                print(f"Marked {len(sample_ids)} samples as used_for_training=TRUE")
            else:
                conn.rollback()
                print("MARK_USED=false, so no database changes were committed.")

        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return 0

    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())