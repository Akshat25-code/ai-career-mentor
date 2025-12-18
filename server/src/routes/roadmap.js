const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

function safeJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function computeProgress(roadmapData) {
  const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
  const milestones = phases.flatMap(p => (Array.isArray(p.milestones) ? p.milestones : []));
  const total = milestones.length;
  const done = milestones.filter(m => !!m.done).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, progress };
}

function generateRoadmap({ targetRole, skillLevel }) {
  const role = (targetRole || 'Software Engineer').trim();
  const level = (skillLevel || 'beginner').toLowerCase();

  const base = {
    version: 1,
    targetRole: role,
    createdAt: new Date().toISOString(),
    phases: [],
  };

  const mk = (id, title, description, resources = []) => ({
    id,
    title,
    description,
    done: false,
    resources,
  });

  // Keep it simple + hackathon-safe: one checklist per role
  const roleKey = role.toLowerCase();

  if (roleKey.includes('data')) {
    base.phases = [
      {
        title: 'Foundations (Week 1-2)',
        milestones: [
          mk('d1', 'SQL basics + joins', 'Write queries with joins, group by, and window functions.', [
            { title: 'SQLBolt', url: 'https://sqlbolt.com/' },
          ]),
          mk('d2', 'Spreadsheet + charts', 'Build a small dashboard with charts and pivots.'),
          mk('d3', 'Python for analysis', 'Use pandas to clean, merge, and summarize data.', [
            { title: 'pandas docs', url: 'https://pandas.pydata.org/docs/' },
          ]),
        ],
      },
      {
        title: 'Projects (Week 3-4)',
        milestones: [
          mk('d4', 'Portfolio project #1', 'Analyze a public dataset and publish insights.'),
          mk('d5', 'Visualization tool', 'Create a Tableau/Power BI dashboard and share screenshots.'),
        ],
      },
      {
        title: 'Interview Readiness (Week 5)',
        milestones: [
          mk('d6', 'Story bank (STAR)', 'Write 6-8 STAR stories for common questions.'),
          mk('d7', 'Mock interviews', 'Do 3 mocks and iterate resume + answers.'),
        ],
      },
    ];
  } else if (roleKey.includes('product manager')) {
    base.phases = [
      {
        title: 'PM Fundamentals (Week 1-2)',
        milestones: [
          mk('p1', 'Write a PRD', 'Draft a one-page PRD for a feature with success metrics.'),
          mk('p2', 'User research plan', 'Define interview questions and recruitment plan.'),
          mk('p3', 'Metrics + funnel', 'Pick a north-star metric and supporting metrics.'),
        ],
      },
      {
        title: 'Execution (Week 3-4)',
        milestones: [
          mk('p4', 'Roadmap + prioritization', 'Build a roadmap and prioritize with RICE/MoSCoW.'),
          mk('p5', 'Experiment design', 'Design 2 experiments with hypotheses and guardrails.'),
        ],
      },
      {
        title: 'Interview Readiness (Week 5)',
        milestones: [
          mk('p6', 'Case practice', 'Practice 5 product cases and refine structure.'),
          mk('p7', 'Story bank', 'Prepare 8 behavioral stories and outcomes.'),
        ],
      },
    ];
  } else {
    // Default: Software / Full-stack
    const isAdvanced = level === 'advanced';
    base.phases = [
      {
        title: 'Core Skills (Week 1-2)',
        milestones: [
          mk('s1', 'DSA basics', 'Practice arrays, strings, hashmaps, and complexity.'),
          mk('s2', 'Backend fundamentals', 'Build a small REST API with validation and auth.'),
          mk('s3', 'Frontend fundamentals', 'Build a small React UI with forms and routing.'),
        ],
      },
      {
        title: 'Projects (Week 3-4)',
        milestones: [
          mk('s4', 'Project #1', 'Ship a complete CRUD app with DB + deployment.'),
          mk('s5', 'Project #2', isAdvanced ? 'Add caching/queues/observability to a project.' : 'Build a second project focused on your target role.'),
        ],
      },
      {
        title: 'Interview Readiness (Week 5)',
        milestones: [
          mk('s6', 'Resume iteration', 'Tailor resume for the target role and quantify impact.'),
          mk('s7', 'Mock interviews', 'Do 5 mocks and track score improvements.'),
        ],
      },
    ];
  }

  return base;
}

function ensureDynamicUpdates(roadmapData) {
  const { progress } = computeProgress(roadmapData);
  roadmapData.dynamic = roadmapData.dynamic || {};

  if (progress >= 60 && !roadmapData.dynamic.advancedPhaseAdded) {
    roadmapData.dynamic.advancedPhaseAdded = true;
    roadmapData.phases = Array.isArray(roadmapData.phases) ? roadmapData.phases : [];
    roadmapData.phases.push({
      title: 'Advanced (Auto-unlocked)',
      milestones: [
        {
          id: 'x1',
          title: 'Deepen one specialty',
          description: 'Pick one area (backend, frontend, data) and go deeper with one focused project improvement.',
          done: false,
          resources: [],
        },
        {
          id: 'x2',
          title: 'Interview sprint',
          description: 'Schedule 5 mock interviews and iterate on weak spots from feedback.',
          done: false,
          resources: [],
        },
      ],
    });
  }

  return roadmapData;
}

router.get('/current', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM roadmaps WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No roadmap found' });

    const item = rows[0];
    const roadmapData = safeJson(item.roadmap_data, null);
    return res.json({ ok: true, roadmap: { ...item, roadmap_data: roadmapData } });
  } catch (err) {
    console.error('Roadmap current error:', err);
    return res.status(500).json({ error: 'Failed to load roadmap' });
  }
});

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { target_role, skill_level } = req.body || {};

    // Prefer onboarding defaults if present
    const onboard = await db.query('SELECT target_role, skill_level FROM onboarding_data WHERE user_id = $1', [req.user.id]);
    const targetRole = target_role || onboard.rows[0]?.target_role || 'Software Engineer';
    const skillLevel = skill_level || onboard.rows[0]?.skill_level || 'beginner';

    const roadmapData = generateRoadmap({ targetRole, skillLevel });
    const { progress } = computeProgress(roadmapData);

    const saved = await db.query(
      `INSERT INTO roadmaps (user_id, target_role, roadmap_data, progress_percent)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET target_role = EXCLUDED.target_role, roadmap_data = EXCLUDED.roadmap_data, progress_percent = EXCLUDED.progress_percent, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, targetRole, JSON.stringify(roadmapData), progress]
    );

    const item = saved.rows[0];
    return res.json({ ok: true, roadmap: { ...item, roadmap_data: roadmapData } });
  } catch (err) {
    console.error('Roadmap generate error:', err);
    return res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

router.post('/milestone', requireAuth, async (req, res) => {
  try {
    const { milestone_id, done } = req.body || {};
    if (!milestone_id) return res.status(400).json({ error: 'milestone_id is required' });

    const { rows } = await db.query('SELECT * FROM roadmaps WHERE user_id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No roadmap found' });

    const item = rows[0];
    const roadmapData = safeJson(item.roadmap_data, { phases: [] });

    let updated = false;
    for (const phase of roadmapData.phases || []) {
      for (const milestone of phase.milestones || []) {
        if (milestone.id === milestone_id) {
          milestone.done = typeof done === 'boolean' ? done : !milestone.done;
          updated = true;
        }
      }
    }

    if (!updated) return res.status(404).json({ error: 'Milestone not found' });

    ensureDynamicUpdates(roadmapData);
    const { progress } = computeProgress(roadmapData);

    const saved = await db.query(
      'UPDATE roadmaps SET roadmap_data = $1, progress_percent = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3 RETURNING *',
      [JSON.stringify(roadmapData), progress, req.user.id]
    );

    return res.json({ ok: true, roadmap: { ...saved.rows[0], roadmap_data: roadmapData } });
  } catch (err) {
    console.error('Roadmap milestone error:', err);
    return res.status(500).json({ error: 'Failed to update milestone' });
  }
});

module.exports = router;
