import os
from pathlib import Path
import urllib.request

def ensure_model():
    model_path = Path(os.getenv("MODEL_PATH", "backend/ml/weights/mobilenetv3_fruit.pth"))
    model_url = os.getenv("MODEL_URL")

    if model_path.exists():
        return

    if not model_url:
        raise RuntimeError("MODEL_URL is not set and model file is missing.")

    model_path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(model_url, model_path)