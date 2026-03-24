from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey, Text, Integer, Float, Boolean
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from models.base import Base


class UserImage(Base):
    __tablename__ = "images"

    id = Column(BIGINT(unsigned=True), primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(BIGINT(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    description = Column(Text, nullable=True)
    location = Column(String(1024), nullable=False)
    uploaded_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship(
        "User",
        back_populates="images",
        foreign_keys=[user_id],
    )


class RetrainingImage(Base):
    __tablename__ = "retraining_samples"

    id = Column(BIGINT(unsigned=True), primary_key=True, index=True, autoincrement=True, nullable=False)
    image_id = Column(BIGINT(unsigned=True), ForeignKey("images.id", ondelete="CASCADE"), nullable=False)

    fruit_index = Column(Integer, nullable=False)
    ripeness_index = Column(Integer, nullable=False)

    fruit_confidence = Column(Float, nullable=False)
    ripeness_confidence = Column(Float, nullable=False)

    used_for_training = Column(Boolean, nullable=False, server_default=text("FALSE"))
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))