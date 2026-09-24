import type { PlacedSheet, SheetMeasure, SheetSpec } from '../geometry'
import { lt } from '../i18n/lt'
import { CutDiagram } from './CutDiagram'
import { generateInstructions } from './instructions'

export interface CutCardProps {
  sheet: PlacedSheet
  measure: SheetMeasure
  spec: SheetSpec
}

export function CutCard({ sheet, measure, spec }: CutCardProps) {
  const steps = generateInstructions(measure, sheet, spec)
  const isFull = sheet.kind === 'full'

  return (
    <article className="cut-card">
      {isFull ? (
        <p className="cut-card__full-msg">{lt.fullSheetNoCut}</p>
      ) : null}
      <CutDiagram
        measure={measure}
        piece={sheet.piece}
        kind={sheet.kind}
        spec={spec}
        compact={isFull}
      />
      {!isFull ? (
        <ol className="cut-card__steps">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : null}
      <p className="cut-card__tip">{lt.tipMeasure}</p>
    </article>
  )
}
