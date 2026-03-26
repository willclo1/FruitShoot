import torch
import torch.nn as nn
from torchvision import models


class ConditionalFruitModel(nn.Module):
    def __init__(self, num_fruits=4, num_ripeness=4, embedding_dim=16):
        super(ConditionalFruitModel, self).__init__()

        self.backbone = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        feature_dim = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()

        self.fruit_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_fruits)
        )
        self.fruit_embedding = nn.Linear(num_fruits, embedding_dim)

        self.ripe_head = nn.Sequential(
            nn.Linear(feature_dim + embedding_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_ripeness)
        )

    def forward(self, x):
        features = self.backbone(x)

        fruit_logits = self.fruit_head(features)

        fruit_probs = torch.softmax(fruit_logits, dim=1)
        fruit_cond = self.fruit_embedding(fruit_probs)

        combined_features = torch.cat((features, fruit_cond), dim=1)

        ripe_logits = self.ripe_head(combined_features)

        return fruit_logits, ripe_logits