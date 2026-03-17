from sqlalchemy import Column, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import relationship
from models.users import Base


class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    id = Column(BIGINT(unsigned=True), primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(BIGINT(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(BIGINT(unsigned=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User")
    recipe = relationship("Recipe")