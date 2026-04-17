'use client'

import { useState } from 'react'
import PreferencesPanel from './components/PreferencesPanel'
import ResponseDisplay, { ResponseState } from './components/ResponseDisplay'

const CHARS_PER_TOKEN = 4

const STORAGE_KEY = 'user_preferences'

const defaultPrefs = {
  age: null,
  experience_level: null,
  monthly_budget: null,
  risk_tolerance: null,
  primary_goal: null,
  favorite_markets: null,
}

function capitalize(val: string) {
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
}

function loadPrefs() {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrefs
    const saved = JSON.parse(raw)
    return {
      age: saved.age ? parseInt(saved.age, 10) : null,
      experience_level: saved.experienceLevel ? capitalize(saved.experienceLevel) : null,
      monthly_budget: saved.monthlyBudget ? parseInt(saved.monthlyBudget, 10) : null,
      risk_tolerance: saved.riskTolerance ? capitalize(saved.riskTolerance) : null,
      primary_goal: saved.primaryGoal ? capitalize(saved.primaryGoal) : null,
      favorite_markets: saved.favoriteMarkets || null,
    }
  } catch {
    return defaultPrefs
  }
}

export default function Home() {
  const [text, setText] = useState('')
  const [response, setResponse] = useState<ResponseState>({ status: 'idle' })

  const charCount = text.length
  const tokenEstimate = Math.ceil(charCount / CHARS_PER_TOKEN)

  async function handleSubmit() {
    if (!text.trim()) return
    setResponse({ status: 'loading' })
    try {
      const prefs = loadPrefs()
      const res = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, prefs }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      if (data.error) {
        setResponse({ status: 'error', message: data.error })
      } else if (data.suggestions || data.summary) {
        const suggestionText = data.suggestions
          ? data.suggestions.map((s: { player: string; market: string; pick: string; confidence: number; reasoning: string }) => 
              `• ${s.player} | ${s.market}: ${s.pick} (${s.confidence}%)\n  ${s.reasoning}`
            ).join('\n\n')
          : ''
        setResponse({ status: 'done', text: `${data.summary}\n\n${suggestionText}`.trim() })
      } else {
        setResponse({ status: 'done', text: JSON.stringify(data) })
      }
    } catch (err) {
      setResponse({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <PreferencesPanel />

        <div className="flex flex-col gap-2">
          <label htmlFor="request-input" className="text-sm font-medium">
            Your question
          </label>
          <textarea
            id="request-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
            placeholder="Type your question…"
            rows={6}
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-900"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">⌘ Enter to submit</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {charCount.toLocaleString()} char{charCount !== 1 ? 's' : ''} · ~{tokenEstimate.toLocaleString()} token{tokenEstimate !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || response.status === 'loading'}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {response.status === 'loading' ? 'Thinking…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>

        <ResponseDisplay state={response} />
      </div>
    </main>
  )
}
