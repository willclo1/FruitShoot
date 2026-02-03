# FruitShoot – Local Development Database

This folder runs a **local MySQL database** using Docker for development.

---

## Requirements

Install:

- Docker (Docker Desktop or docker engine + compose plugin)

Verify:

```bash
docker --version
docker compose version
```

---

## Start the database

From this `database/` directory:

```bash
docker compose up -d
```

That’s it. The database is now running.

---

## Connection Settings

Use these values in your API:

Host:
```
localhost
```

Port:
```
3307
```

User:
```
appuser
```

Password:
```
fshoot
```

Database:
```
fruitshoot
```

---

## Open MySQL shell

App user:

```bash
docker exec -it fruitshoot-mysql mysql -u appuser -pfshoot fruitshoot
```

Root:

```bash
docker exec -it fruitshoot-mysql mysql -u root -pfshoot
```

---

## Stop database

```bash
docker compose down
```

---

## Reset database (wipe everything)

```bash
docker compose down -v
docker compose up -d
```

---

## View logs

```bash
docker logs -f fruitshoot-mysql
```

---

## Quick Start

```bash
cd database
docker compose up -d
```

---

## Notes

- Every developer has their own local DB
- No internet access required
- Schema/migrations should be managed by the API
- Password is for development only
