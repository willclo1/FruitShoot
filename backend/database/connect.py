import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

host = os.getenv("DB_HOST", "127.0.0.1")
port = os.getenv("DB_PORT", "3307")
user = os.getenv("DB_USER", "appuser")
password = os.getenv("DB_PASSWORD", "")
name = os.getenv("DB_NAME", "fruitshoot")

DATABASE_URL = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()