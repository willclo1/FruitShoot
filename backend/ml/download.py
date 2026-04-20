import os
from pathlib import Path
import urllib.request
import urllib.error

# Update EXPECTED_SIZE to match the actual size of your ResNet50-based model weights file.
# ResNet50 checkpoints are typically larger than ResNet18 (~100 MB+ depending on heads).
# Run: python -c "import os; print(os.path.getsize('path/to/your.pth'))" to get the exact value.
EXPECTED_SIZE = 295241344 # TODO: update this after generating new ResNet50 weights


def ensure_model():
    model_path = Path(os.getenv("MODEL_PATH", "backend/ml/weights/fruit_ripeness_model.pth"))
    model_url = os.getenv("MODEL_URL")

    if not model_url:
        if model_path.exists():
            actual_size = model_path.stat().st_size
            if actual_size == EXPECTED_SIZE:
                return
            raise RuntimeError(
                f"MODEL_URL is not set and existing model is incomplete/corrupt "
                f"({actual_size} bytes, expected {EXPECTED_SIZE})."
            )
        raise RuntimeError("MODEL_URL is not set and model file is missing.")

    model_path.parent.mkdir(parents=True, exist_ok=True)

    if model_path.exists():
        actual_size = model_path.stat().st_size
        if actual_size == EXPECTED_SIZE:
            print(f"Model already present: {model_path} ({actual_size} bytes)")
            return
        print(f"Removing incomplete model: {model_path} ({actual_size}/{EXPECTED_SIZE} bytes)")
        model_path.unlink()

    tmp_path = model_path.with_suffix(model_path.suffix + ".tmp")

    if tmp_path.exists():
        tmp_path.unlink()

    try:
        print(f"Downloading model to temporary file: {tmp_path}")
        urllib.request.urlretrieve(model_url, tmp_path)

        actual_size = tmp_path.stat().st_size
        if actual_size != EXPECTED_SIZE:
            tmp_path.unlink(missing_ok=True)
            raise RuntimeError(
                f"Incomplete model download: got {actual_size} bytes, expected {EXPECTED_SIZE}"
            )

        tmp_path.replace(model_path)
        print(f"Model downloaded successfully: {model_path} ({actual_size} bytes)")

    except Exception:
        if tmp_path.exists():
            tmp_path.unlink()
        raise