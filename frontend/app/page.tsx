'use client'

import { useState, useEffect, useCallback } from 'react'
import PreferencesPanel from './components/PreferencesPanel'
import ResponseDisplay, { ConversationState } from './components/ResponseDisplay'

const CHARS_PER_TOKEN = 4

const PREFS_STORAGE_KEY = 'user_preferences'
const SESSIONS_STORAGE_KEY = 'chat_sessions'
const ACTIVE_SESSION_KEY = 'active_session_id'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function createSession(title: string = 'New Chat'): ChatSession {
  const now = Date.now()
  return {
    id: generateId(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

function loadActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_SESSION_KEY)
}

function saveActiveSessionId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_SESSION_KEY, id)
}

function generateTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  if (firstLine.length <= 30) return firstLine
  return firstLine.slice(0, 27) + '...'
}

function loadPrefs() {
  if (typeof window === 'undefined') return defaultPrefs
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
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

function formatResponse(data: { suggestions?: unknown[]; summary?: string }): string {
  if (data.suggestions && Array.isArray(data.suggestions)) {
    const suggestionText = (data.suggestions as { player: string; market: string; pick: string; confidence: number; reasoning: string }[]).map((s) => 
      `• ${s.player} | ${s.market}: ${s.pick} (${s.confidence}%)\n  ${s.reasoning}`
    ).join('\n\n')
    return `${data.summary || ''}\n\n${suggestionText}`.trim()
  }
  return data.summary ? data.summary : JSON.stringify(data)
}

export default function Home() {
  const [text, setText] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<ConversationState>({ status: 'idle' })

  const activeSession = sessions.find(s => s.id === activeSessionId) || null
  const history = activeSession?.messages || []

  useEffect(() => {
    const loadedSessions = loadSessions()
    const activeId = loadActiveSessionId()
    
    if (loadedSessions.length > 0) {
      setSessions(loadedSessions)
      if (activeId && loadedSessions.find(s => s.id === activeId)) {
        setActiveSessionId(activeId)
      } else {
        setActiveSessionId(loadedSessions[0].id)
        saveActiveSessionId(loadedSessions[0].id)
      }
    }
  }, [])

  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions)
    }
  }, [sessions])

  const createNewSession = useCallback(() => {
    const newSession = createSession('New Chat')
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    saveActiveSessionId(newSession.id)
    setConversation({ status: 'idle' })
    setText('')
  }, [])

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
    saveActiveSessionId(sessionId)
    setConversation({ status: 'idle' })
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId)
      if (sessionId === activeSessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id)
          saveActiveSessionId(filtered[0].id)
        } else {
          const newSession = createSession('New Chat')
          setSessions([newSession])
          setActiveSessionId(newSession.id)
          saveActiveSessionId(newSession.id)
        }
      }
      return filtered
    })
  }, [activeSessionId])

  const charCount = text.length
  const tokenEstimate = Math.ceil(charCount / CHARS_PER_TOKEN)

  async function handleSubmit() {
    if (!text.trim() || conversation.status === 'loading') return

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const currentSessionId = activeSessionId
    if (!currentSessionId) return

    setConversation({ status: 'loading' })
    
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          updatedAt: Date.now(),
        }
      }
      return s
    }))

    try {
      const prefs = loadPrefs()
      const currentSession = sessions.find(s => s.id === currentSessionId)
      const currentHistory = currentSession?.messages || []
      
      const res = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: text, 
          prefs,
          history: currentHistory,
        }),
      })
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      
      if (data.error) {
        setConversation({ status: 'error', message: data.error })
      } else {
        const formattedText = formatResponse(data)
        const assistantMessage: Message = {
          role: 'assistant',
          content: formattedText,
          timestamp: Date.now(),
        }
        
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            const updatedMessages = [...s.messages, assistantMessage]
            return {
              ...s,
              messages: updatedMessages,
              title: s.title === 'New Chat' ? generateTitle(text) : s.title,
              updatedAt: Date.now(),
            }
          }
          return s
        }))
        
        setConversation({ status: 'done', messages: [...history, userMessage, assistantMessage] })
        setText('')
      }
    } catch (err) {
      setConversation({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  function handleClear() {
    if (!activeSessionId) return
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: [], title: 'New Chat' }
      }
      return s
    }))
    setConversation({ status: 'idle' })
    setText('')
  }

  return (
    <main className="min-h-screen flex">
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span>+ New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-1 ${
                session.id === activeSessionId
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <button
                onClick={() => switchSession(session.id)}
                className="flex-1 text-left text-sm truncate"
              >
                {session.title}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 px-1 text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <PreferencesPanel />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="request-input" className="text-sm font-medium">
                Your question
              </label>
              {history.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Clear conversation
                </button>
              )}
            </div>
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
                  disabled={!text.trim() || conversation.status === 'loading'}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {conversation.status === 'loading' ? 'Thinking…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>

          <ResponseDisplay 
            state={conversation} 
            history={history}
            onClear={handleClear}
          />
        </div>
      </div>
    </main>
  )
}