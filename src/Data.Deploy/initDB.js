const db = require('../Services/dbHandler');

async function initDB(ctx) {
  await db.run(`CREATE TABLE IF NOT EXISTS agreements (
    id TEXT PRIMARY KEY,
    partyA TEXT NOT NULL,
    partyB TEXT NOT NULL,
    requiredA REAL NOT NULL,
    requiredB REAL NOT NULL,
    conditions TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    agreement_id TEXT NOT NULL,
    party TEXT NOT NULL CHECK(party IN ('A','B')),
    amount REAL NOT NULL,
    proof TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(agreement_id) REFERENCES agreements(id)
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS approvals (
    agreement_id TEXT NOT NULL,
    party TEXT NOT NULL CHECK(party IN ('A','B')),
    approved_at INTEGER NOT NULL,
    UNIQUE(agreement_id, party),
    FOREIGN KEY(agreement_id) REFERENCES agreements(id)
  )`);

  ctx && ctx.log && ctx.log('Database initialized.');
}

module.exports = { initDB };
