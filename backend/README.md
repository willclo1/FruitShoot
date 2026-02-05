# FastAPI Backend

Minimal FastAPI server with:

- Python venv
- .env configuration
- SQLAlchemy
- MySQL

---

## Requirements

- Python 3.10+
- MySQL (Docker or remote)
- pip

---

## Setup

### Create virtual environment

Mac/Linux:
```bash
python -m venv venv
```

Windows:
```powershell
python -m venv venv
```

---

### Activate

Mac/Linux:
```bash
source venv/bin/activate
```

Windows:
```powershell
venv\Scripts\Activate.ps1
```

---

### Install dependencies

```bash
pip install -r requirements.txt
```

## Run server

From the `backend/` directory.

### Local database
Mac/Linux:
```bash
ENV=local uvicorn main:app --reload
```

Windows (PowerShell):
```powershell
$env:ENV="local"
uvicorn main:app --reload
```

### Remote/server database
Mac/Linux:
```bash
ENV=server uvicorn main:app --reload
```

Windows (PowerShell):
```powershell
$env:ENV="server"
uvicorn main:app --reload
```

---

## Stop server

```
CTRL + C
```

---

## Exit venv

```bash
deactivate
```

---
