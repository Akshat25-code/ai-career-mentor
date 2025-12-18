const https = require('https');

function requestJson({ apiKey, body, timeoutMs = 20000 }) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(data),
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw || '{}');
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
            const msg = parsed?.error?.message || `Anthropic error (${res.statusCode})`;
            return reject(new Error(msg));
          } catch (err) {
            return reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Anthropic request timeout'));
    });

    req.write(data);
    req.end();
  });
}

function extractText(response) {
  const blocks = response?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

function tryParseJsonFromText(text) {
  if (!text) return null;
  // Prefer fenced ```json blocks
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }

  // Otherwise try to find the first JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

async function anthropicJson({ system, user, maxTokens = 800, temperature = 0.2, model }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const resp = await requestJson({
    apiKey,
    body: {
      model: model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    },
  });

  const text = extractText(resp);
  return tryParseJsonFromText(text);
}

module.exports = { anthropicJson };
