const EscrowService = require('../Services/Escrow.Service');
const { sendOk, sendError } = require('../Utils/Response.Helper');

module.exports = {
  handle: async (ctx, user, req) => {
    const action = req && req.action ? req.action : null;
    const data = req && req.data ? req.data : {};

    if (!action) {
      await sendError(ctx, user, 'BAD_REQUEST', 'Missing action field.');
      return { _skipResponse: true };
    }

    switch (action) {
      case 'create_agreement': {
        const result = await EscrowService.createAgreement(ctx, user, data);
        return { message: 'Agreement created', agreement: result };
      }
      case 'deposit': {
        const result = await EscrowService.deposit(ctx, user, data);
        return { message: 'Deposit recorded', deposit: result };
      }
      case 'approve_release': {
        const result = await EscrowService.approveRelease(ctx, user, data);
        return { message: 'Approval recorded', approvals: result.approvals, status: result.status, releaseReceipt: result.releaseReceipt || null };
      }
      case 'get_agreement': {
        const result = await EscrowService.getAgreement(ctx, user, data);
        return { agreement: result };
      }
      default: {
        await sendError(ctx, user, 'UNKNOWN_ACTION', `Unsupported action: ${action}`);
        return { _skipResponse: true };
      }
    }
  }
};
