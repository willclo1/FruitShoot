import torch
import torch.nn as nn
from torchvision import models
 
class DualStreamFruitModel(nn.Module):
    def __init__(self, num_fruits=4, num_ripeness=4, embedding_dim=16):
        super(DualStreamFruitModel, self).__init__()
       
        weights = models.ResNet50_Weights.DEFAULT
        self.backbone = models.resnet50(weights=weights)
        feature_dim = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
 
        self.fruit_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_fruits)
        )
 
 
        self.fruit_embedding = nn.Linear(num_fruits, embedding_dim)
 
        self.ripeness_head = nn.Sequential(
            nn.Linear(feature_dim + embedding_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_ripeness)
        )
 
    def forward(self, full_x, cropped_x):
        global_features = self.backbone(full_x)
        fruit_logits = self.fruit_head(global_features)
 
        fruit_probs = torch.softmax(fruit_logits, dim=1)
        fruit_env = self.fruit_embedding(fruit_probs)
 
        local_features = self.backbone(cropped_x)
        combined_features = torch.cat((local_features, fruit_env), dim=1)
       
        ripe_logits = self.ripeness_head(combined_features)
 
        return fruit_logits, ripe_logits
 
 