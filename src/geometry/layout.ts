import { buildArea } from './area'
import {
  clipConvex,
  polygonArea,
  rectPolygon,
  translate,
} from './polygon'
import { GOTIKA, pitchX, pitchY, sheetOutline } from './sheet'
import type {
  Layout,
  LayoutInput,
  PlacedSheet,
  SheetSpec,
  Vec2,
} from './types'

export function computeLayout(
  input: LayoutInput,
  spec: SheetSpec = GOTIKA,
): Layout {
  const area = buildArea(input.area)
  const xs = area.map((p) => p.x)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const H = input.area.height
  const pX = pitchX(spec)
  const pY = pitchY(spec)
  const hex = sheetOutline(spec)
  const hexArea = polygonArea(hex)

  const n =
    H <= spec.length ? 1 : 1 + Math.ceil((H - spec.length) / pY)
  const topRowKeep = H - (n - 1) * pY

  let startCutApplied: number
  if (input.startMode === 'full') {
    startCutApplied = 0
  } else if (input.startMode === 'cut') {
    startCutApplied = Math.max(0, Math.min(input.startCut, pX - 1))
  } else {
    const S = maxX - minX
    let N = 1
    while (spec.width + (N - 1) * pX < S) N++
    const E = spec.width + (N - 1) * pX - S
    startCutApplied = E / 2
  }

  // Collect column left edges L before re-indexing
  const columnLefts: number[] = []
  if (input.anchor === 'right') {
    let k = 0
    for (;;) {
      const R = maxX + startCutApplied - k * pX
      const L = R - spec.width
      columnLefts.push(L)
      if (L <= minX) break
      k++
    }
  } else {
    let k = 0
    for (;;) {
      const L = minX - startCutApplied + k * pX
      const R = L + spec.width
      columnLefts.push(L)
      if (R >= maxX) break
      k++
    }
  }
  columnLefts.sort((a, b) => a - b)
  const cols = columnLefts.length

  const placed: PlacedSheet[] = []

  for (let row = 0; row < n; row++) {
    const y_r = row * pY
    for (let col = 0; col < cols; col++) {
      const L = columnLefts[col]!
      const R = L + spec.width
      const origin: Vec2 = { x: L, y: y_r }
      const roofHex = translate(hex, L, y_r)
      const pieceRoof = clipConvex(roofHex, area)
      if (pieceRoof.length < 3) continue

      const x0 = col === 0 ? L : L + spec.sideOverlap
      const x1 = R
      const y0 = row === 0 ? 0 : y_r + spec.endOverlap
      const y1 = y_r + spec.length
      const cell = rectPolygon(x0, y0, x1, y1)
      const owned = clipConvex(pieceRoof, cell)
      if (polygonArea(owned) <= 100) continue

      const piece = translate(pieceRoof, -L, -y_r)
      const pieceArea = polygonArea(piece)
      const kind = Math.abs(pieceArea - hexArea) < 1 ? 'full' : 'cut'

      placed.push({
        id: `r${row}c${col}`,
        row,
        col,
        order: 0,
        origin,
        kind,
        isTopRow: row === n - 1,
        piece,
        pieceArea,
      })
    }
  }

  placed.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    return b.origin.x - a.origin.x
  })
  placed.forEach((s, i) => {
    s.order = i + 1
  })

  return {
    area,
    rows: n,
    cols,
    sheets: placed,
    topRowKeep,
    startCutApplied,
    bounds: { minX, maxX, height: H },
  }
}

export function countSheets(layout: Layout): {
  full: number
  cut: number
  total: number
  rows: number
  cols: number
  screws: number
} {
  const full = layout.sheets.filter((s) => s.kind === 'full').length
  const cut = layout.sheets.filter((s) => s.kind === 'cut').length
  const total = layout.sheets.length
  const topRowSheets = layout.sheets.filter((s) => s.isTopRow).length
  return {
    full,
    cut,
    total,
    rows: layout.rows,
    cols: layout.cols,
    screws: 2 * total + 2 * topRowSheets,
  }
}
