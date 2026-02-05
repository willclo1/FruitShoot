# FastAPI – Minimal Starter

This project runs a very simple FastAPI server using:

- 1 file (`main.py`)
- 1 virtual environment (`venv`)
- uvicorn

---

## Requirements

- Python 3.10+
- pip

Check:

```bash
python --version
```

---

## Setup

### 1. Create virtual environment

Mac/Linux:
```bash
python -m venv venv
```

Windows:
```powershell
python -m venv venv
```

---

### 2. Activate virtual environment

Mac/Linux:
```bash
source venv/bin/activate
```

Windows (PowerShell):
```powershell
venv\Scripts\Activate.ps1
```

You should see:
```
(venv)
```

---

### 3. Install dependencies

```bash
pip install fastapi uvicorn
```

---

## Run the server

```bash
uvicorn main:app --reload
```

- API: http://127.0.0.1:8000

---

## Stop server

Press:
```
CTRL + C
```

---

## Exit virtual environment

```bash
deactivate
```
