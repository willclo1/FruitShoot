# FruitShoot

## Description
FruitShoot is a cross-platform mobile app that analyzes the ripeness of selected fruits. Users upload images of supported fruits (apples, bananas, strawberries) and receive recommendations about freshness.

## Tech Stack
- **Frontend:** React Native (Expo)
- **Backend:** FastAPI (Python)
- **Database:** MySQL
- **Containerization:** Docker + Docker Compose

## Architecture
The backend and database run in Docker containers, while the Expo frontend runs locally on the host machine.

```
Expo App → FastAPI Backend Container → MySQL Container
```

## Running Backend + Database (Docker)

### Local Development
From the project root:

```bash
docker compose --env-file .env.local up -d --build
```

Backend API:
```
http://localhost:8000
```

MySQL:
```
Host: 127.0.0.1
Port: 3307
```

### Server Deployment
On the server:

```bash
docker compose --env-file .env.server up -d --build
```

API:
```
http://SERVER_IP:8000
```

## Running the Frontend (Expo)

The Expo app runs outside Docker.

### Local (connect to local backend)

```bash
cd frontend
npm run start:local
```

### Server Testing (connect to remote backend)

```bash
cd frontend
npm run start:server
```

Frontend environment variables determine which backend URL is used.

## Testing on a Real Device (Important)

If using Expo Go on a physical phone, you cannot use `127.0.0.1` or `localhost`.

You must change the frontend environment variable to your computer’s LAN IP address:

```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:8000
```

Example:
```
http://192.168.1.25:8000
```

Your phone and computer must be on the same network.

## Image Storage

Uploaded images are stored on disk and persist outside containers:

```
database/data/images/
```

This directory:
- Persists between container restarts
- Is shared by containers
- Is not committed to Git
