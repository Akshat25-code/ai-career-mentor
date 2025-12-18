import { useEffect, useState } from 'react'
import api from '../api/client'

export default function Onboarding() {
  const [form, setForm] = useState({
    status: '',
    target_role: '',
    skill_level: '',
    graduation_year: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Try to fetch existing data
    api.get('/onboarding')
      .then(res => {
        if (res.data?.data) {
          const d = res.data.data
          setForm({
            status: d.status || '',
            target_role: d.target_role || '',
            skill_level: d.skill_level || '',
            graduation_year: d.graduation_year || ''
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await api.post('/onboarding', form)
      if (res.data?.success) {
        setMessage('Saved! Redirecting to dashboard...')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 800)
      }
    } catch (err) {
      setMessage('Failed to save. Are you logged in?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Let’s personalize your experience</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Current status *</label>
          <select name="status" value={form.status} onChange={handleChange} className="mt-1 w-full border rounded p-2" required>
            <option value="">Select...</option>
            <option value="student">College Student</option>
            <option value="graduate">Recent Graduate</option>
            <option value="switcher">Career Switcher</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Target role *</label>
          <input name="target_role" value={form.target_role} onChange={handleChange} className="mt-1 w-full border rounded p-2" placeholder="Software Engineer, Data Scientist, ..." required />
        </div>

        <div>
          <label className="block text-sm font-medium">Skill level *</label>
          <select name="skill_level" value={form.skill_level} onChange={handleChange} className="mt-1 w-full border rounded p-2" required>
            <option value="">Select...</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Graduation year (optional)</label>
          <input name="graduation_year" value={form.graduation_year} onChange={handleChange} className="mt-1 w-full border rounded p-2" placeholder="2026" />
        </div>

        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  )
}
