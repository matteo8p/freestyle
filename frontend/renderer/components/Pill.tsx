import { useEffect, useState, type JSX } from 'react'

interface Props {
  state: 'idle' | 'recording' | 'transcribing' | 'pasting' | 'error'
  message?: string
}

export function Pill({ state, message }: Props): JSX.Element {
  const [dots, setDots] = useState('')
  useEffect(() => {
    if (state === 'idle') {
      setDots('')
      return
    }
    const id = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 300)
    return () => clearInterval(id)
  }, [state])

  const label = (() => {
    switch (state) {
      case 'recording':
        return `Listening${dots}`
      case 'transcribing':
        return `Transcribing${dots}`
      case 'pasting':
        return 'Pasting'
      case 'error':
        return message ?? 'Error'
      default:
        return 'Ready'
    }
  })()

  const color =
    state === 'recording'
      ? 'bg-red-500/20 border-red-500/60 text-red-200'
      : state === 'transcribing' || state === 'pasting'
        ? 'bg-amber-500/20 border-amber-500/60 text-amber-100'
        : state === 'error'
          ? 'bg-rose-700/30 border-rose-500/60 text-rose-100'
          : 'bg-zinc-800/60 border-zinc-700 text-zinc-300'

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${color}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {state === 'recording' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            state === 'recording'
              ? 'bg-red-500'
              : state === 'transcribing' || state === 'pasting'
                ? 'bg-amber-400'
                : state === 'error'
                  ? 'bg-rose-500'
                  : 'bg-zinc-500'
          }`}
        />
      </span>
      <span>{label}</span>
    </div>
  )
}
