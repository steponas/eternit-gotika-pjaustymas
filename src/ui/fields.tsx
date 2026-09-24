import type { ReactNode } from 'react'

export interface NumberFieldProps {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  suffix?: string
  error?: string
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix = 'mm',
  error,
}: NumberFieldProps) {
  return (
    <label className="num-field" htmlFor={id}>
      <span className="num-field__label">{label}</span>
      <span className="num-field__row">
        <input
          id={id}
          className="num-field__input"
          type="number"
          inputMode="numeric"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const n = e.target.valueAsNumber
            onChange(Number.isFinite(n) ? n : 0)
          }}
        />
        <span className="num-field__suffix">{suffix}</span>
      </span>
      {error ? <span className="num-field__error">{error}</span> : null}
    </label>
  )
}

export interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  name: string
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  name,
}: SegmentedProps<T>) {
  return (
    <fieldset className="segmented">
      <legend className="segmented__legend">{label}</legend>
      <div className="segmented__opts" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`segmented__opt${value === o.value ? ' is-active' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SummaryCard({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="summary-card">
      <div className="summary-card__value">{value}</div>
      <div className="summary-card__label">{label}</div>
    </div>
  )
}
