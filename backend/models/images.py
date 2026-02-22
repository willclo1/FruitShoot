from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import DeclarativeBase, relationship
from models.base import Base



class UserImage(Base):
    __tablename__ = "images"

    id = Column(BIGINT(unsigned=True), primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(BIGINT(unsigned=True), ForeignKey("users.id"), nullable=False)
    description = Column(String(255), nullable=True)
    location = Column(String(1024), nullable=False)
    uploaded_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User", back_populates="image")