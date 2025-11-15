module.exports = function requireUser(req, res, next) {
  try {
    const userId = req.headers['x-user-id'] || req.headers['x-userid'] || req.headers['x_user_id'];
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Missing x-user-id header' });
    }
    const uid = String(userId).trim();
    req.userId = uid;
    if (!req.body) req.body = {};
    if (!req.body.customerId) req.body.customerId = uid;
    next();
  } catch (e) {
    return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Invalid user header' });
  }
}
