import type { EdgePoint, Polygon, SheetMeasure, SheetSpec } from '../geometry'
import { sheetOutline } from '../geometry'
import { lt } from '../i18n/lt'
import { nearRectCorner } from './instructions'

/** Extra space so dim lines + primary + secondary text aren't clipped. */
const MARGIN_TOP = 300
const MARGIN_BOTTOM = 320
const MARGIN_LEFT = 300
const MARGIN_RIGHT = 300
const HOLE_R = 12
const CORNER_MARK_R = 16
const PRIMARY_FS = 70
const SECONDARY_FS = 40
const CREST_FS = 40
const DRILL_FS = 34
const CUT_STROKE = 8

function roundMm(n: number): number {
  return Math.round(n)
}

/** Sheet y (bottom=0) → SVG y (top=0). */
function sy(y: number, length: number): number {
  return length - y
}

function polyPointsFlipped(poly: Polygon, length: number): string {
  return poly.map((p) => `${p.x},${sy(p.y, length)}`).join(' ')
}

function cornerSvgPos(
  corner: NonNullable<ReturnType<typeof nearRectCorner>>,
  W: number,
  L: number,
): { x: number; y: number } {
  switch (corner) {
    case 'BL':
      return { x: 0, y: sy(0, L) }
    case 'BR':
      return { x: W, y: sy(0, L) }
    case 'TL':
      return { x: 0, y: sy(L, L) }
    case 'TR':
      return { x: W, y: sy(L, L) }
  }
}

function CornerMark({
  x,
  y,
}: {
  x: number
  y: number
}) {
  const r = CORNER_MARK_R
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#c0392b" stroke="#fff" strokeWidth={3} />
      <circle cx={x} cy={y} r={4} fill="#fff" />
    </g>
  )
}

interface DimProps {
  ep: EdgePoint
  spec: SheetSpec
  idx: number
}

function DimensionAnnotations({ ep, spec, idx }: DimProps) {
  const W = spec.width
  const L = spec.length
  const corner = nearRectCorner(ep.p, spec)
  if (corner) {
    const pos = cornerSvgPos(corner, W, L)
    return <CornerMark x={pos.x} y={pos.y} />
  }

  const py = sy(ep.p.y, L)
  const primaryFs = PRIMARY_FS
  const secondaryFs = SECONDARY_FS
  const gap = 110 + (idx % 2) * 50

  const mainVal = (rec: EdgePoint['recommended']): number => {
    switch (rec) {
      case 'fromLeft':
        return roundMm(ep.fromLeft ?? ep.p.x)
      case 'fromRight':
        return roundMm(ep.fromRight ?? W - ep.p.x)
      case 'fromBottom':
        return roundMm(ep.fromBottom ?? ep.p.y)
      case 'fromTop':
        return roundMm(ep.fromTop ?? L - ep.p.y)
      default:
        return roundMm(ep.p.x)
    }
  }

  const otherVal = (rec: EdgePoint['recommended']): number => {
    switch (rec) {
      case 'fromLeft':
        return roundMm(ep.fromRight ?? W - ep.p.x)
      case 'fromRight':
        return roundMm(ep.fromLeft ?? ep.p.x)
      case 'fromBottom':
        return roundMm(ep.fromTop ?? L - ep.p.y)
      case 'fromTop':
        return roundMm(ep.fromBottom ?? ep.p.y)
      default:
        return roundMm(ep.p.y)
    }
  }

  if (ep.edge === 'bottom') {
    const rec = ep.recommended === 'fromLeft' ? 'fromLeft' : 'fromRight'
    const x0 = rec === 'fromRight' ? W : 0
    const y = L + gap
    const mid = (x0 + ep.p.x) / 2
    return (
      <g>
        <line x1={x0} y1={y} x2={ep.p.x} y2={y} stroke="#222" strokeWidth={2} />
        <line x1={x0} y1={y - 10} x2={x0} y2={y + 10} stroke="#222" strokeWidth={2} />
        <line
          x1={ep.p.x}
          y1={y - 10}
          x2={ep.p.x}
          y2={y + 10}
          stroke="#222"
          strokeWidth={2}
        />
        <line
          x1={ep.p.x}
          y1={L}
          x2={ep.p.x}
          y2={y}
          stroke="#888"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          x={mid}
          y={y + 68}
          textAnchor="middle"
          fontSize={primaryFs}
          fontWeight={700}
          fill="#111"
        >
          {mainVal(rec)}
        </text>
        <text x={mid} y={y + 118} textAnchor="middle" fontSize={secondaryFs} fill="#888">
          ({otherVal(rec)})
        </text>
      </g>
    )
  }

  if (ep.edge === 'top') {
    const rec = ep.recommended === 'fromRight' ? 'fromRight' : 'fromLeft'
    const x0 = rec === 'fromLeft' ? 0 : W
    const y = -gap
    const mid = (x0 + ep.p.x) / 2
    return (
      <g>
        <line x1={x0} y1={y} x2={ep.p.x} y2={y} stroke="#222" strokeWidth={2} />
        <line x1={x0} y1={y - 10} x2={x0} y2={y + 10} stroke="#222" strokeWidth={2} />
        <line
          x1={ep.p.x}
          y1={y - 10}
          x2={ep.p.x}
          y2={y + 10}
          stroke="#222"
          strokeWidth={2}
        />
        <line
          x1={ep.p.x}
          y1={0}
          x2={ep.p.x}
          y2={y}
          stroke="#888"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          x={mid}
          y={y - 22}
          textAnchor="middle"
          fontSize={primaryFs}
          fontWeight={700}
          fill="#111"
        >
          {mainVal(rec)}
        </text>
        <text x={mid} y={y + 42} textAnchor="middle" fontSize={secondaryFs} fill="#888">
          ({otherVal(rec)})
        </text>
      </g>
    )
  }

  if (ep.edge === 'left') {
    const rec = ep.recommended === 'fromBottom' ? 'fromBottom' : 'fromTop'
    const y0 = rec === 'fromTop' ? 0 : L
    const y1 = py
    const x = -gap
    const mid = (y0 + y1) / 2
    return (
      <g>
        <line x1={x} y1={y0} x2={x} y2={y1} stroke="#222" strokeWidth={2} />
        <line x1={x - 10} y1={y0} x2={x + 10} y2={y0} stroke="#222" strokeWidth={2} />
        <line x1={x - 10} y1={y1} x2={x + 10} y2={y1} stroke="#222" strokeWidth={2} />
        <line
          x1={0}
          y1={py}
          x2={x}
          y2={py}
          stroke="#888"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          x={x - 28}
          y={mid}
          textAnchor="middle"
          fontSize={primaryFs}
          fontWeight={700}
          fill="#111"
          transform={`rotate(-90 ${x - 28} ${mid})`}
        >
          {mainVal(rec)}
        </text>
        <text
          x={x + 44}
          y={mid}
          textAnchor="middle"
          fontSize={secondaryFs}
          fill="#888"
          transform={`rotate(-90 ${x + 44} ${mid})`}
        >
          ({otherVal(rec)})
        </text>
      </g>
    )
  }

  if (ep.edge === 'right') {
    const rec = ep.recommended === 'fromTop' ? 'fromTop' : 'fromBottom'
    const y0 = rec === 'fromBottom' ? L : 0
    const y1 = py
    const x = W + gap
    const mid = (y0 + y1) / 2
    return (
      <g>
        <line x1={x} y1={y0} x2={x} y2={y1} stroke="#222" strokeWidth={2} />
        <line x1={x - 10} y1={y0} x2={x + 10} y2={y0} stroke="#222" strokeWidth={2} />
        <line x1={x - 10} y1={y1} x2={x + 10} y2={y1} stroke="#222" strokeWidth={2} />
        <line
          x1={W}
          y1={py}
          x2={x}
          y2={py}
          stroke="#888"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
        <text
          x={x + 28}
          y={mid}
          textAnchor="middle"
          fontSize={primaryFs}
          fontWeight={700}
          fill="#111"
          transform={`rotate(90 ${x + 28} ${mid})`}
        >
          {mainVal(rec)}
        </text>
        <text
          x={x - 44}
          y={mid}
          textAnchor="middle"
          fontSize={secondaryFs}
          fill="#888"
          transform={`rotate(90 ${x - 44} ${mid})`}
        >
          ({otherVal(rec)})
        </text>
      </g>
    )
  }

  const fromLeft = roundMm(ep.fromLeft ?? ep.p.x)
  const fromRight = roundMm(ep.fromRight ?? W - ep.p.x)
  const fromBottom = roundMm(ep.fromBottom ?? ep.p.y)
  const nearerLeft = fromLeft <= fromRight
  const x0 = nearerLeft ? 0 : W
  const xVal = nearerLeft ? fromLeft : fromRight
  const yHoriz = L + gap
  const xVert = nearerLeft ? -gap : W + gap

  return (
    <g>
      <line x1={x0} y1={yHoriz} x2={ep.p.x} y2={yHoriz} stroke="#222" strokeWidth={2} />
      <line
        x1={ep.p.x}
        y1={L}
        x2={ep.p.x}
        y2={yHoriz}
        stroke="#888"
        strokeWidth={1}
        strokeDasharray="6 4"
      />
      <text
        x={(x0 + ep.p.x) / 2}
        y={yHoriz + 68}
        textAnchor="middle"
        fontSize={primaryFs}
        fontWeight={700}
        fill="#111"
      >
        {xVal}
      </text>
      <line x1={xVert} y1={L} x2={xVert} y2={py} stroke="#222" strokeWidth={2} />
      <line
        x1={ep.p.x}
        y1={py}
        x2={xVert}
        y2={py}
        stroke="#888"
        strokeWidth={1}
        strokeDasharray="6 4"
      />
      <text
        x={xVert + (nearerLeft ? -28 : 28)}
        y={(L + py) / 2}
        textAnchor="middle"
        fontSize={primaryFs}
        fontWeight={700}
        fill="#111"
        transform={`rotate(${nearerLeft ? -90 : 90} ${xVert + (nearerLeft ? -28 : 28)} ${(L + py) / 2})`}
      >
        {fromBottom}
      </text>
    </g>
  )
}

export interface CutDiagramProps {
  measure: SheetMeasure
  piece: Polygon
  kind: 'full' | 'cut'
  spec: SheetSpec
  compact?: boolean
}

export function CutDiagram({
  measure,
  piece,
  kind,
  spec,
  compact = false,
}: CutDiagramProps) {
  const W = spec.width
  const L = spec.length
  const hex = sheetOutline(spec)
  const vbX = -MARGIN_LEFT
  const vbY = -MARGIN_TOP
  const vbW = W + MARGIN_LEFT + MARGIN_RIGHT
  const vbH = L + MARGIN_TOP + MARGIN_BOTTOM
  const pid = `hatch-${W}-${L}`

  const dimPoints: EdgePoint[] = []
  for (const c of measure.cuts) {
    dimPoints.push(c.a, c.b)
  }

  const kept = kind === 'full' ? hex : piece

  return (
    <svg
      className={`cut-diagram${compact ? ' cut-diagram--compact' : ''}`}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      width="100%"
      role="img"
      aria-label="Lakšto pjovimo schema"
    >
      <defs>
        <pattern
          id={pid}
          patternUnits="userSpaceOnUse"
          width="16"
          height="16"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="16" stroke="#c0392b" strokeWidth="3" />
        </pattern>
      </defs>

      {spec.crestX.map((cx, i) => (
        <text
          key={`wl-${i}`}
          x={cx}
          y={-36}
          textAnchor="middle"
          fontSize={CREST_FS}
          fill="#444"
          fontWeight={700}
        >
          {i + 1}
        </text>
      ))}

      <polygon
        points={polyPointsFlipped(hex, L)}
        fill={`url(#${pid})`}
        stroke="#222"
        strokeWidth={2}
      />
      <polygon
        points={polyPointsFlipped(kept, L)}
        fill="#e8b4a4"
        stroke="#222"
        strokeWidth={2.5}
      />

      {spec.crestX.map((cx, i) => (
        <line
          key={`c-${i}`}
          x1={cx}
          y1={0}
          x2={cx}
          y2={L}
          stroke="#666"
          strokeWidth={1.2}
          strokeDasharray="10 8"
        />
      ))}

      {measure.cuts.map((c, i) => (
        <line
          key={`cut-${i}`}
          x1={c.a.p.x}
          y1={sy(c.a.p.y, L)}
          x2={c.b.p.x}
          y2={sy(c.b.p.y, L)}
          stroke="#c0392b"
          strokeWidth={CUT_STROKE}
          strokeLinecap="round"
        />
      ))}

      {measure.holes.map((h, i) => {
        const cy = sy(h.y, L)
        if (h.lost) {
          return (
            <g key={`h-${i}`}>
              <circle
                cx={h.x}
                cy={cy}
                r={HOLE_R}
                fill="none"
                stroke="#999"
                strokeWidth={2.5}
              />
              <line
                x1={h.x - HOLE_R}
                y1={cy - HOLE_R}
                x2={h.x + HOLE_R}
                y2={cy + HOLE_R}
                stroke="#999"
                strokeWidth={2.5}
              />
              <line
                x1={h.x + HOLE_R}
                y1={cy - HOLE_R}
                x2={h.x - HOLE_R}
                y2={cy + HOLE_R}
                stroke="#999"
                strokeWidth={2.5}
              />
            </g>
          )
        }
        return <circle key={`h-${i}`} cx={h.x} cy={cy} r={HOLE_R} fill="#111" />
      })}

      {measure.replacementHoles.map((h, i) => {
        const cy = sy(h.y, L)
        return (
          <g key={`rh-${i}`}>
            <circle
              cx={h.x}
              cy={cy}
              r={HOLE_R + 5}
              fill="none"
              stroke="#e67e22"
              strokeWidth={3.5}
            />
            <circle cx={h.x} cy={cy} r={HOLE_R} fill="#e67e22" />
            <text
              x={h.x}
              y={cy - HOLE_R - 16}
              textAnchor="middle"
              fontSize={DRILL_FS}
              fill="#c45c12"
              fontWeight={700}
            >
              {lt.drillLabel}
            </text>
          </g>
        )
      })}

      {!compact &&
        dimPoints.map((ep, i) => (
          <DimensionAnnotations key={`d-${i}`} ep={ep} spec={spec} idx={i} />
        ))}
    </svg>
  )
}
