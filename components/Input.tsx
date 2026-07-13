'use client'
import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export default function Input({ label, type = 'text', id, className = '', ...rest }: Props) {
  const [reveal, setReveal] = useState(false)
  const generatedId = useId()
  const inputId = id || generatedId
  const isPassword = type === 'password'

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[0.8rem] font-semibold text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && reveal ? 'text' : type}
          className={`w-full border border-line bg-surface-raised px-3.5 py-3 text-[0.95rem] text-text outline-none transition-colors focus:border-clay ${isPassword ? 'pr-14' : ''}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[0.7rem] font-semibold uppercase tracking-wide text-clay"
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  )
}
