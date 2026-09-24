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
        <ul className="cut-legend" aria-label="Legenda">
          <li className="cut-legend__item">
            <span className="cut-legend__swatch cut-legend__swatch--kept" aria-hidden />
            {lt.legendKept}
          </li>
          <li className="cut-legend__item">
            <span className="cut-legend__swatch cut-legend__swatch--removed" aria-hidden />
            {lt.legendRemoved}
          </li>
          <li className="cut-legend__item">
            <span className="cut-legend__swatch cut-legend__swatch--hole" aria-hidden />
            {lt.legendHole}
          </li>
          <li className="cut-legend__item">
            <span className="cut-legend__swatch cut-legend__swatch--lost" aria-hidden />
            {lt.legendLost}
          </li>
          <li className="cut-legend__item">
            <span className="cut-legend__swatch cut-legend__swatch--new" aria-hidden />
            {lt.legendNewHole}
          </li>
        </ul>
      ) : null}
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
