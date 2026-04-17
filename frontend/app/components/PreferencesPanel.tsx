'use client'

import { useEffect, useState } from 'react'

export interface Preferences {
  age: string
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced' | ''
  monthlyBudget: string
  riskTolerance: 'Low' | 'Medium' | 'High' | ''
  primaryGoal: 'Profit' | 'Entertainment' | 'Analysis' | ''
  favoriteMarkets: string
}

const STORAGE_KEY = 'user_preferences'

const defaultPrefs: Preferences = {
  age: '',
  experienceLevel: '',
  monthlyBudget: '',
  riskTolerance: '',
  primaryGoal: '',
  favoriteMarkets: '',
}

function load(): Preferences {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs
  } catch {
    return defaultPrefs
  }
}

function save(prefs: Preferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

const SELECT_CLS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900'

const INPUT_CLS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-900'

export default function PreferencesPanel() {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPrefs(load())
  }, [])

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    save(prefs)
    setSaved(true)
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY)
    setPrefs(defaultPrefs)
    setSaved(false)
  }

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
        Profile &amp; Preferences
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Age</label>
          <input
            type="number"
            min={18}
            max={100}
            placeholder="e.g. 28"
            value={prefs.age}
            onChange={(e) => update('age', e.target.value)}
            className={INPUT_CLS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Betting / trading experience
          </label>
          <select
            value={prefs.experienceLevel}
            onChange={(e) => update('experienceLevel', e.target.value as Preferences['experienceLevel'])}
            className={SELECT_CLS}
          >
            <option value="">Select…</option>
            <option value="beginner">Beginner – just starting out</option>
            <option value="intermediate">Intermediate – a year or more</option>
            <option value="advanced">Advanced – seasoned bettor / trader</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Monthly budget (USD)
          </label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 500"
            value={prefs.monthlyBudget}
            onChange={(e) => update('monthlyBudget', e.target.value)}
            className={INPUT_CLS}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Risk tolerance
          </label>
          <select
            value={prefs.riskTolerance}
            onChange={(e) => update('riskTolerance', e.target.value as Preferences['riskTolerance'])}
            className={SELECT_CLS}
          >
            <option value="">Select…</option>
            <option value="low">Low – preserve capital</option>
            <option value="medium">Medium – balanced</option>
            <option value="high">High – aggressive upside</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Primary goal
          </label>
          <select
            value={prefs.primaryGoal}
            onChange={(e) => update('primaryGoal', e.target.value as Preferences['primaryGoal'])}
            className={SELECT_CLS}
          >
            <option value="">Select…</option>
            <option value="profit">Consistent profit</option>
            <option value="entertainment">Entertainment / fun</option>
            <option value="analysis">Market analysis &amp; research</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Favorite markets / sports
          </label>
          <input
            type="text"
            placeholder="e.g. NBA, NFL, crypto, politics"
            value={prefs.favoriteMarkets}
            onChange={(e) => update('favoriteMarkets', e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors dark:text-gray-500 dark:hover:text-red-400"
        >
          Clear saved data
        </button>
        <button
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          {saved ? 'Saved ✓' : 'Save preferences'}
        </button>
      </div>
    </section>
  )
}
