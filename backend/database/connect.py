import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

ENV = os.getenv("ENV", "local").lower()

if ENV == "server":
    host = os.getenv("SERVER_DB_HOST")
    port = os.getenv("SERVER_DB_PORT", "3306")
    user = os.getenv("SERVER_DB_USER")
    password = os.getenv("SERVER_DB_PASSWORD")
    name = os.getenv("SERVER_DB_NAME")
else:
    host = os.getenv("LOCAL_DB_HOST", "127.0.0.1")
    port = os.getenv("LOCAL_DB_PORT", "3306")
    user = os.getenv("LOCAL_DB_USER", "root")
    password = os.getenv("LOCAL_DB_PASSWORD", "")
    name = os.getenv("LOCAL_DB_NAME", "fruitshoot")

DATABASE_URL = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()