import { expect } from 'chai'
import 'mocha'
import { Pool, PoolConfig } from 'pg'
import PostgresMigration from '../src/PgMigration'

let pool: Pool = new Pool(<PoolConfig> {
  host: 'db',
  database: 'migration_test',
  user: 'migration_test',
  password: 'migration_test'
})

after(async function() {
  await pool.end()
})

describe('PostgresMigration', function() {
  beforeEach(async function() {
    await pool.query('DROP TABLE IF EXISTS version CASCADE')
    await pool.query('DROP TABLE IF EXISTS a CASCADE')
    await pool.query('DROP TABLE IF EXISTS b CASCADE')
  })

  describe('getTables', function() {
    it('should return all table names', async function() {
      await pool.query('CREATE TABLE a ( id SERIAL PRIMARY KEY )')
      await pool.query('CREATE TABLE b ( id SERIAL PRIMARY KEY, a_id INTEGER REFERENCES a)')
      
      let migration = new TestMigration(pool, 'version')      
      let tables = await migration.getTables()
      expect(tables.length).to.equal(2)
      expect(tables.indexOf('a')).to.not.equal(-1)
      expect(tables.indexOf('b')).to.not.equal(-1)
    })
  })

  describe('clearDatabase', function() {
    it('should clear existing tables', async function() {
      await pool.query('CREATE TABLE IF NOT EXISTS a ( id SERIAL PRIMARY KEY )')
      await pool.query('CREATE TABLE IF NOT EXISTS b ( id SERIAL PRIMARY KEY, a_id INTEGER REFERENCES a)')
      await pool.query('INSERT INTO a DEFAULT VALUES; INSERT INTO b (a_id) VALUES (1);')

      let migration = new TestMigration(pool, 'version')
      
      await migration.clearDatabase()

      let tables = await migration.getTables()
      expect(tables.length).to.equal(0)
    })
  })

  describe('versionTableExists', function() {
    it('should return false if the version table does not exist', async function() {
      let migration = new TestMigration(pool, 'version')
      await migration.versionTableExists()
    })

    it('should return true if the version table does not exist', async function() {
      await pool.query(`CREATE TABLE version ( version integer )`)
      let migration = new TestMigration(pool, 'version')
      await migration.versionTableExists()
      await pool.query(`DROP TABLE version`)
    })
  })

  describe('createVersionTable', function() {
    it('should create the version table if it is not there and insert version 0', async function() {
      await pool.query('DROP TABLE IF EXISTS version')

      let migration = new TestMigration(pool, 'version')
      await migration.createVersionTable()

      let tables = await migration.getTables()
      expect(tables.indexOf('version')).to.not.equal(-1)

      let versionResult = await pool.query('SELECT * FROM version')
      expect(versionResult.rowCount).to.equal(1)
      expect(versionResult.rows[0].version).to.equal(0)
    })

    it('should insert version 0 if the table is already there but no version is present', async function() {
      let migration = new TestMigration(pool, 'version')
      await migration.createVersionTable()

      await pool.query('DELETE FROM version')

      let selectResultBefore = await pool.query('SELECT * FROM version')
      expect(selectResultBefore.rowCount).to.equal(0)

      migration.createVersionTable()

      let selectResultAfter = await pool.query('SELECT * FROM version')
      expect(selectResultAfter.rowCount).to.equal(1)
      expect(selectResultAfter.rows[0].version).to.equal(0)
    })
  })

  describe('getVersion', function() {
    it('should create the version table and return the version', async function() {
      let migration = new TestMigration(pool, 'version')
      
      let version = await migration.getVersion()
      let versionTableExists = await migration.versionTableExists()

      expect(versionTableExists).to.be.true
      expect(version).to.equal(0)
    })
  })

  describe('setVersion', function() {
    it('should create the version table and set the version', async function() {
      let migration = new TestMigration(pool, 'version')
      
      await migration.setVersion(5)
      let versionTableExists = await migration.versionTableExists()
      let version = await migration.getVersion()

      expect(versionTableExists).to.be.true
      expect(version).to.equal(5)
    })
  })

  describe('increaseVersion', function() {
    it('should create the version table and increase the version', async function() {
      let migration = new TestMigration(pool, 'version')
      
      let returnedVersion = await migration.increaseVersion()
      let versionTableExists = await migration.versionTableExists()
      let version = await migration.getVersion()

      expect(versionTableExists).to.be.true
      expect(version).to.equal(1)
      expect(returnedVersion).to.equal(1)
    })
  })
})

class TestMigration extends PostgresMigration {
  async migrate(): Promise<void> {
    
  }
}