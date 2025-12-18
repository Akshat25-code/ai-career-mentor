const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { getQuotaSnapshot } = require('../middleware/usageLimit');

router.get('/status', requireAuth, async (req, res) => {
  try {
    const snapshot = await getQuotaSnapshot(req.user.id);
    return res.json({ ok: true, ...snapshot });
  } catch (err) {
    console.error('Usage status error:', err);
    return res.status(500).json({ error: 'Failed to load usage status' });
  }
});

module.exports = router;
