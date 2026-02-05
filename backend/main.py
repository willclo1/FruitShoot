from dotenv import load_dotenv
load_dotenv()  # make sure env is loaded first

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.connect import engine, get_db

app = FastAPI(title="FruitShoot API")


# -------------------------
# Startup DB check
# -------------------------
@app.on_event("startup")
def startup_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connected successfully")
    except Exception as e:
        print("❌ Database connection failed")
        print(e)


# -------------------------
# Basic routes
# -------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db")
def db_test(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar_one()
    return {"db_ok": result == 1}