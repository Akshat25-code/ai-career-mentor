import { useEffect, useState } from 'react'
import api from '../api/client'

function scoreColor(score) {
  if (score >= 85) return 'bg-green-600'
  if (score >= 70) return 'bg-indigo-600'
  if (score >= 55) return 'bg-yellow-500'
  return 'bg-red-600'
}

function ScoreBar({ score }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  return (
    <div className="w-full">
      <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
        <div className={`${scoreColor(s)} h-2`} style={{ width: `${s}%` }} />
      </div>
    </div>
  )
}

export default function Resume() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [targetRole, setTargetRole] = useState('Software Engineer')
  const [status, setStatus] = useState('idle')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [resumeQuota, setResumeQuota] = useState(null)

  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState('')
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [compareA, setCompareA] = useState(null)
  const [compareB, setCompareB] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const onFileChange = (e) => {
    setFile(e.target.files?.[0] || null)
    setAnalysis(null)
    setError('')
  }

  const loadQuota = async () => {
    try {
      const res = await api.get('/usage/status')
      const d = res.data
      if (d?.limits?.resume != null && d?.used?.resume != null && d?.remaining?.resume != null) {
        setResumeQuota({
          period_ym: d.period_ym,
          limit: d.limits.resume,
          used: d.used.resume,
          remaining: d.remaining.resume,
        })
      }
    } catch {
      // ignore
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await api.get('/resume/history')
      setHistory(res.data?.items || [])
    } catch (e) {
      setHistoryError(e?.response?.data?.error || 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadOne = async (id) => {
    if (!id) return null
    const res = await api.get(`/resume/${id}`)
    return res.data?.item || null
  }

  const doCompare = async () => {
    setHistoryError('')
    try {
      const [a, b] = await Promise.all([loadOne(selectedA), loadOne(selectedB)])
      setCompareA(a)
      setCompareB(b)
    } catch (e) {
      setHistoryError(e?.response?.data?.error || 'Failed to load compare items')
    }
  }

  const upload = async () => {
    if (!file) return
    setStatus('uploading')
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/resume/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }})
      if (res.data?.requiresManualPaste) {
        setStatus('needs-text')
      } else {
        setText(res.data?.text || '')
        setStatus('ready')
      }
    } catch (e) {
      setStatus('needs-text')
    }
  }

  const analyze = async () => {
    if (!text) return
    setStatus('analyzing')
    setError('')
    try {
      const res = await api.post('/resume/analyze', { resume_text: text, target_role: targetRole, job_description_text: jobDescription })
      setAnalysis(res.data?.analysis || null)
      if (res.data?.quota) setResumeQuota(res.data.quota)
      else loadQuota()
      setStatus('done')
    } catch (e) {
      const statusCode = e?.response?.status
      if (statusCode === 429) {
        setError('Quota exceeded for resume analyses this month.')
        loadQuota()
      } else {
        setError(e?.response?.data?.error || 'Failed to analyze resume.')
      }
      setStatus('ready')
    }
  }

  useEffect(() => {
    loadQuota()
    loadHistory()
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Resume Analysis</h2>

      <section className="bg-white rounded-lg p-4 shadow mb-6">
        <div className="flex items-center gap-3">
          <input type="file" accept="application/pdf" onChange={onFileChange} />
          <button onClick={upload} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700" disabled={!file || status==='uploading'}>
            {status==='uploading' ? 'Uploading…' : 'Upload PDF'}
          </button>
        </div>
        {status==='needs-text' && (
          <p className="text-sm text-yellow-700 mt-2">We couldn’t read your PDF. Please paste your resume text below.</p>
        )}
      </section>

      {(status==='idle' || status==='ready' || status==='needs-text') && (
        <section className="bg-white rounded-lg p-4 shadow mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Resume text</label>
              <textarea
                className="mt-1 w-full border rounded p-2 h-56"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your resume text here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Target role</label>
              <select className="mt-1 w-full border rounded p-2" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                <option>Software Engineer</option>
                <option>Full-Stack Developer</option>
                <option>Data Scientist</option>
                <option>Data Analyst</option>
                <option>Product Manager</option>
              </select>

              <label className="block text-sm font-medium mt-3">Job description (optional)</label>
              <textarea
                className="mt-1 w-full border rounded p-2 h-28"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste a job description to get keyword-gap suggestions"
              />

              {resumeQuota?.limit != null && (
                <div className="mt-3 text-sm text-gray-700">
                  Resume analyses remaining: <span className="font-semibold">{resumeQuota.remaining}</span> / {resumeQuota.limit}
                </div>
              )}

              <button onClick={analyze} className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                {status==='analyzing' ? 'Analyzing…' : 'Analyze'}
              </button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          </div>
        </section>
      )}

      {analysis && (
        <section className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-xl font-semibold mb-2">Results</h3>
          <div className="flex items-center gap-4 mb-2">
            <div className="text-4xl font-extrabold text-indigo-700">{analysis.score}</div>
            <div className="text-gray-600">ATS Score / 100</div>
          </div>
          <ScoreBar score={analysis.score} />
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Section scores</h4>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {Object.entries(analysis.sectionScores).map(([k,v]) => (
                  <li key={k}><span className="capitalize">{k}</span>: {v}</li>
                ))}
              </ul>
              {analysis.missingKeywords?.length > 0 && (
                <>
                  <h4 className="font-semibold mt-4 mb-2">Missing keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingKeywords.map((kw) => (
                      <span key={kw} className="text-xs bg-gray-100 px-2 py-1 rounded border">{kw}</span>
                    ))}
                  </div>
                </>
              )}

              {analysis.keywordGap?.missingFromJobDescription?.length > 0 && (
                <>
                  <h4 className="font-semibold mt-4 mb-2">Missing from job description</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywordGap.missingFromJobDescription.map((kw) => (
                      <span key={kw} className="text-xs bg-gray-100 px-2 py-1 rounded border">{kw}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Quick wins</h4>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {analysis.quickWins.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
              <h4 className="font-semibold mt-4 mb-1">Example</h4>
              <div className="text-sm">
                <div className="text-gray-500">Before:</div>
                <div className="bg-gray-50 border rounded p-2 mb-2">{analysis.example.before}</div>
                <div className="text-gray-500">After:</div>
                <div className="bg-green-50 border rounded p-2">{analysis.example.after}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-lg p-4 shadow mt-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xl font-semibold">History</h3>
          <button onClick={loadHistory} disabled={historyLoading} className="text-indigo-600 hover:text-indigo-800 text-sm">
            {historyLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {historyError && <p className="mt-2 text-sm text-red-600">{historyError}</p>}

        {history.length === 0 && !historyLoading && (
          <p className="mt-2 text-sm text-gray-600">No saved analyses yet.</p>
        )}

        {history.length > 0 && (
          <div className="mt-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium">Compare A</label>
                <select className="mt-1 w-full border rounded p-2" value={selectedA} onChange={(e) => setSelectedA(e.target.value)}>
                  <option value="">Select…</option>
                  {history.map((h) => (
                    <option key={h.id} value={h.id}>
                      {new Date(h.created_at).toLocaleString()} — {h.ats_score}/100
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Compare B</label>
                <select className="mt-1 w-full border rounded p-2" value={selectedB} onChange={(e) => setSelectedB(e.target.value)}>
                  <option value="">Select…</option>
                  {history.map((h) => (
                    <option key={h.id} value={h.id}>
                      {new Date(h.created_at).toLocaleString()} — {h.ats_score}/100
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={doCompare}
                  disabled={!selectedA || !selectedB || selectedA === selectedB}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Compare
                </button>
              </div>
            </div>

            {(compareA || compareB) && (
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <CompareCard item={compareA} onLoadIntoEditor={() => {
                  if (!compareA) return
                  setText(compareA.raw_text || '')
                  setTargetRole(compareA.target_role || 'Software Engineer')
                  setAnalysis(compareA.analysis_result || null)
                  setStatus('ready')
                }} title="A" />
                <CompareCard item={compareB} onLoadIntoEditor={() => {
                  if (!compareB) return
                  setText(compareB.raw_text || '')
                  setTargetRole(compareB.target_role || 'Software Engineer')
                  setAnalysis(compareB.analysis_result || null)
                  setStatus('ready')
                }} title="B" />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function CompareCard({ item, title, onLoadIntoEditor }) {
  if (!item) {
    return (
      <div className="border rounded p-3 bg-gray-50">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600">Select an item to compare.</div>
      </div>
    )
  }

  const a = typeof item.analysis_result === 'object' ? item.analysis_result : null
  const score = item.ats_score ?? a?.score

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-gray-600">{new Date(item.created_at).toLocaleString()}</div>
        </div>
        <button onClick={onLoadIntoEditor} className="text-indigo-600 hover:text-indigo-800 text-sm">Load</button>
      </div>
      {score != null && (
        <div className="mt-2">
          <div className="text-sm text-gray-600">ATS</div>
          <div className="text-2xl font-bold text-indigo-700">{score}</div>
          <ScoreBar score={score} />
        </div>
      )}

      {a?.quickWins?.length > 0 && (
        <div className="mt-3">
          <div className="font-medium text-sm">Quick wins</div>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {a.quickWins.slice(0, 3).map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </div>
      )}

      {a?.missingKeywords?.length > 0 && (
        <div className="mt-3">
          <div className="font-medium text-sm">Missing keywords</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {a.missingKeywords.slice(0, 10).map((kw) => (
              <span key={kw} className="text-xs bg-gray-100 px-2 py-1 rounded border">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
