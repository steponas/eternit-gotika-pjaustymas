import { describe, expect, it } from 'vitest'
import { GOTIKA, holes, pitchX, pitchY, profileZ, sheetOutline } from './sheet'
import { clipConvex, polygonArea, rectPolygon } from './polygon'
import { buildArea } from './area'
import { computeLayout, countSheets } from './layout'
import { measureSheet } from './measure'
import type { LayoutInput } from './types'

function translatePoly(
  poly: { x: number; y: number }[],
  ox: number,
  oy: number,
) {
  return poly.map((p) => ({ x: p.x + ox, y: p.y + oy }))
}

function pointInPoly(
  p: { x: number; y: number },
  poly: { x: number; y: number }[],
): boolean {
  // ray cast for coverage checks
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x
    const yi = poly[i]!.y
    const xj = poly[j]!.x
    const yj = poly[j]!.y
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

describe('sheet', () => {
  it('sheetOutline area matches sheet minus two corner triangles', () => {
    const expected = 920 * 585 - 2 * (0.5 * 50 * 134)
    expect(polygonArea(sheetOutline(GOTIKA))).toBeCloseTo(expected, 6)
  })

  it('holes positions for defaults', () => {
    const h = holes(GOTIKA)
    expect(h).toHaveLength(4)
    const byKey = Object.fromEntries(h.map((x) => [`${x.wave}-${x.pos}`, x]))
    expect(byKey['2-bottom']).toMatchObject({ x: 285.6, y: 95 })
    expect(byKey['2-top']).toMatchObject({ x: 285.6, y: 555 })
    expect(byKey['5-bottom']).toMatchObject({ x: 809.4, y: 95 })
    expect(byKey['5-top']).toMatchObject({ x: 809.4, y: 555 })
  })

  it('profileZ max at crest and zero at trough', () => {
    expect(profileZ(GOTIKA.crestX[0]!, GOTIKA)).toBeCloseTo(51, 6)
    expect(profileZ(GOTIKA.crestX[0]! + 87.3, GOTIKA)).toBeCloseTo(0, 6)
  })

  it('pitch helpers', () => {
    expect(pitchX(GOTIKA)).toBe(873)
    expect(pitchY(GOTIKA)).toBe(460)
  })
})

describe('clipConvex', () => {
  it('square ∩ square', () => {
    const a = rectPolygon(0, 0, 10, 10)
    const b = rectPolygon(5, 5, 15, 15)
    const c = clipConvex(a, b)
    expect(polygonArea(c)).toBeCloseTo(25, 6)
  })

  it('disjoint → empty', () => {
    const a = rectPolygon(0, 0, 1, 1)
    const b = rectPolygon(2, 2, 3, 3)
    expect(clipConvex(a, b)).toHaveLength(0)
  })
})

describe('layout rectangle 3x3', () => {
  it('exactly 3 columns x 3 rows all full', () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 920 + 2 * 873,
        topWidth: 920 + 2 * 873,
        height: 585 + 2 * 460,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    expect(layout.rows).toBe(3)
    expect(layout.cols).toBe(3)
    expect(layout.sheets).toHaveLength(9)
    expect(layout.sheets.every((s) => s.kind === 'full')).toBe(true)
    expect(layout.topRowKeep).toBe(585)
    const counts = countSheets(layout)
    expect(counts).toMatchObject({ full: 9, cut: 0, total: 9, rows: 3, cols: 3 })
  })
})

describe('top row keep', () => {
  it('height 1200 → topRowKeep 280 with horizontal cut', () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 2666,
        topWidth: 2666,
        height: 1200,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    expect(layout.rows).toBe(3)
    expect(layout.topRowKeep).toBe(280)
    const topSheets = layout.sheets.filter((s) => s.isTopRow)
    expect(topSheets.length).toBeGreaterThan(0)
    for (const s of topSheets) {
      expect(s.kind).toBe('cut')
      const m = measureSheet(s)
      expect(m.cuts.length).toBe(1)
      const cut = m.cuts[0]!
      expect(cut.a.p.y).toBeCloseTo(280, 1)
      expect(cut.b.p.y).toBeCloseTo(280, 1)
      const edges = new Set([cut.a.edge, cut.b.edge])
      for (const e of edges) {
        expect(['left', 'right', 'cornerBL', 'cornerTR']).toContain(e)
      }
    }
  })
})

describe('symmetric trapezoid coverage', () => {
  it('pieces inside area, coverage, order, no empty ownership', () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 5000,
        topWidth: 2000,
        height: 3000,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    const areaPoly = layout.area
    const areaA = polygonArea(areaPoly)

    let sumPieces = 0
    for (const s of layout.sheets) {
      sumPieces += s.pieceArea
      const roofPiece = translatePoly(s.piece, s.origin.x, s.origin.y)
      // sample centroids / vertices inside area
      for (const p of roofPiece) {
        expect(pointInPoly(p, areaPoly) || distToBoundary(p, areaPoly) < 0.5).toBe(
          true,
        )
      }
    }
    expect(sumPieces).toBeGreaterThanOrEqual(areaA - 1)

    const orders = layout.sheets.map((s) => s.order).sort((a, b) => a - b)
    expect(orders).toEqual(Array.from({ length: layout.sheets.length }, (_, i) => i + 1))

    const sorted = [...layout.sheets].sort((a, b) => a.order - b.order)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!
      const cur = sorted[i]!
      if (prev.row === cur.row) {
        expect(prev.origin.x).toBeGreaterThanOrEqual(cur.origin.x)
      } else {
        expect(cur.row).toBeGreaterThan(prev.row)
      }
    }
  })
})

function distToBoundary(
  p: { x: number; y: number },
  poly: { x: number; y: number }[],
): number {
  let min = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const qx = a.x + t * dx
    const qy = a.y + t * dy
    min = Math.min(min, Math.hypot(p.x - qx, p.y - qy))
  }
  return min
}

describe('startMode and anchors', () => {
  it("startMode 'cut' with startCut=200 anchor right", () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 2666,
        topWidth: 2666,
        height: 585,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'cut',
      startCut: 200,
    }
    const layout = computeLayout(input)
    const rightmost = layout.sheets.reduce((a, b) =>
      a.origin.x > b.origin.x ? a : b,
    )
    expect(rightmost.origin.x + 920).toBeCloseTo(layout.bounds.maxX + 200, 6)
  })

  it("startMode 'balance' equal overhangs on rectangle", () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 2000,
        topWidth: 2000,
        height: 585,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'balance',
      startCut: 0,
    }
    const layout = computeLayout(input)
    const left = Math.min(...layout.sheets.map((s) => s.origin.x))
    const right = Math.max(...layout.sheets.map((s) => s.origin.x + GOTIKA.width))
    const leftOver = layout.bounds.minX - left
    const rightOver = right - layout.bounds.maxX
    expect(Math.abs(leftOver - rightOver)).toBeLessThanOrEqual(0.5)
  })

  it("anchor 'left' full: leftmost origin.x === minX", () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 2666,
        topWidth: 2666,
        height: 585,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'left',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    const leftmost = Math.min(...layout.sheets.map((s) => s.origin.x))
    expect(leftmost).toBeCloseTo(layout.bounds.minX, 6)
  })
})

describe('measureSheet', () => {
  it('vertical cut on 800mm wide rectangle', () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 800,
        topWidth: 800,
        height: 585,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    expect(layout.sheets).toHaveLength(1)
    const s = layout.sheets[0]!
    expect(s.origin.x).toBeCloseTo(-120, 6)
    const m = measureSheet(s)
    expect(m.cuts).toHaveLength(1)
    const cut = m.cuts[0]!
    expect(cut.a.p.x).toBeCloseTo(120, 1)
    expect(cut.b.p.x).toBeCloseTo(120, 1)
    const bottom = cut.a.edge === 'bottom' ? cut.a : cut.b
    const top = cut.a.edge === 'top' ? cut.a : cut.b
    expect(bottom.edge).toBe('bottom')
    expect(top.edge).toBe('top')
    expect(bottom.fromLeft).toBeCloseTo(120, 1)
    expect(bottom.fromRight).toBeCloseTo(800, 1)
    expect(top.fromLeft).toBeCloseTo(120, 1)

    expect(m.holes.every((h) => !h.lost)).toBe(true)
  })

  it('cut removes wave-2 holes and suggests replacements on wave 3', () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 600,
        topWidth: 600,
        height: 585 + 460,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    const bottom = layout.sheets.find((s) => s.row === 0)!
    expect(bottom.isTopRow).toBe(false)
    expect(bottom.origin.x).toBeCloseTo(600 - 920, 6)
    const m = measureSheet(bottom)
    const lost = m.holes.filter((h) => h.lost)
    expect(lost.some((h) => h.wave === 2)).toBe(true)
    expect(m.replacementHoles.filter((r) => r.wave === 3 && r.y === 95)).toHaveLength(1)
    expect(m.replacementHoles.filter((r) => r.wave === 3 && r.y === 555)).toHaveLength(1)
    expect(m.replacementHoles.every((r) => r.x === 460.2)).toBe(true)
  })

  it('diagonal cut reports fromLeft+fromRight = 920 on bottom/top', () => {
    const input: LayoutInput = {
      area: {
        bottomWidth: 5000,
        topWidth: 2000,
        height: 3000,
        shape: 'symmetric',
        topOffset: 0,
      },
      anchor: 'right',
      startMode: 'full',
      startCut: 0,
    }
    const layout = computeLayout(input)
    let checked = 0
    for (const s of layout.sheets) {
      if (s.kind !== 'cut') continue
      const m = measureSheet(s)
      for (const cut of m.cuts) {
        for (const ep of [cut.a, cut.b]) {
          if (ep.edge === 'bottom' || ep.edge === 'top') {
            expect((ep.fromLeft ?? 0) + (ep.fromRight ?? 0)).toBeCloseTo(920, 1)
            checked++
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})

describe('buildArea', () => {
  it('symmetric offset', () => {
    const poly = buildArea({
      bottomWidth: 100,
      topWidth: 60,
      height: 50,
      shape: 'symmetric',
      topOffset: 0,
    })
    expect(poly[0]).toEqual({ x: 0, y: 0 })
    expect(poly[1]).toEqual({ x: 100, y: 0 })
    expect(poly[2]).toEqual({ x: 20 + 60, y: 50 })
    expect(poly[3]).toEqual({ x: 20, y: 50 })
  })
})
