import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

function safeRoadmapData(roadmap) {
  const d = roadmap?.roadmap_data
  if (!d) return null
  if (typeof d === 'object') return d
  try {
    return JSON.parse(d)
  } catch {
    return null
  }
}

function computeProgress(roadmapData) {
  const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : []
  const milestones = phases.flatMap(p => (Array.isArray(p.milestones) ? p.milestones : []))
  const total = milestones.length
  const done = milestones.filter(m => !!m.done).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, percent }
}

export default function Roadmap() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [roadmap, setRoadmap] = useState(null)
  const [targetRole, setTargetRole] = useState('Software Engineer')

  const roadmapData = useMemo(() => safeRoadmapData(roadmap), [roadmap])
  const progress = useMemo(() => computeProgress(roadmapData), [roadmapData])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/roadmap/current')
      setRoadmap(res.data?.roadmap || null)
      setTargetRole(res.data?.roadmap?.target_role || 'Software Engineer')
    } catch (e) {
      if (e?.response?.status === 404) {
        setRoadmap(null)
      } else {
        setError(e?.response?.data?.error || 'Failed to load roadmap')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const generate = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/roadmap/generate', { target_role: targetRole })
      setRoadmap(res.data?.roadmap || null)
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to generate roadmap')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (milestoneId, done) => {
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/roadmap/milestone', { milestone_id: milestoneId, done })
      setRoadmap(res.data?.roadmap || null)
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to update milestone')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-4">Roadmap</h2>

      {loading && <div className="text-gray-600">Loading…</div>}

      {!loading && !roadmap && (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-700">Generate a checklist roadmap for your target role.</p>
          <div className="mt-3 grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Target role</label>
              <input className="mt-1 w-full border rounded p-2" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button onClick={generate} disabled={saving} className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                {saving ? 'Generating…' : 'Generate roadmap'}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {!loading && roadmap && roadmapData && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm text-gray-600">Target role</div>
                <div className="font-semibold">{roadmap.target_role}</div>
              </div>
              <div className="text-sm text-gray-700">
                Progress: <span className="font-semibold">{progress.percent}%</span> ({progress.done}/{progress.total})
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-100 rounded h-2 overflow-hidden">
              <div className="bg-indigo-600 h-2" style={{ width: `${progress.percent}%` }} />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="space-y-4">
            {(roadmapData.phases || []).map((phase) => (
              <div key={phase.title} className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold">{phase.title}</h3>
                <div className="mt-3 space-y-2">
                  {(phase.milestones || []).map((m) => (
                    <label key={m.id} className="flex items-start gap-3 border rounded p-3">
                      <input
                        type="checkbox"
                        checked={!!m.done}
                        disabled={saving}
                        onChange={(e) => toggle(m.id, e.target.checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{m.title}</div>
                        <div className="text-sm text-gray-600">{m.description}</div>
                        {Array.isArray(m.resources) && m.resources.length > 0 && (
                          <div className="text-sm mt-1">
                            {m.resources.map((r) => (
                              <a key={r.url} className="text-indigo-600 hover:text-indigo-800 mr-3" href={r.url} target="_blank" rel="noreferrer">
                                {r.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && roadmap && !roadmapData && (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-red-600 text-sm">Roadmap data is invalid.</p>
        </div>
      )}
    </div>
  )
}
