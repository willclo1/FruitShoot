from dotenv import load_dotenv
load_dotenv()  # make sure env is loaded first

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.connect import engine, get_db

app = FastAPI(title="FruitShoot API")


@app.get("/")
def health():
    return {"hello world"}

