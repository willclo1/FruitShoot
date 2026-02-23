from sqlalchemy import Column, String, TIMESTAMP, text, ForeignKey
from sqlalchemy.dialects.mysql import BIGINT, LONGTEXT
from sqlalchemy.orm import relationship
from models.users import Base, User


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(BIGINT(unsigned=True), primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(BIGINT(unsigned=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    ingredients_description = Column(LONGTEXT, nullable=False)
    instructions_description = Column(LONGTEXT, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship("User")
