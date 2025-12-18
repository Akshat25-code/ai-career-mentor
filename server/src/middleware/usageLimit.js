const db = require('../db');

function getPeriodYm(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getLimits() {
  return {
    resume: Number(process.env.FREE_RESUME_ANALYSES || 3),
    interview: Number(process.env.FREE_INTERVIEWS || 5),
  };
}

async function getQuotaSnapshot(userId) {
  const periodYm = getPeriodYm();
  const limits = getLimits();
  const counter = await getOrCreateCounter(userId, periodYm);

  const resumeUsed = Number(counter.resume_analyses_used || 0);
  const interviewUsed = Number(counter.interviews_used || 0);

  return {
    period_ym: periodYm,
    limits,
    used: {
      resume: resumeUsed,
      interview: interviewUsed,
    },
    remaining: {
      resume: Math.max(0, limits.resume - resumeUsed),
      interview: Math.max(0, limits.interview - interviewUsed),
    },
  };
}

async function getOrCreateCounter(userId, periodYm) {
  const existing = await db.query(
    'SELECT * FROM usage_counters WHERE user_id = $1 AND period_ym = $2',
    [userId, periodYm]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await db.query(
    'INSERT INTO usage_counters (user_id, period_ym) VALUES ($1, $2) RETURNING *',
    [userId, periodYm]
  );
  return created.rows[0];
}

function requireQuota(kind) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const periodYm = getPeriodYm();
      const limits = getLimits();
      const counter = await getOrCreateCounter(userId, periodYm);

      const used = kind === 'resume' ? counter.resume_analyses_used : counter.interviews_used;
      const limit = kind === 'resume' ? limits.resume : limits.interview;

      if (used >= limit) {
        return res.status(429).json({
          error: 'Quota exceeded',
          period_ym: periodYm,
          limit,
          used,
        });
      }

      // Attach for downstream usage
      req.quota = { periodYm, limit, used, kind };
      return next();
    } catch (err) {
      console.error('Quota middleware error:', err);
      return res.status(500).json({ error: 'Quota check failed' });
    }
  };
}

async function incrementUsage(userId, kind) {
  const periodYm = getPeriodYm();
  const field = kind === 'resume' ? 'resume_analyses_used' : 'interviews_used';
  await db.query(
    `INSERT INTO usage_counters (user_id, period_ym, ${field})
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, period_ym)
     DO UPDATE SET ${field} = usage_counters.${field} + 1, updated_at = CURRENT_TIMESTAMP`,
    [userId, periodYm]
  );
}

module.exports = { requireQuota, incrementUsage, getQuotaSnapshot };
