import type { Layout } from '../geometry'
import { lt } from '../i18n/lt'
import { areaM2 } from './instructions'
import { SummaryCard } from './fields'

export interface ResultsTabProps {
  layout: Layout | null
  counts: {
    full: number
    cut: number
    total: number
    rows: number
    cols: number
    screws: number
  } | null
  selectedId: string | null
  onSelectSheet: (id: string) => void
}

export function ResultsTab({
  layout,
  counts,
  selectedId,
  onSelectSheet,
}: ResultsTabProps) {
  if (!layout || !counts) {
    return (
      <div className="tab-panel">
        <p className="note">{lt.noSheets}</p>
      </div>
    )
  }

  const area = areaM2(layout.area)
  const topKeep = Math.round(layout.topRowKeep)
  const topCut = layout.rows > 1 && layout.topRowKeep < 585

  const byRow = new Map<number, typeof layout.sheets>()
  for (const s of layout.sheets) {
    const list = byRow.get(s.row) ?? []
    list.push(s)
    byRow.set(s.row, list)
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b)

  return (
    <div className="tab-panel">
      <div className="summary-grid">
        <SummaryCard label={lt.countFull} value={counts.full} />
        <SummaryCard label={lt.countCut} value={counts.cut} />
        <SummaryCard label={lt.countTotal} value={counts.total} />
        <SummaryCard
          label={lt.countGrid}
          value={`${counts.rows} × ${counts.cols}`}
        />
        <SummaryCard label={lt.countScrews} value={counts.screws} />
        <SummaryCard label={lt.areaM2} value={`${area.toFixed(2)} m²`} />
      </div>

      <p className="result-line">
        <strong>{lt.topRowKeep}:</strong> {topKeep} mm
        {topCut ? ` (${lt.topRowCutNote})` : ''}
      </p>

      <p className="note">{lt.resultsReuseNote}</p>

      <div className="sheet-groups">
        {rows.map((r) => {
          const sheets = (byRow.get(r) ?? []).slice().sort((a, b) => a.order - b.order)
          const title =
            r === 0 ? lt.rowNearEave(r + 1) : lt.rowN(r + 1)
          return (
            <section key={r} className="sheet-group">
              <h3 className="sheet-group__title">{title}</h3>
              <div className="sheet-chips">
                {sheets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sheet-chip${selectedId === s.id ? ' is-selected' : ''}${s.kind === 'cut' ? ' is-cut' : ''}`}
                    onClick={() => onSelectSheet(s.id)}
                  >
                    <span className="sheet-chip__n">{s.order}</span>
                    {s.kind === 'cut' ? (
                      <span className="sheet-chip__cut" aria-label="pjautinas">
                        ✂
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
