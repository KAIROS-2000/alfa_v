'use client'

import Editor, { loader } from '@monaco-editor/react'
import { useEffect, useState } from 'react'

let monacoLoaderPromise: Promise<void> | null = null

function initializeMonacoLoader() {
  if (!monacoLoaderPromise) {
    monacoLoaderPromise = import('monaco-editor')
      .then((monaco) => {
        loader.config({ monaco })
      })
      .catch((error) => {
        monacoLoaderPromise = null
        throw error
      })
  }

  return monacoLoaderPromise
}

export function LessonCodeEditor({
  language,
  value,
  onChange,
}: {
  language: 'javascript' | 'python'
  value: string
  onChange: (value: string) => void
}) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    initializeMonacoLoader()
      .then(() => {
        if (isActive) {
          setIsReady(true)
        }
      })
      .catch((initializationError) => {
        if (isActive) {
          setError(initializationError instanceof Error ? initializationError.message : 'Не удалось загрузить редактор.')
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-[360px] items-center justify-center bg-slate-50 px-4 text-center text-sm font-medium text-rose-600">
        {error}
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="flex h-[360px] items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Загружаем редактор…
      </div>
    )
  }

  return (
    <Editor
      height="360px"
      language={language}
      value={value}
      onChange={(nextValue) => onChange(nextValue || '')}
      loading={
        <div className="flex h-[360px] items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
          Загружаем редактор…
        </div>
      }
      theme="vs-light"
    />
  )
}
