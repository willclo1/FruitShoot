# FruitShoot Backend

FastAPI backend with:

- Python virtual environment
- FASTAPI
- SQLAlchemy

---

# Requirements

- Python 3.10+
- Docker + Docker Compose
- pip


---

# Local Development

## 1. Create virtual environment

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

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 3. Start MySQL

From the database folder:

```bash
cd database
docker compose up -d
```

This starts:
- MySQL on 127.0.0.1:3307
- Images stored in database/data/images

---

## 4. Create local .env

Create `.env` in project root:

```env
ENV=local

LOCAL_DB_HOST=127.0.0.1
LOCAL_DB_PORT=3307
LOCAL_DB_USER=appuser
LOCAL_DB_PASSWORD=fshoot
LOCAL_DB_NAME=fruitshoot
```

---

## 5. Run backend

From backend:

```bash
ENV=local uvicorn main:app --reload
```

Open:
```
http://localhost:8000/docs
```

---

# Server Deployment (DigitalOcean / Cloud VM)

## 1. SSH into server

```bash
ssh root@YOUR_SERVER_IP
```

---

## 2. Install Docker

```bash
apt update
apt install -y docker.io docker-compose
systemctl enable docker
systemctl start docker
```

---

## 3. Clone repo

```bash
git clone https://github.com/willclo1/FruitShoot.git
cd FruitShoot/database
```

---

## 4. Start MySQL container

```bash
docker compose up -d
```

---

## 5. Create server .env

In project root:

```bash
nano .env
```

Example:

```env
ENV=server

SERVER_DB_HOST=127.0.0.1
SERVER_DB_PORT=3307
SERVER_DB_USER=appuser
SERVER_DB_PASSWORD=fshoot
SERVER_DB_NAME=fruitshoot
```

---

## 6. Run backend

```bash
cd backend
source venv/bin/activate
ENV=server uvicorn main:app --host 0.0.0.0 --port 8000
```

Notes:
- Must use `--host 0.0.0.0`
- Do NOT use `--reload` in production

---

## 7. Open firewall

Allow inbound:

- 22 (SSH)
- 8000 (API)

---

## 8. Access API

```
http://YOUR_SERVER_IP:8000/docs
```

---

# Image Storage

Uploads are stored on disk:

```
database/data/images/
```

This folder:

- persists outside containers
- exists both locally and on server
- is not committed to git

---

# Stop Services

Stop backend:
```
CTRL + C
```

Stop MySQL:
```bash
docker compose down
```

---

