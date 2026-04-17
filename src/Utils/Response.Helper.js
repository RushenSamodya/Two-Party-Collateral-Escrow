function toBuf(obj) {
  try { return Buffer.from(JSON.stringify(obj)); } catch { return Buffer.from('{}'); }
}

async function sendResponse(ctx, user, payload) {
  // Prefer user.send if available, otherwise fallback to hypothetical ctx.sendResponse
  if (user && typeof user.send === 'function') {
    return user.send(toBuf(payload));
  }
  if (ctx && typeof ctx.sendResponse === 'function') {
    return ctx.sendResponse(user, toBuf(payload));
  }
  // As a last resort, do nothing
  ctx && ctx.log && ctx.log('sendResponse fallback: no valid send method.');
}

async function sendOk(ctx, user, data) {
  return sendResponse(ctx, user, { status: 'ok', data });
}

async function sendError(ctx, user, code, message) {
  return sendResponse(ctx, user, { status: 'error', error: { code, message } });
}

module.exports = { sendOk, sendError };

// test github commit 2
