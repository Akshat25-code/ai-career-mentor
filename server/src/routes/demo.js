const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { seedForUser } = require('../demo/seed');

router.post('/seed', requireAuth, async (req, res) => {
  try {
    const result = await seedForUser(req.user.id);
    return res.json(result);
  } catch (err) {
    console.error('Demo seed error:', err);
    return res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

module.exports = router;
