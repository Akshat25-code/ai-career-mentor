const router = require('express').Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { requireQuota, incrementUsage } = require('../middleware/usageLimit');
const { anthropicJson } = require('../ai/anthropic');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Health
router.get('/health', (req, res) => res.json({ ok: true }));

// Upload a PDF resume and extract text
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const data = await pdfParse(req.file.buffer);
    const text = (data.text || '').replace(/\r/g, ' ').replace(/\n+/g, '\n').trim();

    // Basic quality check
    const words = text.split(/\s+/).filter(Boolean);
    if (!text || words.length < 80) {
      return res.json({ requiresManualPaste: true });
    }

    return res.json({ ok: true, text });
  } catch (err) {
    console.error('Resume upload parse error:', err);
    return res.json({ requiresManualPaste: true });
  }
});

// Lightweight heuristic analysis (fallback when no AI key configured)
function heuristicAnalyze(resumeText, targetRole, jobDescriptionText) {
  const lower = resumeText.toLowerCase();
  const keywordSets = {
    'software engineer': ['javascript', 'react', 'node', 'api', 'rest', 'sql', 'tests', 'git'],
    'full-stack developer': ['react', 'node', 'express', 'graphql', 'rest', 'docker', 'postgres', 'aws'],
    'data scientist': ['python', 'pandas', 'numpy', 'sklearn', 'ml', 'model', 'sql', 'visualization'],
    'data analyst': ['sql', 'excel', 'tableau', 'power bi', 'dashboard', 'report', 'python', 'analysis'],
    'product manager': ['roadmap', 'stakeholder', 'kpi', 'user research', 'metrics', 'backlog', 'prioritize'],
  };

  const roleKey = (targetRole || '').toLowerCase();
  const keys = keywordSets[roleKey] || keywordSets['software engineer'];
  const found = keys.filter(k => lower.includes(k));
  const missing = keys.filter(k => !lower.includes(k));

  // Keyword gap vs job description (simple)
  const jdLower = (jobDescriptionText || '').toLowerCase();
  const jdTokens = jdLower
    ? Array.from(new Set(jdLower.split(/[^a-z0-9+.#]+/).filter(t => t.length >= 3))).slice(0, 5000)
    : [];
  const jdImportant = jdTokens.filter(t => ['react','node','express','sql','postgres','python','java','aws','docker','kubernetes','rest','api','graphql','typescript','testing','ci','cd','ml','model','pandas','numpy'].includes(t));
  const jdMissing = jdImportant.filter(t => !lower.includes(t));

  // Very rough scoring
  const base = 55;
  const keywordBoost = Math.min(found.length * 5, 25);
  const lengthPenalty = Math.max(0, 10 - Math.min(10, Math.floor(resumeText.length / 600)));
  const score = Math.max(40, Math.min(95, base + keywordBoost - lengthPenalty));

  const sectionScores = {
    contact: 8,
    summary: lower.includes('summary') ? 8 : 6,
    experience: lower.includes('experience') ? 14 : 11,
    skills: found.length >= 3 ? 9 : 7,
    education: lower.includes('education') ? 8 : 7,
  };

  const quickWins = [
    'Start bullets with strong verbs (Built, Led, Optimized).',
    'Add 2-3 quantifiable metrics (%/time/$) to top bullets.',
    'Include a concise tech stack in Skills (e.g., React, Node, SQL).',
  ];

  const example = {
    before: 'Developed a web application for the company.',
    after: 'Engineered a React + Node web app used by 500+ users, reducing manual data entry by 40%.'
  };

  return {
    score,
    sectionScores,
    missingKeywords: missing,
    foundKeywords: found,
    keywordGap: {
      missingFromJobDescription: jdMissing,
    },
    quickWins,
    example,
  };
}

async function aiAnalyze(resumeText, targetRole, jobDescriptionText) {
  const system =
    'You are an ATS + supportive senior recruiter. Return ONLY valid JSON.';

  const user = `Analyze this resume and return JSON with this exact shape:
{
  "score": number, // 0-100
  "sectionScores": {"contact": number, "summary": number, "experience": number, "skills": number, "education": number},
  "quickWins": string[],
  "missingKeywords": string[],
  "foundKeywords": string[],
  "keywordGap": {"missingFromJobDescription": string[]},
  "example": {"before": string, "after": string}
}

Target role: ${targetRole || 'Software Engineer'}

Job description (optional):
${jobDescriptionText || ''}

Resume text:
${resumeText}
`;

  const json = await anthropicJson({ system, user, maxTokens: 900, temperature: 0.2 });
  if (!json || typeof json !== 'object') return null;
  if (typeof json.score !== 'number') return null;
  if (!json.sectionScores || typeof json.sectionScores !== 'object') return null;
  if (!Array.isArray(json.quickWins)) return null;
  if (!Array.isArray(json.missingKeywords)) return null;
  if (!json.example || typeof json.example !== 'object') return null;
  return json;
}

// Analyze resume text (AI optional; heuristic fallback)
router.post('/analyze', requireAuth, requireQuota('resume'), async (req, res) => {
  try {
    const { resume_text: resumeText, target_role: targetRole, job_description_text: jobDescriptionText } = req.body || {};
    if (!resumeText || resumeText.length < 20) {
      return res.status(400).json({ error: 'resume_text is required' });
    }

    const aiResult = await aiAnalyze(resumeText, targetRole, jobDescriptionText);
    const result = aiResult || heuristicAnalyze(resumeText, targetRole, jobDescriptionText);

    // Save as a new resume version
    await db.query(
      'INSERT INTO resumes (user_id, source, target_role, raw_text, ats_score, analysis_result) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, 'text', targetRole || null, resumeText, result.score, result]
    );

    await incrementUsage(req.user.id, 'resume');

    return res.json({
      ok: true,
      analysis: result,
      quota: {
        period_ym: req.quota.periodYm,
        limit: req.quota.limit,
        used: req.quota.used + 1,
        remaining: Math.max(0, req.quota.limit - (req.quota.used + 1)),
      },
    });
  } catch (err) {
    console.error('Resume analyze error:', err);
    return res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// Resume history (version history)
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, target_role, ats_score, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ ok: true, items: rows });
  } catch (err) {
    console.error('Resume history error:', err);
    res.status(500).json({ error: 'Failed to load resume history' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('Resume fetch error:', err);
    res.status(500).json({ error: 'Failed to load resume' });
  }
});

module.exports = router;
