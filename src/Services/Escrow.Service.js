const { v4: uuidv4 } = require('uuid');
const db = require('./dbHandler');
const { AGREEMENT_STATUS } = require('../Constants/constants');

function nowTs() { return Math.floor(Date.now() / 1000); }

async function validateParties(partyA, partyB) {
  if (!partyA || !partyB) throw new Error('Both partyA and partyB are required.');
  if (typeof partyA !== 'string' || typeof partyB !== 'string') throw new Error('Invalid party public keys.');
  if (partyA === partyB) throw new Error('partyA and partyB must be different.');
}

async function isUserParty(userPub, partyA, partyB) {
  return userPub === partyA || userPub === partyB;
}

async function totalsForAgreement(agreementId) {
  const rows = await db.all('SELECT party, SUM(amount) AS total FROM deposits WHERE agreement_id = ? GROUP BY party', [agreementId]);
  const totals = { A: 0, B: 0 };
  for (const r of rows) {
    if (r.party === 'A') totals.A = r.total || 0; else if (r.party === 'B') totals.B = r.total || 0;
  }
  return totals;
}

async function approvalsForAgreement(agreementId) {
  const rows = await db.all('SELECT party, approved_at FROM approvals WHERE agreement_id = ?', [agreementId]);
  const result = { A: null, B: null };
  for (const r of rows) {
    if (r.party === 'A') result.A = r.approved_at;
    else if (r.party === 'B') result.B = r.approved_at;
  }
  return result;
}

async function tryReleaseIfEligible(agreement) {
  if (!agreement) return { released: false };
  if (agreement.status === AGREEMENT_STATUS.RELEASED) return { released: true };

  const totals = await totalsForAgreement(agreement.id);
  const approvals = await approvalsForAgreement(agreement.id);

  const depositsMet = (totals.A >= agreement.requiredA) && (totals.B >= agreement.requiredB);
  const approvalsMet = approvals.A && approvals.B;
  const notExpired = !agreement.expiresAt || nowTs() <= agreement.expiresAt;

  if (depositsMet && approvalsMet && notExpired) {
    await db.run('UPDATE agreements SET status = ?, released_at = ? WHERE id = ?', [AGREEMENT_STATUS.RELEASED, nowTs(), agreement.id]);
    // A release receipt can include necessary instructions. Here we provide a simple structured receipt.
    const receipt = {
      agreementId: agreement.id,
      status: AGREEMENT_STATUS.RELEASED,
      totals,
      approvals,
      releasedAt: nowTs(),
      note: 'Conditions met: both parties approved and collateral thresholds reached.'
    };
    return { released: true, receipt };
  }

  return { released: false };
}

module.exports = {
  createAgreement: async (ctx, user, data) => {
    const { partyA, partyB, requiredA, requiredB, conditions, expiresAt } = data;
    await validateParties(partyA, partyB);

    const userPub = user.publicKey || user.pubkey || null;
    if (!userPub) throw new Error('User public key not available.');
    if (!(await isUserParty(userPub, partyA, partyB))) throw new Error('Creator must be one of the parties.');

    const reqA = Number(requiredA);
    const reqB = Number(requiredB);
    if (!Number.isFinite(reqA) || reqA <= 0) throw new Error('Invalid requiredA.');
    if (!Number.isFinite(reqB) || reqB <= 0) throw new Error('Invalid requiredB.');

    const id = uuidv4();
    const createdAt = nowTs();
    const status = AGREEMENT_STATUS.PENDING;

    await db.run(
      'INSERT INTO agreements (id, partyA, partyB, requiredA, requiredB, conditions, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, partyA, partyB, reqA, reqB, conditions || '', status, createdAt, expiresAt || null]
    );

    const agreement = await db.get('SELECT * FROM agreements WHERE id = ?', [id]);
    return agreement;
  },

  deposit: async (ctx, user, data) => {
    const { agreementId, amount, proof } = data;
    if (!agreementId) throw new Error('agreementId is required.');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid deposit amount.');

    const agreement = await db.get('SELECT * FROM agreements WHERE id = ?', [agreementId]);
    if (!agreement) throw new Error('Agreement not found.');
    if (agreement.status === AGREEMENT_STATUS.RELEASED) throw new Error('Agreement already released.');
    if (agreement.expires_at && nowTs() > agreement.expires_at) throw new Error('Agreement expired.');

    const userPub = user.publicKey || user.pubkey || null;
    const party = (userPub === agreement.partyA) ? 'A' : (userPub === agreement.partyB ? 'B' : null);
    if (!party) throw new Error('Depositor is not a party of this agreement.');

    const depositId = uuidv4();
    await db.run(
      'INSERT INTO deposits (id, agreement_id, party, amount, proof, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [depositId, agreementId, party, amt, proof || '', nowTs()]
    );

    const totals = await totalsForAgreement(agreementId);
    return { depositId, totals };
  },

  approveRelease: async (ctx, user, data) => {
    const { agreementId } = data;
    if (!agreementId) throw new Error('agreementId is required.');

    const agreement = await db.get('SELECT * FROM agreements WHERE id = ?', [agreementId]);
    if (!agreement) throw new Error('Agreement not found.');

    const userPub = user.publicKey || user.pubkey || null;
    const party = (userPub === agreement.partyA) ? 'A' : (userPub === agreement.partyB ? 'B' : null);
    if (!party) throw new Error('Approver is not a party of this agreement.');

    const existing = await db.get('SELECT * FROM approvals WHERE agreement_id = ? AND party = ?', [agreementId, party]);
    if (!existing) {
      await db.run('INSERT INTO approvals (agreement_id, party, approved_at) VALUES (?, ?, ?)', [agreementId, party, nowTs()]);
    }

    const approvals = await approvalsForAgreement(agreementId);
    const releaseCheck = await tryReleaseIfEligible(agreement);

    const updated = await db.get('SELECT * FROM agreements WHERE id = ?', [agreementId]);

    return { approvals, status: updated.status, releaseReceipt: releaseCheck.receipt || null };
  },

  getAgreement: async (ctx, user, data) => {
    const { agreementId } = data;
    if (!agreementId) throw new Error('agreementId is required.');

    const agreement = await db.get('SELECT * FROM agreements WHERE id = ?', [agreementId]);
    if (!agreement) throw new Error('Agreement not found.');

    const totals = await totalsForAgreement(agreementId);
    const approvals = await approvalsForAgreement(agreementId);

    return { agreement, totals, approvals };
  }
};

// to test from GitHub
