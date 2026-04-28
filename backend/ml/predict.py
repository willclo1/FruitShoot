 
import torch
from torchvision import transforms, models
from torchvision.models.detection import fasterrcnn_resnet50_fpn, FasterRCNN_ResNet50_FPN_Weights
from PIL import Image
from .model import FRUIT_LABELS, RIPENESS_LABELS
 
_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
 
_detector = fasterrcnn_resnet50_fpn(weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT)
_detector.eval()
 
def predict_image_path(model, image_path: str):
    image = Image.open(image_path).convert("RGB")
    device = next(model.parameters()).device
 
 
    cropped_image = image.copy()
    with torch.no_grad():
        detect_input = transforms.ToTensor()(image).unsqueeze(0)
        detections = _detector(detect_input)[0]
       
        if len(detections['boxes']) > 0 and detections['scores'][0] > 0.5:
            box = detections['boxes'][0].cpu().numpy()
            w, h = box[2]-box[0], box[3]-box[1]
            pad_w, pad_h = w * 0.15, h * 0.15
            cropped_image = image.crop((
                max(0, box[0] - pad_w),
                max(0, box[1] - pad_h),
                min(image.width, box[2] + pad_w),
                min(image.height, box[3] + pad_h)
            ))
 
    full_x = _transform(image).unsqueeze(0).to(device)
    crop_x = _transform(cropped_image).unsqueeze(0).to(device)
 
    with torch.no_grad():
        fruit_logits, ripe_logits = model(full_x, crop_x)
 
        #and then I think everything else is the same
 
        fruit_probs = torch.softmax(fruit_logits, dim=1)
        fruit_conf, fruit_idx_tensor = torch.max(fruit_probs, dim=1)
        f_idx = int(fruit_idx_tensor.item())
 
        if f_idx < 3:
            masked_ripe = ripe_logits.clone()
            masked_ripe[0, 2] = -float('inf')
            ripe_probs = torch.softmax(masked_ripe, dim=1)
        else:
            ripe_probs = torch.softmax(ripe_logits, dim=1)
 
        ripe_conf, ripe_idx_tensor = torch.max(ripe_probs, dim=1)
        r_idx = int(ripe_idx_tensor.item())
 
    return {
        "fruit": FRUIT_LABELS[f_idx],
        "fruit_index": f_idx,
        "ripeness": RIPENESS_LABELS[r_idx],
        "ripeness_index": r_idx,
        "fruit_confidence": float(fruit_conf.item()),
        "ripeness_confidence": float(ripe_conf.item())
    }