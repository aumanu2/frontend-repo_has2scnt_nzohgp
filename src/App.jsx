import { useEffect, useMemo, useRef, useState } from 'react'
import Spline from '@splinetool/react-spline'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function StartSessionModal({ open, onClose, onStart }) {
  const [goal, setGoal] = useState('')
  const [minutes, setMinutes] = useState(45)
  const [categories, setCategories] = useState(['social'])
  const [voice, setVoice] = useState('Cluely')

  if (!open) return null
  const toggle = (c) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 p-6 text-zinc-100 shadow-2xl">
        <h2 className="text-2xl font-semibold">Start Focus Session</h2>
        <p className="mt-1 text-sm text-zinc-400">Set your goal and timer. Cluely will keep you on track.</p>

        <label className="mt-4 block text-sm font-medium">Goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          placeholder="Write my English essay about climate change"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Duration (min)</label>
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="mt-1 text-sm text-zinc-400">{minutes} minutes</div>
          </div>
          <div>
            <label className="block text-sm font-medium">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3"
            >
              <option>Cluely</option>
              <option>Calm</option>
              <option>Energetic</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">Distraction Categories</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {['social', 'nsfw', 'games'].map((c) => (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  categories.includes(c)
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart({ goal, minutes, categories, voice })}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  )
}

function FloatingWidget({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all ${
        active ? 'animate-pulse bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-200'
      }`}
      title={active ? 'FOCUS MODE ON' : 'Start Focus Mode'}
    >
      {active ? 'ON' : '▶'}
    </button>
  )
}

function BlockOverlay({ show, onReturn, targetTitle }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/80">
      <div className="mx-4 max-w-md rounded-2xl bg-zinc-900 p-6 text-zinc-100 shadow-xl">
        <div className="text-lg font-semibold">This isn’t helping your goal.</div>
        <p className="mt-2 text-zinc-400">Return to: {targetTitle || 'your main work'}</p>
        <button
          onClick={onReturn}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [userId, setUserId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [goal, setGoal] = useState('')
  const [overlay, setOverlay] = useState(false)
  const [targetTitle, setTargetTitle] = useState('')
  const [status, setStatus] = useState('idle')

  // Register lightweight user on mount
  useEffect(() => {
    const device = localStorage.getItem('focusai_device') || crypto.randomUUID()
    localStorage.setItem('focusai_device', device)
    fetch(`${API_BASE}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: device, name: null, email: null, voice: 'Cluely' }),
    })
      .then((r) => r.json())
      .then((d) => setUserId(d.user_id))
      .catch(() => {})
  }, [])

  // Periodic activity ping simulating context awareness
  useEffect(() => {
    if (!sessionId) return
    setStatus('active')
    const interval = setInterval(async () => {
      // Use document.title and location as current context
      const title = document.title
      const url = location.href
      const res = await fetch(`${API_BASE}/api/session/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_id: userId, title, url, idle: false }),
      })
      const data = await res.json()
      if (data.decision === 'irrelevant') {
        setOverlay(true)
        setTargetTitle(goal)
        // play soft alert
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.frequency.value = 660
          o.connect(g)
          g.connect(ctx.destination)
          g.gain.setValueAtTime(0.0001, ctx.currentTime)
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05)
          o.start()
          o.stop(ctx.currentTime + 0.2)
        } catch {}
      } else {
        setOverlay(false)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [sessionId, userId, goal])

  const startSession = async ({ goal, minutes, categories, voice }) => {
    setGoal(goal)
    const res = await fetch(`${API_BASE}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, goal, duration_minutes: minutes, categories, voice }),
    })
    const data = await res.json()
    setSessionId(data.session_id)
    setModalOpen(false)
  }

  const endSession = async () => {
    if (!sessionId) return
    await fetch(`${API_BASE}/api/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    setSessionId(null)
    setStatus('idle')
    setOverlay(false)
  }

  const [showSummary, setShowSummary] = useState(null)
  const fetchSummary = async () => {
    if (!userId) return
    const res = await fetch(`${API_BASE}/api/session/${userId}/summary`)
    const data = await res.json()
    setShowSummary(data)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1020] via-[#0e1326] to-[#141a34] text-zinc-100">
      {/* Hero with Spline */}
      <div className="relative mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-6">
        <Spline scene="https://prod.spline.design/4cHQr84zOGAHOehh/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-4xl font-bold md:text-6xl">FocusAI</h1>
          <p className="mt-3 max-w-xl text-zinc-300">
            Real-time, context-aware distraction blocker with your AI companion, Cluely.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => setModalOpen(true)} className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-500">
              Start Focus Mode
            </button>
            {sessionId && (
              <button onClick={endSession} className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2">
                End Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="mx-auto mt-10 max-w-5xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur">
            <div className="text-sm text-zinc-400">Status</div>
            <div className="mt-2 text-2xl font-semibold">{sessionId ? 'FOCUS MODE ON' : 'Idle'}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur">
            <div className="text-sm text-zinc-400">Goal</div>
            <div className="mt-2 text-2xl font-semibold truncate" title={goal}>{goal || '—'}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur">
            <div className="text-sm text-zinc-400">Summary</div>
            <button onClick={fetchSummary} className="mt-2 w-full rounded-lg bg-zinc-800 px-4 py-2">Get Summary</button>
            {showSummary && (
              <div className="mt-3 space-y-1 text-sm text-zinc-300">
                <div>Total Focus: {Math.round((showSummary.total_focus_seconds || 0) / 60)} min</div>
                <div>Distractions Blocked: {showSummary.distractions_blocked || 0}</div>
                <div>Streak: {showSummary.streak_days || 0} days</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingWidget active={!!sessionId} onClick={() => (sessionId ? endSession() : setModalOpen(true))} />
      <StartSessionModal open={modalOpen} onClose={() => setModalOpen(false)} onStart={startSession} />
      <BlockOverlay show={overlay} onReturn={() => setOverlay(false)} targetTitle={targetTitle} />
    </div>
  )
}
