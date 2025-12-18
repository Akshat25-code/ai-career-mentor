const db = require('../db');

function demoResumeAnalysis({ score, missingKeywords }) {
  return {
    demo: true,
    score,
    sectionScores: {
      contact: Math.round(score * 0.1),
      summary: Math.round(score * 0.12),
      experience: Math.round(score * 0.34),
      skills: Math.round(score * 0.22),
      education: Math.round(score * 0.12),
    },
    quickWins: [
      'Add 2–3 metrics to your strongest bullets (%/time/$).',
      'Move your best project to the top and highlight impact.',
      'Align Skills keywords to the job description.',
    ],
    missingKeywords: missingKeywords || ['react', 'api', 'sql'],
    foundKeywords: ['git', 'javascript', 'team'],
    keywordGap: {
      missingFromJobDescription: ['react', 'sql'],
    },
    example: {
      before: 'Worked on a web application for the company.',
      after: 'Built a React + Node web app used by 500+ users, reducing manual work by 40%.',
    },
  };
}

function demoInterviewTranscript() {
  const now = new Date();
  const t = (mins) => new Date(now.getTime() + mins * 60000).toISOString();

  return [
    { role: 'assistant', kind: 'question', text: 'Tell me about yourself.', at: t(0) },
    { role: 'user', kind: 'answer', text: 'I am a CS student who built a couple of projects and I like backend and React.', at: t(1) },
    {
      role: 'assistant',
      kind: 'feedback',
      score: 6,
      breakdown: { clarity: 6, technicalAccuracy: 6, communication: 6, structure: 5 },
      highlights: ['Clear direction and interest areas.'],
      improvements: ['Add 1–2 specific outcomes/metrics.', 'Use a tighter structure (present → proof → why role).'],
      modelAnswer: 'I’m a CS student focused on full-stack development. Recently I built a React + Node app and improved performance by 30% by caching API responses. I’m excited about this role because it matches my experience shipping features end-to-end and collaborating with a team.',
      at: t(2),
    },
    { role: 'assistant', kind: 'question', text: 'Describe a time you faced a challenge and how you handled it.', at: t(3) },
    { role: 'user', kind: 'answer', text: 'Our project had bugs near the deadline. I triaged issues, fixed top ones, and coordinated testing.', at: t(4) },
    {
      role: 'assistant',
      kind: 'feedback',
      score: 8,
      breakdown: { clarity: 8, technicalAccuracy: 7, communication: 8, structure: 8 },
      highlights: ['Good ownership and prioritization.'],
      improvements: ['Add a measurable result (time saved, fewer crashes).'],
      modelAnswer: 'Situation: Bugs spiked before a demo. Task: Stabilize quickly. Action: I prioritized by impact, fixed the top 3 crashes, added a quick regression checklist, and coordinated testing with teammates. Result: We shipped on time and reduced bug reports by 50% in the following week.',
      at: t(5),
    },
  ];
}

function computeOverallFromTranscript(transcript) {
  const scores = (transcript || [])
    .filter((x) => x && x.kind === 'feedback')
    .map((x) => Number(x.score))
    .filter((n) => !Number.isNaN(n));
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

async function seedForUser(userId) {
  // Cleanup previous demo data
  await db.query("DELETE FROM resumes WHERE user_id = $1 AND (analysis_result->>'demo') = 'true'", [userId]);
  await db.query('DELETE FROM interview_sessions WHERE user_id = $1 AND target_role = $2', [userId, 'DEMO']);

  // Ensure onboarding exists
  await db.query(
    `INSERT INTO onboarding_data (user_id, status, target_role, skill_level, graduation_year)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET status = EXCLUDED.status, target_role = EXCLUDED.target_role, skill_level = EXCLUDED.skill_level, graduation_year = EXCLUDED.graduation_year`,
    [userId, 'student', 'Software Engineer', 'intermediate', 2026]
  );

  // Upsert roadmap
  const roadmapData = {
    demo: true,
    version: 1,
    targetRole: 'Software Engineer',
    createdAt: new Date().toISOString(),
    phases: [
      {
        title: 'Week 1-2: Foundations',
        milestones: [
          { id: 'r1', title: 'Polish resume', description: 'Add metrics and tailor keywords.', done: true, resources: [] },
          { id: 'r2', title: 'Build one strong project', description: 'Ship a CRUD app with DB + auth.', done: true, resources: [] },
        ],
      },
      {
        title: 'Week 3-4: Interview Sprint',
        milestones: [
          { id: 'r3', title: 'Mock interviews', description: 'Do 5 mocks and track progress.', done: false, resources: [] },
          { id: 'r4', title: 'DSA practice', description: 'Practice arrays/strings/hashmaps daily.', done: false, resources: [] },
        ],
      },
    ],
    dynamic: { advancedPhaseAdded: false },
  };

  const total = roadmapData.phases.flatMap((p) => p.milestones).length;
  const done = roadmapData.phases.flatMap((p) => p.milestones).filter((m) => m.done).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const roadmapRes = await db.query(
    `INSERT INTO roadmaps (user_id, target_role, roadmap_data, progress_percent)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET target_role = EXCLUDED.target_role, roadmap_data = EXCLUDED.roadmap_data, progress_percent = EXCLUDED.progress_percent, updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [userId, 'Software Engineer', JSON.stringify(roadmapData), progress]
  );

  // Seed two resume analyses (bad + good)
  const badAnalysis = demoResumeAnalysis({ score: 42, missingKeywords: ['react', 'node', 'sql', 'api'] });
  const goodAnalysis = demoResumeAnalysis({ score: 89, missingKeywords: ['kubernetes'] });

  const badText = 'EXPERIENCE\n- Worked on a web app\n- Helped the team\nSKILLS\n- JavaScript\n- HTML\nEDUCATION\n- BSc CS';
  const goodText = 'EXPERIENCE\n- Built a React + Node app used by 500+ users; reduced manual data entry by 40%\n- Optimized API latency by 30% using caching and query tuning\nSKILLS\n- React, Node.js, Express, PostgreSQL, REST, Git\nEDUCATION\n- BSc CS (2026)';

  const resumeA = await db.query(
    'INSERT INTO resumes (user_id, source, target_role, raw_text, ats_score, analysis_result) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, 'text', 'Software Engineer', badText, badAnalysis.score, badAnalysis]
  );
  const resumeB = await db.query(
    'INSERT INTO resumes (user_id, source, target_role, raw_text, ats_score, analysis_result) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, 'text', 'Software Engineer', goodText, goodAnalysis.score, goodAnalysis]
  );

  // Seed interview session
  const transcript = demoInterviewTranscript();
  const overall = computeOverallFromTranscript(transcript);
  const interview = await db.query(
    'INSERT INTO interview_sessions (user_id, interview_type, difficulty, target_role, transcript, overall_score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [userId, 'behavioral', 'entry', 'DEMO', JSON.stringify(transcript), overall]
  );

  return {
    ok: true,
    roadmapId: roadmapRes.rows[0]?.id,
    resumeIds: [resumeA.rows[0]?.id, resumeB.rows[0]?.id],
    interviewId: interview.rows[0]?.id,
  };
}

async function seedForEmail(email) {
  const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (!rows[0]) throw new Error('User not found for email');
  return seedForUser(rows[0].id);
}

module.exports = { seedForUser, seedForEmail };
