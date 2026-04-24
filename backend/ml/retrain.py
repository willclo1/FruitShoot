import os
from pathlib import Path

import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim

from PIL import Image
from torchvision import transforms
from torch.utils.data import Dataset, DataLoader

from .download import ensure_model
from .multitask_resnet import DualStreamFruitModel


FRUIT_LABELS = ["Apple", "Banana", "Strawberry", "Non-Fruit"]
RIPENESS_LABELS = ["Ripe", "Rotten", "N/A", "Underripe"]


class FruitShootIncrementalDataset(Dataset):
    def __init__(self, manifest_path, transform=None, image_base_dir=None):
        self.df = pd.read_csv(manifest_path)
        self.transform = transform
        self.image_base_dir = Path(image_base_dir) if image_base_dir else None

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]

        img_path = Path(str(row["location"]))

        if self.image_base_dir and not img_path.is_absolute():
            img_path = self.image_base_dir / img_path

        if not img_path.exists():
            raise FileNotFoundError(f"Image not found: {img_path}")

        image = Image.open(img_path).convert("RGB")

        fruit_label = torch.tensor(int(row["fruit_index"]), dtype=torch.long)
        ripeness_label = torch.tensor(int(row["ripeness_index"]), dtype=torch.long)

        if self.transform:
            image = self.transform(image)

        return image, fruit_label, ripeness_label


def fine_tune_from_manifest(
    manifest_csv,
    model_path=None,
    output_version="incremental",
    output_model_dir="backend/ml/weights",
    image_base_dir=None,
    epochs=3,
    batch_size=16,
    lr=1e-5,
):
    ensure_model()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model_path = Path(
        model_path or os.getenv("MODEL_PATH", "backend/ml/weights/best_dual_stream_model.pth")
    )

    output_model_dir = Path(output_model_dir)
    output_model_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading model from: {model_path}")

    state = torch.load(model_path, map_location=device)

    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]

    model = DualStreamFruitModel(
        num_fruits=len(FRUIT_LABELS),
        num_ripeness=len(RIPENESS_LABELS),
    )

    model.load_state_dict(state)
    model.to(device)
    model.train()

    transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225],
            ),
        ]
    )

    dataset = FruitShootIncrementalDataset(
        manifest_path=manifest_csv,
        transform=transform,
        image_base_dir=image_base_dir,
    )

    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,
    )

    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()

    print(f"Fine-tuning on {len(dataset)} samples")
    print(f"Device: {device}")

    for epoch in range(epochs):
        running_loss = 0.0

        for images, fruit_targets, ripeness_targets in loader:
            images = images.to(device)
            fruit_targets = fruit_targets.to(device)
            ripeness_targets = ripeness_targets.to(device)


            optimizer.zero_grad()

            fruit_out, ripeness_out = model(images, images)

            loss_fruit = criterion(fruit_out, fruit_targets)
            loss_ripeness = criterion(ripeness_out, ripeness_targets)

            total_loss = loss_fruit + loss_ripeness

            total_loss.backward()
            optimizer.step()

            running_loss += total_loss.item()

        avg_loss = running_loss / max(len(loader), 1)

        print(f"Epoch {epoch + 1}/{epochs} Loss: {avg_loss:.4f}")


        avg_loss = running_loss / max(len(loader), 1)

        print(f"Epoch {epoch + 1}/{epochs} Loss: {avg_loss:.4f}")

    new_path = output_model_dir / f"fruitshoot_{output_version}.pth"

    checkpoint = {
        "model_state_dict": model.state_dict(),
        "fruit_labels": FRUIT_LABELS,
        "ripeness_labels": RIPENESS_LABELS,
    }

    torch.save(checkpoint, new_path)
    print(f"Saved fine-tuned model to: {new_path}")

    active_model_path = Path(
        os.getenv("MODEL_PATH", "backend/ml/weights/best_dual_stream_model.pth")
    )

    torch.save(checkpoint, active_model_path)
    print(f"Replaced active MODEL_PATH model at: {active_model_path}")

    return new_path