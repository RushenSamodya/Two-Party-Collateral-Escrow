const hpc = require('hotpocket-nodejs-contract');
const { initDB } = require('./Data.Deploy/initDB');
const EscrowController = require('./Controllers/Escrow.Controller');
const { sendOk, sendError } = require('./Utils/Response.Helper');

async function contract(ctx) {
  try {
    ctx.log('Escrow Collateral Contract starting...');

    // Initialize database (creates tables if they do not exist)
    await initDB(ctx);

    // Process user messages within this round.
    for (const user of ctx.users) {
      // Read all messages sent by this user in this round
      while (true) {
        const msg = await user.read();
        if (!msg) break; // No more messages from this user

        let req;
        try {
          req = JSON.parse(msg.toString());
        } catch (err) {
          await sendError(ctx, user, 'INVALID_JSON', 'Malformed JSON request.');
          continue;
        }

        try {
          const result = await EscrowController.handle(ctx, user, req);
          if (result && result._skipResponse !== true) {
            await sendOk(ctx, user, result);
          }
        } catch (err) {
          ctx.log(`Error handling request: ${err && err.stack ? err.stack : err}`);
          await sendError(ctx, user, 'REQUEST_ERROR', err && err.message ? err.message : 'Unknown error');
        }
      }
    }

    // End of round: optional persistence hooks could go here.
    ctx.log('Escrow Collateral Contract round complete.');
  } catch (e) {
    // If something goes very wrong, log it. HotPocket will proceed to next round.
    ctx.log(`Fatal contract error: ${e && e.stack ? e.stack : e}`);
  }
}

hpc.init(contract);

// test commit
// test commit from github
