export default abstract class PostgresMigration {

  pool: any
  database: string
  versionTable: string

  constructor(pool: any, versionTable: string = 'version') {
    this.database = (<any> pool).options.database
    this.pool = pool
    this.versionTable = versionTable
  }

  abstract migrate(): Promise<void>

  async versionTableExists(): Promise<boolean> {
    let tables = await this.getTables()
    return tables.indexOf(this.versionTable) > -1
  }

  async createVersionTable(): Promise<void> {
    if (! await this.versionTableExists()) {
      try {
        await this.pool.query(`CREATE TABLE IF NOT EXISTS ${this.versionTable} ( version INTEGER )`)
      }
      catch (e) {
        throw new Error(e)
      }

      try {
        await this.pool.query(`INSERT INTO ${this.versionTable} (version) VALUES (0)`)
      }
      catch (e) {
        throw new Error(e)
      }
    }
    else {
      try {
        var selectResult = await this.pool.query(`SELECT * FROM ${this.versionTable}`)
      }
      catch (e) {
        throw new Error(e)
      }

      if (selectResult.rowCount == 0) {
        try {
          await this.pool.query(`INSERT INTO ${this.versionTable} (version) VALUES (0)`)
        }
        catch (e) {
          throw new Error(e)
        }
      }  
    }
  }

  async getVersion(): Promise<number> {
    await this.createVersionTable()

    let selectResult = await this.pool.query(`SELECT * FROM ${this.versionTable}`)
    if (selectResult.rowCount == 1) {
      return selectResult.rows[0].version
    }
    else {
      throw new Error('Row count of version table was not exactly 1')
    }
  }

  async setVersion(version: number): Promise<void> {
    await this.createVersionTable()
    try {
      await this.pool.query(`UPDATE ${this.versionTable} SET version = ${version}`)
    }
    catch (e) {
      throw new Error(e)
    }
  }

  async increaseVersion(): Promise<number> {
    await this.createVersionTable()

    try {
      var updateResult = await this.pool.query(`UPDATE ${this.versionTable} SET version = version + 1 RETURNING *`)
    }
    catch (e) {
      throw new Error(e)
    }

    return updateResult.rows[0].version
  }

  async getTables(): Promise<string[]> {
    try {
      var result = await this.pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
    }
    catch (e) {
      throw new Error(e)
    }

    let tables: string[] = []
    for (let row of result.rows) {
      tables.push(row.table_name)
    }

    return tables
  }

  async clearDatabase(): Promise<string[]> {
    let tables = await this.getTables()

    let dropTablesQuery: string = ''
    for (let table of tables) {
      dropTablesQuery += `DROP TABLE ${table} CASCADE;`
    }

    try {
      await this.pool.query(dropTablesQuery)
    }
    catch (e) {
      throw new Error(e)
    }

    let remainingTables = await this.getTables()
    while (remainingTables.length > 0) {
      remainingTables = await this.clearDatabase()
    }

    return tables
  }

  async resetDatabase(): Promise<void> {
    await this.clearDatabase()
    await this.migrate()
  }
}