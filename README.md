# Knight PostgreSQL Migration by Coderitter

A database schema migration lib for PostgreSQL.

## Related packages

There is an SQL package [knight-sql](https://github.com/c0deritter/knight-sql) which helps with building SQL strings. It can be combined with [knight-criteria](https://github.com/c0deritter/knight-criteria) and [knight-sql-criteria-filler](https://github.com/c0deritter/knight-sql-criteria-filler). If you are looking for a more sophisticated version for database access you can also use [knight-orm](https://github.com/c0deritter/knight-orm).

Another helpful PostgreSQL tool is [knight-pg-transaction](https://github.com/c0deritter/knight-pg-transaction).

## Install

`npm install knight-pg-migration`

## Overview

### The migration

```typescript
import { PostgresMigration } from 'knight-pg-migration'
import { Pool } from 'pg'

class DbMigration extends PostgresMigration {

    constructor(pool: Pool) {
        super(pool)
    }

    async migrate() {
        await this.version1()
    }

    async version1() {
        if (await this.getVersion() >= 1) {
            return 
        }

        await this.pool.query(
            'CREATE TABLE IF NOT EXISTS User (' +
            'id SERIAL PRIMARY KEY, ' +
            'email VARCHAR(255), ' +
            'firstName VARCHAR(255), ' +
            'lastName VARCHAR(255)' +
            ');')

        await this.increaseVersion()
    }
}

let migration = new DbMigration
migration.migrate()
```

### The available migration methods

```typescript
// check if the version table exists
let exists = await migration.versionTableExists()

// create the version table but only if it not exists
await migration.createVersionTable()

// get the version from the version table
let version = await migration.getVersion()

// set the version explicitly (mistakes are your own)
await migration.setVersion(4)

// increase the version to the next version number
let increasedVersion = await migration.increaseVersion()

// get all tables of the database
let tables = await migration.getTables()

// delete all tables from the database
let clearedTables = await migration.clearDatabase()

// clear the database and recreate the schema
await migration.resetDatabase()
```