import { useMemo } from 'react'
import type { Layout, SheetMeasure, SheetSpec } from '../geometry'
import { lt } from '../i18n/lt'
import { CutCard } from './CutCard'

export interface CuttingTabProps {
  layout: Layout | null
  measures: Map<string, SheetMeasure>
  spec: SheetSpec
  selectedId: string | null
  stepOrder: number | null
  onlyCut: boolean
  onOnlyCut: (v: boolean) => void
  onSelect: (id: string) => void
  onStepOrder: (order: number) => void
}

export function CuttingTab({
  layout,
  measures,
  spec,
  selectedId,
  stepOrder,
  onlyCut,
  onOnlyCut,
  onSelect,
  onStepOrder,
}: CuttingTabProps) {
  const sequence = useMemo(() => {
    if (!layout) return []
    const sheets = layout.sheets.slice().sort((a, b) => a.order - b.order)
    return onlyCut ? sheets.filter((s) => s.kind === 'cut') : sheets
  }, [layout, onlyCut])

  const current = useMemo(() => {
    if (!layout || sequence.length === 0) return null
    if (stepOrder != null) {
      const byOrder = sequence.find((s) => s.order === stepOrder)
      if (byOrder) return byOrder
    }
    if (selectedId) {
      const byId = sequence.find((s) => s.id === selectedId)
      if (byId) return byId
    }
    return sequence[0] ?? null
  }, [layout, sequence, selectedId, stepOrder])

  if (!layout || !current) {
    return (
      <div className="tab-panel">
        <p className="note">{lt.noSheets}</p>
      </div>
    )
  }

  const idx = sequence.findIndex((s) => s.id === current.id)
  const total = sequence.length
  const colFromRight = layout.cols - current.col
  const measure = measures.get(current.id)
  const sheetLabel = lt.sheetOf(current.order, layout.sheets.length)

  const go = (delta: number) => {
    if (sequence.length === 0) return
    let next = idx + delta
    if (next < 0) next = 0
    if (next >= sequence.length) next = sequence.length - 1
    const s = sequence[next]!
    onSelect(s.id)
    onStepOrder(s.order)
  }

  return (
    <div className="cutting-tab">
      <div className="cutting-tab__scroll">
        <header className="cutting-header cutting-header--compact">
          <h2 className="cutting-header__title">{sheetLabel}</h2>
          <p className="cutting-header__pos">
            {lt.sheetPosition(current.row + 1, colFromRight)}
          </p>
          {onlyCut && total > 0 ? (
            <p className="cutting-header__sub">
              {idx + 1} / {total} (pjaustomi)
            </p>
          ) : null}
        </header>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={onlyCut}
            onChange={(e) => onOnlyCut(e.target.checked)}
          />
          <span>{lt.onlyCut}</span>
        </label>

        {measure ? (
          <CutCard sheet={current} measure={measure} spec={spec} />
        ) : null}
      </div>

      <div className="cutting-tab__bar">
        <button
          type="button"
          className="btn btn--lg"
          onClick={() => go(-1)}
          disabled={idx <= 0}
        >
          {lt.prev}
        </button>
        <div className="cutting-tab__bar-label" aria-live="polite">
          {sheetLabel}
        </div>
        <button
          type="button"
          className="btn btn--lg"
          data-cutting-next
          onClick={() => go(1)}
          disabled={idx >= total - 1}
        >
          {lt.next}
        </button>
      </div>
    </div>
  )
}
