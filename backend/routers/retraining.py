from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from database.connect import get_db
from models.images import RetrainingImage as RetrainingSample

router = APIRouter(prefix="/retrain", tags=["retraining"])


class RetrainingImageCreate(BaseModel):
    image_id: int
    fruit_index: int
    ripeness_index: int
    fruit_confidence: float
    ripeness_confidence: float


class RetrainingImage(BaseModel):
    id: int
    image_id: int
    fruit_index: int
    ripeness_index: int
    fruit_confidence: float
    ripeness_confidence: float
    used_for_training: bool
    created_at: datetime

    class Config:
        orm_mode = True


@router.post("/add", response_model=RetrainingImage)
def add_retraining_image(
    payload: RetrainingImageCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    sample = RetrainingSample(
        image_id=payload.image_id,
        fruit_index=payload.fruit_index,
        ripeness_index=payload.ripeness_index,
        fruit_confidence=payload.fruit_confidence,
        ripeness_confidence=payload.ripeness_confidence,
    )

    db.add(sample)
    db.commit()
    db.refresh(sample)

    return sample