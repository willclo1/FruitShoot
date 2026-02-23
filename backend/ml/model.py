import os
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models

LABELS = ["Apple", "Banana", "Strawberry", "non-fruit"]

_model = None

def get_model():
    global _model
    if _model is not None:
        return _model

    default_path = Path(__file__).resolve().parent / "weights" / "mobilenetv3_fruit.pth"
    model_path = Path(os.getenv("MODEL_PATH", str(default_path)))

    device = torch.device("cpu")

    model = models.mobilenet_v3_large(weights=None)

    # Replace classifier for 4 classes
    model.classifier[3] = nn.Linear(
        model.classifier[3].in_features,
        len(LABELS)
    )

    state = torch.load(model_path, map_location=device)

    # Handle checkpoint vs raw state_dict
    if "model_state_dict" in state:
        state = state["model_state_dict"]

    model.load_state_dict(state)
    model.to(device)
    model.eval()

    _model = model
    return _model