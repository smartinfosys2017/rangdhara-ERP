# Database Backup Module

A dynamic Database Backup module for creating, managing, downloading, and restoring PostgreSQL database backups.

## Features

- Create PostgreSQL database backups.
- Store backups as compressed ZIP files.
- View available backup files with metadata.
- Download existing backup files.
- Delete unwanted backups.
- Restore database records from a backup.
- Track backup download history.
- Handle PostgreSQL data types during restore.
- Handle foreign-key dependencies during restore.
- Support PostgreSQL ENUM and custom data types.
- Use transaction-based restore with savepoint handling.
- Apply permission-based access to backup operations.

## Module Structure

```text
database-backup/
├── module.json
└── src/
    ├── module.js
    ├── lib/
    │   └── database-backup.js
    └── app/
        ├── database-backup/
        │   └── page.jsx
        └── api/
            └── database-backup/
                ├── route.js
                ├── delete/
                │   └── route.js
                ├── download/
                │   └── route.js
                ├── download-history/
                │   └── route.js
                └── restore/
                    └── route.js
```

## Backup Storage

Backup ZIP files are stored in:

```text
storage/database-backups/
```

Each backup contains compressed database information in:

```text
database-backup.json.gz
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/database-backup` | Get backup list |
| POST | `/api/database-backup` | Create a new backup |
| DELETE | `/api/database-backup/delete` | Delete a backup |
| GET | `/api/database-backup/download` | Download an existing backup |
| GET | `/api/database-backup/download-history` | Get download history |
| POST | `/api/database-backup/restore` | Restore database from backup |

## Permissions

The module supports the following permissions:

```text
database_backup.read
database_backup.create
database_backup.restore
database_backup.delete
```

## Database Tables

The module creates the following tables when required:

### DatabaseBackup

Stores backup file information, status, size, and timestamps.

### DatabaseBackupDownload

Stores backup download history including backup ID, file name, IP address, user agent, and download time.

## Backup Workflow

```text
Create Backup
     ↓
Read PostgreSQL Tables
     ↓
Serialize Database Data
     ↓
Create JSON Backup
     ↓
Gzip Compression
     ↓
Create ZIP File
     ↓
Store Backup Metadata
```

## Restore Workflow

```text
Upload Backup ZIP
     ↓
Read Compressed Backup
     ↓
Extract Database Data
     ↓
Check Existing Tables
     ↓
Order Tables by Dependencies
     ↓
Restore Records
     ↓
Handle Foreign-Key Dependencies
     ↓
Commit Transaction
```

## Restore Data Type Handling

The restore process supports conversion for common PostgreSQL data types, including:

- JSON / JSONB
- Numeric / Decimal
- Integer types
- BigInt
- Boolean
- UUID
- Date
- Timestamp
- Bytea
- Arrays
- PostgreSQL ENUM / custom types

Foreign-key dependent records are retried using PostgreSQL savepoints when required.

## Important Notes

- This module performs an application-level PostgreSQL backup.
- It does not use `pg_dump` or `psql`.
- Restore works with tables that already exist in the database.
- PostgreSQL functions, triggers, views, extensions, roles, permissions, and other database-level objects are not fully captured.
- Backup files should be stored securely because they may contain sensitive database information.

## Requirements

- Next.js
- PostgreSQL
- Prisma
- Node.js
- `adm-zip`

## Installation

Place the module inside:

```text
modules/database-backup/
```

Then restart the Next.js application and enable the module from the module management section.

## Module Information

```json
{
    "alias": "database_backup",
    "name": "Database Backup",
    "version": "1.0.0"
}
```

## Storage Location

```text
D:\React\Rangdhara\Finaldemo\storage\database-backups
```

## Status

**Version:** 1.0.0  
**Module:** Database Backup  
**Author:** Smartinfosys