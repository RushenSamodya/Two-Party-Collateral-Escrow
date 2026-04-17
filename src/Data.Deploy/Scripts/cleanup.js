/*
  Utility script placeholder: Add maintenance tasks here.
  Examples:
    - Vacuum DB
    - Export reports
*/

const db = require('../../Services/dbHandler');

async function vacuum() {
  await db.run('VACUUM');
}

module.exports = { vacuum };
