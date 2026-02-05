# FruitShoot – Local Development Database

This folder runs a local MySQL database using Docker for development.

---

## Schema

### users table
Stores account information.

Fields:
- id (auto increment primary key)
- email (unique)
- username (unique)
- password_hash
- created_at

### images table
Stores metadata for uploaded images.

Fields:
- id (auto increment primary key)
- user_id (foreign key → users.id)
- description
- location (filename only, not full path)
- uploaded_at


To modify the exisiting schema go to /init/schema.sql and modify this file. Then rebuild the docker container.

### Image storage

Images are not stored in MySQL.

Images are written to disk and only the filename is saved in the database.

Local path:
```
database/data/images/
```
Server path:
```
srv/fruitshoot/images/
```

---

## Requirements

Install:

- Docker

Verify:

```bash
docker --version
docker compose version
```

---

## Start the database

From the `database/` directory:

```bash
docker compose up -d
```

---

## Connection Settings

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

Note: MySQL runs on 3306 inside Docker and is exposed as 3307 on the host.

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

## Reset database

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
