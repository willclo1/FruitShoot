# FruitShoot Backend

FastAPI backend for the FruitShoot application.

---

## Requirements

- Python 3.10+
- pip

---

## Local Development

### 1. Create virtual environment

Mac/Linux:

```bash
python -m venv venv
source venv/bin/activate
```

Windows:

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

---

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

---

### 3. Configure environment

The backend reads database settings from a `.env` file .

Example:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=appuser
DB_PASSWORD=fshoot
DB_NAME=fruitshoot
ENV=development
```

---

### 4. Run backend

From the `backend/` directory:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Access

Open in browser:

```
http://127.0.0.1:8000
```

API documentation:

```
http://127.0.0.1:8000/docs
```

---

## Image Storage

Uploaded images are stored on disk:

```
database/data/images/
```

Only the filename is stored in the database.

---

## Notes

- Always use `--host 0.0.0.0` when running the server
- Do not use `--reload` in production
- The model is downloaded into `backend/ml/weights/` if not present
- The backend serves uploaded images through `/uploads`
