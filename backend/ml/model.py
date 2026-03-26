import os
from pathlib import Path
import torch

from .multitask_resnet import ConditionalFruitModel

# Index → label mappings (must stay consistent across all files)
FRUIT_LABELS = ["Apple", "Banana", "Strawberry", "Non-Fruit"]   # 0,1,2,3
RIPENESS_LABELS = ["Ripe", "Rotten", "N/A", "Underripe"]        # 0,1,2,3

_model = None


def get_model():
    global _model
    if _model is not None:
        return _model

    default_path = Path(__file__).resolve().parent / "weights" / "fruit_ripeness_model.pth"
    model_path = Path(os.getenv("MODEL_PATH", str(default_path)))

    device = torch.device("cpu")

    model = ConditionalFruitModel(num_fruits=len(FRUIT_LABELS), num_ripeness=len(RIPENESS_LABELS))

    state = torch.load(model_path, map_location=device)
    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]

    model.load_state_dict(state)
    model.to(device)
    model.eval()

    _model = model
    return _model