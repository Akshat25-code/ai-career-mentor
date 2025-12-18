const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const db = require('../db');

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [resumeRes, interviewRes, roadmapRes] = await Promise.all([
      db.query(
        'SELECT ats_score, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      ),
      db.query(
        'SELECT overall_score, created_at FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      ),
      db.query(
        'SELECT progress_percent, target_role, updated_at FROM roadmaps WHERE user_id = $1 LIMIT 1',
        [userId]
      ),
    ]);

    const lastResume = resumeRes.rows[0] || null;
    const lastInterview = interviewRes.rows[0] || null;
    const roadmap = roadmapRes.rows[0] || null;

    return res.json({
      ok: true,
      lastResume,
      lastInterview,
      roadmap,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

module.exports = router;
