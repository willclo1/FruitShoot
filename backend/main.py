from dotenv import load_dotenv
load_dotenv()  # make sure env is loaded first

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from routers import userRoutes
from models.users import Base

from database.connect import engine, get_db

app = FastAPI(title="FruitShoot API")
Base.metadata.create_all(bind=engine)

@app.get("/hello")
def hello():
    return {"message": "Hello, FruitShoot!"}

app.include_router(userRoutes.router)



