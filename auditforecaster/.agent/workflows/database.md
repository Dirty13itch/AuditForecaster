---
description: Database management operations (backup, restore, migration)
---

# Database Management Workflow

## Starting the Database

// turbo
```bash
docker-compose up -d
```

Wait for PostgreSQL to be healthy:
```bash
docker-compose ps
```

## Running Migrations

After updating the schema, generate and apply migrations:

// turbo
```bash
npx prisma migrate dev --name migration_name
```

## Seeding the Database

To populate with initial/test data:

// turbo
```bash
npx prisma db seed
```

## Backup Database

Create a backup of the current database:

```bash
docker exec fieldinspect-db pg_dump -U fieldinspect fieldinspect > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Restore Database

Restore from a backup file:

```bash
docker exec -i fieldinspect-db psql -U fieldinspect fieldinspect < backup_file.sql
```

## Reset Database (Development Only)

**WARNING**: This will delete all data!

```bash
npx prisma migrate reset
```

## Stop Database

```bash
docker-compose down
```

## View Database Logs

```bash
docker-compose logs -f postgres
```

## Access Database CLI

```bash
docker exec -it fieldinspect-db psql -U fieldinspect fieldinspect
```
