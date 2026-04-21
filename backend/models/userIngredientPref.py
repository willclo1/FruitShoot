from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.mysql import BIGINT
from models.base import Base


class UserIngredientPreference(Base):
    __tablename__ = "user_ingredient_preferences"

    id = Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    user_id = Column(
        BIGINT(unsigned=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ingredient_name = Column(String(255), nullable=False)
    ingredient_count = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("user_id", "ingredient_name", name="uq_user_ingredient"),
    )