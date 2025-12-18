import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

export default function Interview() {
  const [setup, setSetup] = useState({
    interview_type: 'behavioral',
    difficulty: 'entry',
    target_role: 'Software Engineer',
  })
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interviewQuota, setInterviewQuota] = useState(null)
  const [summary, setSummary] = useState(null)

  const canSend = useMemo(() => !!sessionId && answer.trim().length > 0 && !loading, [sessionId, answer, loading])

  const loadQuota = async () => {
    try {
      const res = await api.get('/usage/status')
      const d = res.data
      if (d?.limits?.interview != null && d?.used?.interview != null && d?.remaining?.interview != null) {
        setInterviewQuota({
          period_ym: d.period_ym,
          limit: d.limits.interview,
          used: d.used.interview,
          remaining: d.remaining.interview,
        })
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadQuota()
  }, [])

  const start = async () => {
    setLoading(true)
    setError('')
    setSummary(null)
    try {
      const res = await api.post('/interview/start', setup)
      setSessionId(res.data.session.id)
      setMessages([{ role: 'assistant', kind: 'question', text: res.data.question }])
      if (res.data?.quota) setInterviewQuota(res.data.quota)
      else loadQuota()
    } catch (e) {
      const statusCode = e?.response?.status
      const msg = statusCode === 429
        ? 'Quota exceeded for interviews this month.'
        : (e?.response?.data?.error || 'Failed to start interview (are you logged in?)')
      setError(msg)
      if (statusCode === 429) loadQuota()
    } finally {
      setLoading(false)
    }
  }

  const send = async () => {
    if (!canSend) return
    setLoading(true)
    setError('')
    setSummary(null)
    const currentAnswer = answer
    setAnswer('')
    setMessages(prev => ([...prev, { role: 'user', kind: 'answer', text: currentAnswer }]))

    try {
      const res = await api.post(`/interview/${sessionId}/turn`, { answer: currentAnswer })
      const fb = res.data.feedback
      setMessages(prev => ([
        ...prev,
        {
          role: 'assistant',
          kind: 'feedback',
          score: fb.score,
          breakdown: fb.breakdown,
          highlights: fb.highlights,
          improvements: fb.improvements,
          modelAnswer: fb.modelAnswer,
        },
        { role: 'assistant', kind: 'question', text: res.data.nextQuestion }
      ]))
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to submit answer'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const endInterview = async () => {
    if (!sessionId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/interview/${sessionId}/summary`)
      setSummary(res.data?.summary || null)
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Mock Interview</h2>

      {!sessionId && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          {interviewQuota?.limit != null && (
            <div className="mb-3 text-sm text-gray-700">
              Interviews remaining: <span className="font-semibold">{interviewQuota.remaining}</span> / {interviewQuota.limit}
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Interview type</label>
              <select className="mt-1 w-full border rounded p-2" value={setup.interview_type} onChange={(e) => setSetup(s => ({ ...s, interview_type: e.target.value }))}>
                <option value="behavioral">Behavioral</option>
                <option value="technical">Technical</option>
                <option value="case">Case Study</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Difficulty</label>
              <select className="mt-1 w-full border rounded p-2" value={setup.difficulty} onChange={(e) => setSetup(s => ({ ...s, difficulty: e.target.value }))}>
                <option value="entry">Entry-level</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Target role</label>
              <input className="mt-1 w-full border rounded p-2" value={setup.target_role} onChange={(e) => setSetup(s => ({ ...s, target_role: e.target.value }))} />
            </div>
          </div>
          <button onClick={start} disabled={loading} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            {loading ? 'Starting…' : 'Start Interview'}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {sessionId && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="text-sm text-gray-600">Session in progress</div>
            <button onClick={endInterview} disabled={loading} className="text-indigo-600 hover:text-indigo-800 text-sm">
              End interview
            </button>
          </div>

          {summary && (
            <div className="border rounded p-3 bg-gray-50 mb-3">
              <div className="font-semibold text-indigo-700">Summary</div>
              <div className="mt-1 text-sm text-gray-700">
                Overall score: <span className="font-semibold">{summary.overall_score ?? '—'}</span>/10
              </div>
              {summary.avgBreakdown && (
                <div className="mt-2 text-sm text-gray-700">
                  Breakdown: Clarity {summary.avgBreakdown.clarity ?? '—'}/10 · Technical {summary.avgBreakdown.technicalAccuracy ?? '—'}/10 · Communication {summary.avgBreakdown.communication ?? '—'}/10 · Structure {summary.avgBreakdown.structure ?? '—'}/10
                </div>
              )}
              {Array.isArray(summary.improvements) && summary.improvements.length > 0 && (
                <div className="mt-2 text-sm">
                  <div className="font-medium">Next improvements</div>
                  <ul className="list-disc list-inside text-gray-700">
                    {summary.improvements.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="h-[420px] overflow-auto border rounded p-3 bg-gray-50">
            {messages.map((m, idx) => (
              <Message key={idx} msg={m} />
            ))}
            {loading && (
              <div className="text-sm text-gray-500 my-2">AI is typing…</div>
            )}
          </div>

          <div className="mt-3 flex gap-3">
            <textarea
              className="flex-1 border rounded p-2 h-24"
              placeholder="Type your answer…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button onClick={send} disabled={!canSend} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-12">
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function Message({ msg }) {
  if (msg.kind === 'feedback') {
    return (
      <div className="my-3">
        <div className="text-sm font-semibold text-indigo-700">Feedback (Score: {msg.score}/10)</div>
        <div className="grid md:grid-cols-2 gap-2 mt-2 text-sm">
          <div className="bg-white border rounded p-2">
            <div className="font-medium">Breakdown</div>
            <ul className="list-disc list-inside text-gray-700">
              <li>Clarity: {msg.breakdown.clarity}/10</li>
              <li>Technical: {msg.breakdown.technicalAccuracy}/10</li>
              <li>Communication: {msg.breakdown.communication}/10</li>
              <li>Structure: {msg.breakdown.structure}/10</li>
            </ul>
          </div>
          <div className="bg-white border rounded p-2">
            <div className="font-medium">What to improve</div>
            <ul className="list-disc list-inside text-gray-700">
              {msg.improvements.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-2 bg-white border rounded p-2 text-sm">
          <div className="font-medium">Model answer</div>
          <div className="text-gray-700 mt-1">{msg.modelAnswer}</div>
        </div>
      </div>
    )
  }

  const align = msg.role === 'user' ? 'justify-end' : 'justify-start'
  const bubble = msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'

  return (
    <div className={`flex ${align} my-2`}
    >
      <div className={`max-w-[85%] rounded px-3 py-2 text-sm ${bubble}`}>
        {msg.text}
      </div>
    </div>
  )
}
