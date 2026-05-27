const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'reportapp.db');

let db = null;
let SQL = null;

async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

function loadDatabase() {
  if (!SQL) throw new Error('SQL not initialized. Call initDatabase() first.');
  if (db) return db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

class Stmt {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  get(...params) {
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const results = [];
    const stmt = this.db.prepare(this.sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  run(...params) {
    this.db.run(this.sql, params);
    return {
      lastInsertRowid: this.db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0,
      changes: this.db.getRowsModified()
    };
  }
}

function transaction(fn) {
  return function(...args) {
    const realDb = db;
    realDb.run('BEGIN TRANSACTION');
    try {
      const result = fn.apply(this, args);
      realDb.run('COMMIT');
      saveDatabase();
      return result;
    } catch (err) {
      realDb.run('ROLLBACK');
      throw err;
    }
  };
}

class DbWrapper {
  constructor(realDb) {
    this._db = realDb;
    this.transaction = transaction;
  }

  prepare(sql) {
    return new Stmt(this._db, sql);
  }

  exec(sql) {
    this._db.exec(sql);
    saveDatabase();
  }

  run(sql, ...params) {
    this._db.run(sql, params.length > 0 ? params : undefined);
    saveDatabase();
  }

  close() {
    closeDatabase();
  }
}

let dbWrapper = null;

function getDatabase() {
  if (!db) {
    loadDatabase();
  }
  if (!dbWrapper) {
    dbWrapper = new DbWrapper(db);
  }
  return dbWrapper;
}

async function initDatabase() {
  await initSQL();
  loadDatabase();
  dbWrapper = new DbWrapper(db);
  return dbWrapper;
}

module.exports = { getDatabase, initDatabase, saveDatabase, closeDatabase, Stmt, transaction };