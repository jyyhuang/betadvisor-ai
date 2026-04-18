'use client'

import { Fragment } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type ConversationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; messages: Message[] }

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'p'; text: string }
  | { type: 'divider' }

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{part}</strong> : part
  )
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trimEnd()

    if (line.trim() === '') { i++; continue }

    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ type: 'divider' })
      i++; continue
    }

    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      i++; continue
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
      i++; continue
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimEnd().startsWith('|')) {
        tableLines.push(lines[i].trimEnd())
        i++
      }
      const parsedRows = tableLines
        .filter(l => !/^\|[-| :]+\|$/.test(l.trim()))
        .map(l =>
          l.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        )
      if (parsedRows.length >= 1) {
        blocks.push({ type: 'table', headers: parsedRows[0], rows: parsedRows.slice(1) })
      }
      continue
    }

    if (/^[-*•]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+/, '').trimEnd())
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    blocks.push({ type: 'p', text: line.trim() })
    i++
  }

  return blocks
}

function RenderBlocks({ text }: { text: string }) {
  const blocks = parseBlocks(text)

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={idx} className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                {block.text}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={idx} className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">
                {block.text}
              </h3>
            )
          case 'divider':
            return <hr key={idx} className="border-gray-200 dark:border-gray-700" />
          case 'ul':
            return (
              <ul key={idx} className="flex flex-col gap-1 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{parseBold(item)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'table':
            return (
              <div key={idx} className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {block.rows.map((row, j) => (
                      <tr key={j} className="bg-white dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800/40">
                        {row.map((cell, k) => (
                          <td key={k} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                            {parseBold(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'p':
            return (
              <p key={idx} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {parseBold(block.text)}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

function MessagePanel({ message, index, total }: { message: Message; index: number; total: number }) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  
  const version = isAssistant ? Math.floor((index + 1) / 2) : null
  const isInitial = version === 1

  return (
    <div className={`rounded-lg border ${isUser ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2 ${isUser ? 'border-blue-100 dark:border-blue-800' : 'border-gray-100 dark:border-gray-800'}`}>
        {isUser ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              You
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              · {message.content.slice(0, 50)}{message.content.length > 50 ? '...' : ''}
            </span>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {isInitial ? 'Initial Response' : `Refinement v${version}`}
            </span>
          </>
        )}
      </div>
      <div className="px-4 py-3">
        {isUser ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.content}</p>
        ) : (
          <RenderBlocks text={message.content} />
        )}
      </div>
    </div>
  )
}

export default function ResponseDisplay({ 
  state, 
  history = [],
  onClear,
}: { 
  state: ConversationState
  history?: Message[]
  onClear?: () => void
}) {
  if (state.status === 'idle' && history.length === 0) return null

  const displayHistory = state.status === 'done' && state.messages 
    ? state.messages 
    : history

  return (
    <section className="w-full flex flex-col gap-4">
      {displayHistory.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Conversation ({displayHistory.length} message{displayHistory.length !== 1 ? 's' : ''})
          </span>
          {onClear && displayHistory.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {displayHistory.map((msg, idx) => (
        <MessagePanel 
          key={msg.timestamp} 
          message={msg} 
          index={idx}
          total={displayHistory.length}
        />
      ))}

      {state.status === 'loading' && (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-500">
              Thinking…
            </span>
          </div>
          <div className="px-4 py-4">
            <div className="flex flex-col gap-2.5">
              {[80, 60, 90, 50].map((w, i) => (
                <div key={i} className={`h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse`} style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          </div>
        </div>
      )}
    </section>
  )
}