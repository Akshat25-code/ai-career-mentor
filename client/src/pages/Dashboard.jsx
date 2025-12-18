import { useEffect, useState } from 'react'
import api from '../api/client'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get('/dashboard/summary')
        if (!alive) return
        setSummary(res.data)
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.error || 'Failed to load dashboard (are you logged in?)')
      }
    })()
    return () => { alive = false }
  }, [])

  const resumeScore = summary?.lastResume?.ats_score
  const interviewScore = summary?.lastInterview?.overall_score
  const roadmapProgress = summary?.roadmap?.progress_percent

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-bold">Your dashboard</h2>
      <p className="mt-2 text-gray-600">Resume score, recent interview performance, and roadmap progress.</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title="Resume Analysis"
          description={resumeScore != null ? `Latest ATS score: ${resumeScore}/100` : 'Upload and get instant ATS feedback'}
        />
        <Card
          title="Mock Interview"
          description={interviewScore != null ? `Latest overall score: ${interviewScore}/10` : 'Practice and get scored feedback'}
        />
        <Card
          title="Roadmap"
          description={roadmapProgress != null ? `Progress: ${roadmapProgress}%` : 'Track milestones toward your target role'}
        />
      </div>
    </div>
  )
}

function Card({ title, description }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <button
        onClick={() => {
          if (title === 'Resume Analysis') window.location.href = '/resume'
          if (title === 'Mock Interview') window.location.href = '/interview'
          if (title === 'Roadmap') window.location.href = '/roadmap'
        }}
        className="mt-3 text-indigo-600 hover:text-indigo-800">Open</button>
    </div>
  )
}
