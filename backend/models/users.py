from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BIGINT(unsigned=True), primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    profile_id = Column(
        BIGINT(unsigned=True),
        ForeignKey("images.id", ondelete="SET NULL"),
        nullable=True,
    )
    images = relationship(
        "UserImage",
        back_populates="user",
        foreign_keys="UserImage.user_id",
        cascade="all, delete-orphan",
    )

    profile_image = relationship(
        "UserImage",
        foreign_keys=[profile_id],
        post_update=True,
    )