'use client'

import { Fragment } from 'react'

export type ResponseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; text: string }

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

export default function ResponseDisplay({ state }: { state: ResponseState }) {
  if (state.status === 'idle') return null

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Analysis &amp; Recommendation
        </span>
        {state.status === 'loading' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-500">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
            </svg>
            Thinking…
          </span>
        )}
        {state.status === 'done' && (
          <span className="ml-auto text-xs text-green-600 dark:text-green-400">Done</span>
        )}
        {state.status === 'error' && (
          <span className="ml-auto text-xs text-red-500">Error</span>
        )}
      </div>

      <div className="px-5 py-4">
        {state.status === 'loading' && (
          <div className="flex flex-col gap-2.5">
            {[80, 60, 90, 50].map((w, i) => (
              <div key={i} className={`h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse`} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
        )}

        {state.status === 'done' && <RenderBlocks text={state.text} />}
      </div>
    </section>
  )
}
