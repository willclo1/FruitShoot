import torch.nn as nn
from torchvision import models


class MultiTaskResNet(nn.Module):
    def __init__(self, num_fruits=4, num_ripeness=4):
        super().__init__()

        self.backbone = models.resnet18(weights=None)
        num_ftrs = self.backbone.fc.in_features

        self.backbone.fc = nn.Identity()

        self.fruit_head = nn.Linear(num_ftrs, num_fruits)
        self.ripeness_head = nn.Linear(num_ftrs, num_ripeness)

    def forward(self, x):
        features = self.backbone(x)
        fruit_out = self.fruit_head(features)
        ripe_out = self.ripeness_head(features)
        return fruit_out, ripe_out