import torch
from torchvision import transforms
from PIL import Image
from .model import LABELS

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def predict_image(model, image_path: str):
    image = Image.open(image_path).convert("RGB")
    x = _transform(image).unsqueeze(0)

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)
        conf, idx = torch.max(probs, dim=1)

    return {
        "prediction": LABELS[int(idx.item())],
        "confidence": float(conf.item()),
        "probs": [float(p) for p in probs.squeeze(0).tolist()],
    }