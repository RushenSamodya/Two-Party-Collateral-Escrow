const fs = require('fs');
const path = require('path');

let cached;

function getConfig() {
  if (cached) return cached;
  const settingsPath = path.resolve('./src/settings.json');
  let settings = {};
  try {
    const raw = fs.readFileSync(settingsPath);
    settings = JSON.parse(raw.toString());
  } catch (e) {
    // Defaults if settings.json isn't found.
    settings = { agreementMaxDurationDays: 30 };
  }

  const cfg = {
    env: process.env.APP_ENV || 'development',
    dbPath: process.env.DB_PATH || 'escrow.db',
    agreementMaxDurationDays: Number(process.env.AGREEMENT_MAX_DURATION_DAYS || settings.agreementMaxDurationDays || 30)
  };
  cached = cfg;
  return cfg;
}

module.exports = { getConfig };
//comment from Github to main
