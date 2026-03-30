import torch
from torchvision import transforms
from PIL import Image

from .model import FRUIT_LABELS, RIPENESS_LABELS

_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

def predict_image_path(model, image_path: str):
    image = Image.open(image_path).convert("RGB")
    x = _transform(image).unsqueeze(0)
 
    with torch.no_grad():
        fruit_logits, ripe_logits = model(x)
 
        fruit_probs = torch.softmax(fruit_logits, dim=1)
        fruit_conf, fruit_idx_tensor = torch.max(fruit_probs, dim=1)
        f_idx = int(fruit_idx_tensor.item())
 
        if f_idx < 3:
            masked_ripe = ripe_logits.clone()
            masked_ripe[0, 2] = -float('inf')
            
            ripe_probs = torch.softmax(masked_ripe, dim=1)
            ripe_conf, ripe_idx_tensor = torch.max(ripe_probs, dim=1)
        else:
            ripe_probs = torch.softmax(ripe_logits, dim=1)
            ripe_conf = torch.tensor([1.0])
            ripe_idx_tensor = torch.tensor([2])
 
        r_idx = int(ripe_idx_tensor.item())
 
    return {
        "fruit": FRUIT_LABELS[f_idx],
        "fruit_index": f_idx,
        "fruit_confidence": float(fruit_conf.item()),
        "fruit_probs": [float(p) for p in fruit_probs.squeeze(0).tolist()],
 
        "ripeness": RIPENESS_LABELS[r_idx],
        "ripeness_index": r_idx,
        "ripeness_confidence": float(ripe_conf.item()),
        "ripeness_probs": [float(p) for p in ripe_probs.squeeze(0).tolist()],
    }