const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { requireQuota, incrementUsage } = require('../middleware/usageLimit');
const { anthropicJson } = require('../ai/anthropic');

function pickQuestion(type, difficulty, step) {
  const banks = {
    behavioral: {
      entry: [
        'Tell me about yourself.',
        'Tell me about a time you faced a challenge and how you handled it.',
        'Why do you want this role?',
      ],
      mid: [
        'Tell me about a time you led a project or influenced others without authority.',
        'Describe a conflict in a team and how you resolved it.',
        'Tell me about a time you had to learn something quickly.',
      ],
      senior: [
        'Tell me about a strategic decision you made with incomplete information.',
        'Describe a time you drove a cross-team initiative and measured impact.',
        'Tell me about a failure and what you changed afterward.',
      ],
    },
    technical: {
      entry: [
        'Explain the difference between var, let, and const in JavaScript.',
        'What is a REST API and what does it mean for an API to be stateless?',
        'What is Big-O? Give an example.',
      ],
      mid: [
        'Design an API endpoint for creating and listing tasks. What routes and validations would you use?',
        'Explain indexing in databases. When can an index hurt performance?',
        'How would you handle pagination and filtering in an API?',
      ],
      senior: [
        'Design a URL shortener. Outline data model, scaling, and failure modes.',
        'Explain eventual consistency and where it is acceptable.',
        'Design a rate limiter for an API.',
      ],
    },
    case: {
      entry: [
        'You have 2 weeks to improve user sign-ups. What steps would you take?',
        'How would you prioritize features for a student career app MVP?',
      ],
      mid: [
        'A feature increased sign-ups but reduced retention. How do you investigate and decide next steps?',
        'You need to reduce cloud costs by 30% without hurting UX. What do you do?',
      ],
      senior: [
        'You suspect your product has PMF in one segment but not others. How do you validate and focus?',
        'Propose an experiment strategy to increase interview practice completion by 2x.',
      ],
    },
  };

  const typeKey = banks[type] ? type : 'behavioral';
  const diffKey = banks[typeKey][difficulty] ? difficulty : 'entry';
  const list = banks[typeKey][diffKey];
  return list[step % list.length];
}

function scoreAnswer(answer, type) {
  const text = (answer || '').trim();
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Structure / clarity heuristics
  const hasStructure = /(situation|task|action|result)/i.test(text) || /(first|then|finally)/i.test(text);
  const hasMetrics = /\b(\d+%|\$\d+|\d+\+|\d+\s*(users|requests|ms|seconds|minutes|hours|days))\b/i.test(text);

  let clarity = 5;
  if (wordCount >= 60) clarity += 1;
  if (hasStructure) clarity += 2;

  let technical = 5;
  if (type === 'technical') {
    if (/(api|rest|sql|index|big[- ]o|complexity|cache|latency|scal(e|ing)|auth|jwt)/i.test(text)) technical += 2;
    if (hasMetrics) technical += 1;
  }

  let communication = 5;
  if (wordCount >= 80) communication += 1;
  if (!/(um|uh|like\s+like)/i.test(text)) communication += 1;

  let structure = hasStructure ? 8 : 6;

  const raw = Math.round((clarity + technical + communication + structure) / 4);
  const score = Math.max(1, Math.min(10, raw));

  return {
    score,
    breakdown: {
      clarity: Math.max(1, Math.min(10, clarity)),
      technicalAccuracy: Math.max(1, Math.min(10, technical)),
      communication: Math.max(1, Math.min(10, communication)),
      structure: Math.max(1, Math.min(10, structure)),
    },
    highlights: [
      hasStructure ? 'Good structure in your answer.' : 'Try using a clearer structure (STAR / steps).',
      hasMetrics ? 'Nice use of measurable impact.' : 'Add a metric or concrete outcome if possible.',
    ],
    improvements: [
      'Be more specific about your role and what you did personally.',
      'End with impact: what changed because of your actions?',
    ],
  };
}

function modelAnswer(type) {
  if (type === 'behavioral') {
    return 'Situation: In a group project, we kept missing deadlines. Task: I needed to improve delivery. Action: I broke work into 1-week milestones, added a simple Kanban board, and did quick daily check-ins. Result: We shipped on time and reduced rework by aligning early.';
  }
  if (type === 'technical') {
    return 'I would design REST endpoints like POST /tasks, GET /tasks with pagination, PUT /tasks/:id, DELETE /tasks/:id. I would validate inputs, store tasks with status and timestamps, add indexes on user_id and created_at, and include auth (JWT/session). For pagination I’d use cursor-based or limit/offset depending on requirements.';
  }
  return 'I would start by defining the goal metric, mapping the funnel, and identifying the biggest drop-off. Then I’d propose 2-3 experiments with clear hypotheses, implement instrumentation, run the tests for a fixed period, and roll out the winner.';
}

async function aiFeedback({ question, answer, interviewType, difficulty, targetRole }) {
  const system = 'You are a supportive senior interviewer. Return ONLY valid JSON.';
  const user = `Return JSON with this exact shape:
{
  "score": number, // 1-10
  "breakdown": {"clarity": number, "technicalAccuracy": number, "communication": number, "structure": number},
  "highlights": string[],
  "improvements": string[],
  "modelAnswer": string
}

Interview type: ${interviewType}
Difficulty: ${difficulty}
Target role: ${targetRole || ''}
Question: ${question}
Answer: ${answer}
`;

  const json = await anthropicJson({ system, user, maxTokens: 650, temperature: 0.3 });
  if (!json || typeof json !== 'object') return null;
  if (typeof json.score !== 'number') return null;
  if (!json.breakdown || typeof json.breakdown !== 'object') return null;
  if (!Array.isArray(json.highlights) || !Array.isArray(json.improvements)) return null;
  if (typeof json.modelAnswer !== 'string') return null;
  return {
    score: Math.max(1, Math.min(10, Math.round(json.score))),
    breakdown: {
      clarity: Math.max(1, Math.min(10, Math.round(json.breakdown.clarity || 0))),
      technicalAccuracy: Math.max(1, Math.min(10, Math.round(json.breakdown.technicalAccuracy || 0))),
      communication: Math.max(1, Math.min(10, Math.round(json.breakdown.communication || 0))),
      structure: Math.max(1, Math.min(10, Math.round(json.breakdown.structure || 0))),
    },
    highlights: json.highlights.slice(0, 4),
    improvements: json.improvements.slice(0, 4),
    modelAnswer: json.modelAnswer,
  };
}

function summarizeSession(transcript) {
  const feedbacks = (transcript || []).filter(t => t && t.kind === 'feedback');
  const scores = feedbacks.map(f => Number(f.score)).filter(n => !Number.isNaN(n));
  const overall = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length) : null;

  const avgBreakdown = {
    clarity: null,
    technicalAccuracy: null,
    communication: null,
    structure: null,
  };

  if (feedbacks.length) {
    const sum = feedbacks.reduce(
      (acc, f) => {
        const b = f.breakdown || {};
        acc.clarity += Number(b.clarity || 0);
        acc.technicalAccuracy += Number(b.technicalAccuracy || 0);
        acc.communication += Number(b.communication || 0);
        acc.structure += Number(b.structure || 0);
        return acc;
      },
      { clarity: 0, technicalAccuracy: 0, communication: 0, structure: 0 }
    );
    avgBreakdown.clarity = Math.round(sum.clarity / feedbacks.length);
    avgBreakdown.technicalAccuracy = Math.round(sum.technicalAccuracy / feedbacks.length);
    avgBreakdown.communication = Math.round(sum.communication / feedbacks.length);
    avgBreakdown.structure = Math.round(sum.structure / feedbacks.length);
  }

  const last = feedbacks[feedbacks.length - 1] || null;

  return {
    overall_score: overall,
    avgBreakdown,
    strengths: last?.highlights || [],
    improvements: last?.improvements || [],
    answersCount: (transcript || []).filter(t => t.kind === 'answer').length,
    questionsCount: (transcript || []).filter(t => t.kind === 'question').length,
  };
}

// Start an interview session
router.post('/start', requireAuth, requireQuota('interview'), async (req, res) => {
  try {
    const { interview_type, difficulty, target_role } = req.body || {};
    const type = (interview_type || 'behavioral').toLowerCase();
    const diff = (difficulty || 'entry').toLowerCase();

    const firstQuestion = pickQuestion(type, diff, 0);
    const transcript = [
      { role: 'assistant', kind: 'question', text: firstQuestion, at: new Date().toISOString() },
    ];

    const created = await db.query(
      'INSERT INTO interview_sessions (user_id, interview_type, difficulty, target_role, transcript) VALUES ($1, $2, $3, $4, $5) RETURNING id, interview_type, difficulty, target_role, created_at',
      [req.user.id, type, diff, target_role || null, JSON.stringify(transcript)]
    );

    await incrementUsage(req.user.id, 'interview');

    res.json({
      ok: true,
      session: created.rows[0],
      question: firstQuestion,
      quota: {
        period_ym: req.quota.periodYm,
        limit: req.quota.limit,
        used: req.quota.used + 1,
        remaining: Math.max(0, req.quota.limit - (req.quota.used + 1)),
      },
    });
  } catch (err) {
    console.error('Interview start error:', err);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// Submit an answer, get feedback, and next question
router.post('/:id/turn', requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { answer } = req.body || {};

    const sessionRes = await db.query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.id]
    );
    const session = sessionRes.rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const transcript = Array.isArray(session.transcript) ? session.transcript : (session.transcript || []);

    // Find last question count and current question
    const questionCount = transcript.filter(t => t.kind === 'question').length;
    const lastQuestion = [...transcript].reverse().find(t => t.kind === 'question')?.text || '';
    const type = session.interview_type;
    const diff = session.difficulty;

    const ai = await aiFeedback({
      question: lastQuestion,
      answer: String(answer || ''),
      interviewType: type,
      difficulty: diff,
      targetRole: session.target_role,
    });
    const feedback = ai || scoreAnswer(answer, type);

    transcript.push({ role: 'user', kind: 'answer', text: String(answer || ''), at: new Date().toISOString() });
    transcript.push({
      role: 'assistant',
      kind: 'feedback',
      score: feedback.score,
      breakdown: feedback.breakdown,
      highlights: feedback.highlights,
      improvements: feedback.improvements,
      modelAnswer: feedback.modelAnswer || modelAnswer(type),
      at: new Date().toISOString(),
    });

    const nextQuestion = pickQuestion(type, diff, questionCount);
    transcript.push({ role: 'assistant', kind: 'question', text: nextQuestion, at: new Date().toISOString() });

    // Update overall score as average of feedback scores
    const scores = transcript.filter(t => t.kind === 'feedback').map(t => Number(t.score)).filter(n => !Number.isNaN(n));
    const overall = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length) : null;

    await db.query(
      'UPDATE interview_sessions SET transcript = $1, overall_score = $2 WHERE id = $3 AND user_id = $4',
      [JSON.stringify(transcript), overall, sessionId, req.user.id]
    );

    res.json({ ok: true, feedback, nextQuestion, overall_score: overall });
  } catch (err) {
    console.error('Interview turn error:', err);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

router.get('/:id/summary', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, interview_type, difficulty, target_role, transcript, overall_score, created_at FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    const transcript = Array.isArray(rows[0].transcript) ? rows[0].transcript : (rows[0].transcript || []);
    const summary = summarizeSession(transcript);
    return res.json({ ok: true, session: rows[0], summary });
  } catch (err) {
    console.error('Interview summary error:', err);
    return res.status(500).json({ error: 'Failed to load interview summary' });
  }
});

router.get('/history/list', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, interview_type, difficulty, target_role, overall_score, created_at FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ ok: true, items: rows });
  } catch (err) {
    console.error('Interview history error:', err);
    res.status(500).json({ error: 'Failed to load interview history' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('Interview fetch error:', err);
    res.status(500).json({ error: 'Failed to load interview session' });
  }
});

module.exports = router;
