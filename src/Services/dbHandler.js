const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getConfig } = require('../Constants/Config');

let _db;

function getDb() {
  if (_db) return _db;
  const cfg = getConfig();
  const dbPath = path.resolve('.', cfg.dbPath);
  _db = new sqlite3.Database(dbPath);
  return _db;
}

module.exports = {
  run: (sql, params = []) => new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  })
};
