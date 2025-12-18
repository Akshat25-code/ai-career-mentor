import { Routes, Route } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Resume from './pages/Resume'
import Interview from './pages/Interview'
import Roadmap from './pages/Roadmap'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">AI Career Mentor</h1>
          <nav>
            <button className="text-gray-600 hover:text-gray-900 px-3 py-2">Login</button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/roadmap" element={<Roadmap />} />
        </Routes>
      </main>
    </div>
  )
}

function Home() {
  return (
    <div className="text-center py-20">
      <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
        Your Personal AI Career Coach
      </h2>
      <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
        Available 24/7. Costs nothing. Judges nothing.
      </p>
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => { window.location.href = 'http://localhost:5000/api/auth/google' }}
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          Login with Google
        </button>
      </div>
    </div>
  )
}

export default App
