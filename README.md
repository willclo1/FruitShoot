# FruitShoot

## Description

FruitShoot is a cross-platform mobile app that analyzes the ripeness of selected fruits.  
Users upload images of supported fruits (apples, bananas, strawberries) and receive predictions along with freshness recommendations.

---

## Tech Stack

- Frontend: React Native (Expo)
- Backend: FastAPI (Python)
- Database: MySQL
- Containerization: Docker + Docker Compose
- ML: PyTorch / custom model
- Image Processing: Pillow + HEIF support
- Scraping: Playwright

---

## Project Structure

```
FruitShoot/
├── backend/                # FastAPI backend
├── database/
│   ├── init/              # DB initialization scripts
│   └── data/images/       # Uploaded images (persistent)
├── frontend/              # React Native app
├── docker-compose.yml
├── .env                   # NOT committed
└── .github/workflows/     # CI/CD
```

---

## Requirements

- Docker
- Docker Compose
- Git

---

## Environment Setup

Create a `.env` file in the root directory:

```env
MYSQL_ROOT_PASSWORD=fshoot
MYSQL_DATABASE=fruitshoot
MYSQL_USER=appuser
MYSQL_PASSWORD=fshoot

DB_HOST=mysql
DB_PORT=3306
DB_USER=appuser
DB_PASSWORD=fshoot
DB_NAME=fruitshoot

ENV=development
```

---

## Local Development (Docker)

### Build and run:

```bash
docker compose up -d --build
```

### Check containers:

```bash
docker ps
```

### Test backend:

```bash
curl http://localhost:8000/docs
```

### Open API docs:

```
http://localhost:8000/docs
```

---

## Backend Notes

- Runs on port `8000`
- Uses MySQL via SQLAlchemy
- Uploads stored at:

```
database/data/images/
```

- Static files served at:

```
/uploads/{filename}
```

---

## Frontend Setup (Expo)

From `frontend/`:

```bash
npm install
npx expo start
```

Set API base URL:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_SERVER_IP:8000
```

---

## Deployment (DigitalOcean VM)

### 1. Clone repo

```bash
git clone git@github.com:YOUR_USERNAME/FruitShoot.git
cd FruitShoot
git checkout main
```

### 2. Create `.env`

Same as above, but use:

```env
ENV=production
```

### 3. Run app

```bash
docker compose up -d --build
```

### 4. Verify

```bash
curl http://YOUR_SERVER_IP:8000/hello
```

---

## GitHub Actions (Auto Deploy)

Deployment triggers on push to `main`.

### Required GitHub Secrets:

- `SSH_KEY` → private deploy key
- `HOST` → server IP
- `USER` → ssh user (root or ubuntu)

### Workflow:

- SSH into server
- Pull latest code
- Restart Docker containers

---

## SSH Setup (Deploy Key)

### Generate key:

```bash
ssh-keygen -t ed25519 -C "github-deploy"
```

### Add public key to server:

```bash
cat ~/github_deploy.pub
```

Paste into:

```
~/.ssh/authorized_keys
```

### Add private key to GitHub:

```bash
cat ~/github_deploy
```
---
## Seeding Test Data

FruitShoot uses the same seeding process for both local and production because the backend runs entirely inside Docker.

### Seed Command

Run this from the project root after containers are running:

```bash
docker exec -it fruitshoot-backend python -m scripts.seed_test_data
```

---

## Local Seeding

1. Start containers:

```bash
docker compose up -d --build
```

2. Seed the database:

```bash
docker exec -it fruitshoot-backend python -m scripts.seed_test_data
```

---

## Production Seeding

1. Start containers on server:

```bash
docker compose up -d --build
```

2. Seed the database:

```bash
docker exec -it fruitshoot-backend python -m scripts.seed_test_data
```

---

## Verify Seed Data

Connect to MySQL:

```bash
docker exec -it fruitshoot-mysql mysql -u appuser -pfshoot fruitshoot
```

Run:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM recipes;
```

---

## Logs and Debugging

### View backend logs

```bash
docker logs -f fruitshoot-backend
```

### View database logs

```bash
docker logs -f fruitshoot-mysql
```

### View all containers

```bash
docker ps
```

### Restart containers

```bash
docker compose restart
```

### Rebuild containers

```bash
docker compose down
docker compose up -d --build
```

### Stop everything

```bash
docker compose down
```

### Clean Docker (reset everything)

```bash
docker system prune -a -f
```



## Notes

- Same command works for both local and production.
- Backend must be running before seeding.
- Script avoids duplicate users and recipes.
- Seed includes:
  - test users
  - generated fruit recipes


## Common Issues

### Port already in use

```bash
sudo lsof -i :8000
kill -9 <PID>
```

### Docker reset

```bash
docker system prune -a -f
```

### Playwright errors

Rebuild container:

```bash
docker compose down
docker compose up -d --build
```

---
