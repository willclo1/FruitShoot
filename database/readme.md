# FruitShoot – Database

This project uses a MySQL database to store users, uploaded image metadata, recipes, saved recipes, and retraining samples.

---

## Schema

### users table
Stores account information.

Fields:
- `id` — auto increment primary key
- `email` — unique email
- `username` — unique username
- `password_hash` — hashed password
- `created_at` — account creation timestamp
- `profile_id` — nullable foreign key to `images.id`

---

### images table
Stores metadata for uploaded images.

Fields:
- `id` — auto increment primary key
- `user_id` — foreign key to `users.id`
- `description` — optional text description
- `location` — filename only, not full path
- `uploaded_at` — upload timestamp

---

### recipes table
Stores recipes created by users.

Fields:
- `id` — auto increment primary key
- `user_id` — foreign key to `users.id`
- `title` — recipe title
- `ingredients_description` — recipe ingredients
- `instructions_description` — recipe instructions
- `created_at` — creation timestamp

---

### saved_recipes table
Stores recipes saved by users.

Fields:
- `id` — auto increment primary key
- `user_id` — foreign key to `users.id`
- `recipe_id` — foreign key to `recipes.id`
- `created_at` — save timestamp

Constraints:
- one user cannot save the same recipe more than once

---

### retraining_samples table
Stores model feedback samples for future retraining.

Fields:
- `id` — auto increment primary key
- `image_id` — foreign key to `images.id`
- `fruit_index` — predicted fruit class index
- `ripeness_index` — predicted ripeness class index
- `fruit_confidence` — fruit prediction confidence
- `ripeness_confidence` — ripeness prediction confidence
- `used_for_training` — whether the sample has already been used
- `created_at` — creation timestamp

---

## Modifying the Schema

Edit:

```text
database/init/schema.sql
```

After modifying the schema, reinitialize the database so the changes are applied.

---

## Image Storage

Images are not stored in the database.

Only the filename is stored in MySQL.

Actual uploaded image files are stored at:

```text
database/data/images/
```

---

## Connection Settings

### Local development
Host:

```text
127.0.0.1
```

Port:

```text
3307
```

### Application internal connection
Host:

```text
mysql
```

Port:

```text
3306
```

### Credentials
User:

```text
appuser
```

Password:

```text
fshoot
```

Database:

```text
fruitshoot
```

---

## Notes

- The database stores metadata, not image binaries
- Uploaded files are stored separately on disk
- `profile_id` on `users` links a user to their selected profile image
- `saved_recipes` links users to recipes they want to keep
- `retraining_samples` stores prediction feedback for later model improvement
```
