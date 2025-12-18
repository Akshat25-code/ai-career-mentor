const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// Save onboarding data
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, target_role, skill_level, graduation_year } = req.body;

    // Upsert onboarding data
    const result = await db.query(
      `INSERT INTO onboarding_data (user_id, status, target_role, skill_level, graduation_year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         status = EXCLUDED.status,
         target_role = EXCLUDED.target_role,
         skill_level = EXCLUDED.skill_level,
         graduation_year = EXCLUDED.graduation_year
       RETURNING *`,
      [userId, status, target_role, skill_level, graduation_year || null]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Onboarding save error:', err);
    res.status(500).json({ error: 'Failed to save onboarding data' });
  }
});

// Get onboarding data
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query('SELECT * FROM onboarding_data WHERE user_id = $1', [userId]);
    res.json({ data: result.rows[0] || null });
  } catch (err) {
    console.error('Onboarding fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch onboarding data' });
  }
});

module.exports = router;
