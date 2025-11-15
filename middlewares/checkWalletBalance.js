const prisma = require('../config/db');

module.exports = async function checkWalletBalance(req, res, next) {
  try {
    const userId = req.userId;
    const amount = Number(req.body?.amount);
    if (!userId) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'User not set. Ensure requireUser middleware runs first.' });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Invalid or missing amount' });
    }

    const wallet = await prisma.wallet.findFirst({ where: { user_id: userId, user_type: 'customer' } });
    if (!wallet) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Customer wallet not found' });
    }
    if (Number(wallet.balance) < amount) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Insufficient wallet balance' });
    }

    req.wallet = wallet;
    next();
  } catch (e) {
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Wallet check failed', error: e.message });
  }
}
