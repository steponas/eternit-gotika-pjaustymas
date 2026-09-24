import {
  distPointSegment,
  pointInConvex,
  polygonArea,
} from './polygon'
import { GOTIKA, holes, sheetOutline } from './sheet'
import type { PlacedSheet, Polygon, SheetSpec, Vec2 } from './types'

export type EdgeName =
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'
  | 'cornerBL'
  | 'cornerTR'

export interface EdgePoint {
  p: Vec2
  edge: EdgeName | 'inside'
  fromLeft?: number
  fromRight?: number
  fromBottom?: number
  fromTop?: number
  recommended: 'fromLeft' | 'fromRight' | 'fromBottom' | 'fromTop' | 'xy'
  nearestCrest?: { wave: number; offset: number }
}

export interface CutSegment {
  a: EdgePoint
  b: EdgePoint
  length: number
}

export interface HoleInfo {
  x: number
  y: number
  wave: number
  pos: 'top' | 'bottom'
  lost: boolean
  needed: boolean
  distToCut: number | null
}

export interface SheetMeasure {
  cuts: CutSegment[]
  holes: HoleInfo[]
  replacementHoles: {
    x: number
    y: number
    wave: number
    pos: 'top' | 'bottom'
  }[]
  nearestHoleToCut: {
    wave: number
    pos: 'top' | 'bottom'
    dist: number
  } | null
  offcut: { area: number; bboxW: number; bboxH: number } | null
}

interface NamedEdge {
  name: EdgeName
  a: Vec2
  b: Vec2
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function hexEdges(spec: SheetSpec): NamedEdge[] {
  const { width, length, cornerCutW, cornerCutH } = spec
  return [
    { name: 'bottom', a: { x: cornerCutW, y: 0 }, b: { x: width, y: 0 } },
    {
      name: 'right',
      a: { x: width, y: 0 },
      b: { x: width, y: length - cornerCutH },
    },
    {
      name: 'cornerTR',
      a: { x: width, y: length - cornerCutH },
      b: { x: width - cornerCutW, y: length },
    },
    {
      name: 'top',
      a: { x: width - cornerCutW, y: length },
      b: { x: 0, y: length },
    },
    { name: 'left', a: { x: 0, y: length }, b: { x: 0, y: cornerCutH } },
    {
      name: 'cornerBL',
      a: { x: 0, y: cornerCutH },
      b: { x: cornerCutW, y: 0 },
    },
  ]
}

function classifyPoint(p: Vec2, spec: SheetSpec): EdgeName | 'inside' {
  const edges = hexEdges(spec)
  let best: EdgeName | null = null
  let bestD = Infinity
  for (const e of edges) {
    const d = distPointSegment(p, e.a, e.b)
    if (d < bestD) {
      bestD = d
      best = e.name
    }
  }
  if (best !== null && bestD <= 0.5) return best
  return 'inside'
}

function edgeLiesOnOutline(
  a: Vec2,
  b: Vec2,
  spec: SheetSpec,
): boolean {
  for (const e of hexEdges(spec)) {
    if (distPointSegment(a, e.a, e.b) <= 0.5 && distPointSegment(b, e.a, e.b) <= 0.5) {
      return true
    }
  }
  return false
}

function recommendedFor(edge: EdgeName | 'inside'): EdgePoint['recommended'] {
  switch (edge) {
    case 'bottom':
      return 'fromRight'
    case 'top':
      return 'fromLeft'
    case 'left':
      return 'fromTop'
    case 'right':
      return 'fromBottom'
    default:
      return 'xy'
  }
}

function nearestCrestAt(
  x: number,
  spec: SheetSpec,
): { wave: number; offset: number } {
  let bestWave = 1
  let bestOff = Infinity
  for (let i = 0; i < spec.crestX.length; i++) {
    const cx = spec.crestX[i]!
    const off = x - cx
    if (Math.abs(off) < Math.abs(bestOff)) {
      bestOff = off
      bestWave = i + 1
    }
  }
  return { wave: bestWave, offset: round1(bestOff) }
}

function makeEdgePoint(p: Vec2, spec: SheetSpec): EdgePoint {
  const edge = classifyPoint(p, spec)
  const ep: EdgePoint = {
    p: { x: round1(p.x), y: round1(p.y) },
    edge,
    recommended: recommendedFor(edge),
  }
  if (edge === 'bottom' || edge === 'top') {
    ep.fromLeft = round1(p.x)
    ep.fromRight = round1(spec.width - p.x)
    ep.nearestCrest = nearestCrestAt(p.x, spec)
  } else if (edge === 'left' || edge === 'right') {
    ep.fromBottom = round1(p.y)
    ep.fromTop = round1(spec.length - p.y)
  } else if (edge === 'inside') {
    ep.nearestCrest = nearestCrestAt(p.x, spec)
  }
  return ep
}

function distPointToSegments(p: Vec2, segs: CutSegment[]): number | null {
  if (segs.length === 0) return null
  let min = Infinity
  for (const s of segs) {
    min = Math.min(min, distPointSegment(p, s.a.p, s.b.p))
  }
  return min
}

function pointStrictlyInside(p: Vec2, poly: Polygon): boolean {
  if (!pointInConvex(p, poly, 1e-6)) return false
  // treat boundary as not strictly inside for hole "lost" check
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    if (distPointSegment(p, a, b) < 1e-6) return false
  }
  return true
}

function sampleOffcutBBox(
  hex: Polygon,
  piece: Polygon,
  area: number,
): { area: number; bboxW: number; bboxH: number } | null {
  if (area < 1) return null
  const xs = hex.map((p) => p.x)
  const ys = hex.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  let bx0 = Infinity
  let bx1 = -Infinity
  let by0 = Infinity
  let by1 = -Infinity
  let found = false
  for (let x = minX; x <= maxX + 1e-9; x += 5) {
    for (let y = minY; y <= maxY + 1e-9; y += 5) {
      const p = { x, y }
      if (pointInConvex(p, hex) && !pointInConvex(p, piece)) {
        found = true
        bx0 = Math.min(bx0, x)
        bx1 = Math.max(bx1, x)
        by0 = Math.min(by0, y)
        by1 = Math.max(by1, y)
      }
    }
  }
  if (!found) {
    // fallback: use area only with zero bbox if sampling missed
    return { area, bboxW: 0, bboxH: 0 }
  }
  return { area, bboxW: bx1 - bx0, bboxH: by1 - by0 }
}

export function measureSheet(
  s: PlacedSheet,
  spec: SheetSpec = GOTIKA,
): SheetMeasure {
  const hex = sheetOutline(spec)
  const hexArea = polygonArea(hex)

  if (s.kind === 'full') {
    const holeInfos: HoleInfo[] = holes(spec).map((h) => ({
      ...h,
      lost: false,
      needed: !(h.pos === 'top' && s.isTopRow),
      distToCut: null,
    }))
    return {
      cuts: [],
      holes: holeInfos,
      replacementHoles: [],
      nearestHoleToCut: null,
      offcut: null,
    }
  }

  const cuts: CutSegment[] = []
  const piece = s.piece
  for (let i = 0; i < piece.length; i++) {
    const a = piece[i]!
    const b = piece[(i + 1) % piece.length]!
    if (edgeLiesOnOutline(a, b, spec)) continue
    const ea = makeEdgePoint(a, spec)
    const eb = makeEdgePoint(b, spec)
    cuts.push({
      a: ea,
      b: eb,
      length: round1(Math.hypot(b.x - a.x, b.y - a.y)),
    })
  }

  const holeInfos: HoleInfo[] = holes(spec).map((h) => {
    const p = { x: h.x, y: h.y }
    const dist = distPointToSegments(p, cuts)
    const inside = pointStrictlyInside(p, piece)
    const nearCut = dist !== null && dist < 25
    const lost = !inside || nearCut
    const needed = !(h.pos === 'top' && s.isTopRow)
    return {
      ...h,
      lost,
      needed,
      distToCut: dist === null ? null : round1(dist),
    }
  })

  const keptCrests = new Set(
    holeInfos.filter((h) => !h.lost).map((h) => h.wave),
  )

  const replacementHoles: SheetMeasure['replacementHoles'] = []
  for (const h of holeInfos) {
    if (!(h.lost && h.needed)) continue
    let best: { x: number; wave: number; dist: number } | null = null
    for (let i = 0; i < spec.crestX.length; i++) {
      const wave = i + 1
      if (keptCrests.has(wave)) continue
      const x = spec.crestX[i]!
      const p = { x, y: h.y }
      if (!pointInConvex(p, piece)) continue
      const dCut = distPointToSegments(p, cuts)
      if (dCut !== null && dCut < 50) continue
      const distToLost = Math.abs(x - h.x)
      if (!best || distToLost < best.dist) {
        best = { x, wave, dist: distToLost }
      }
    }
    if (best) {
      replacementHoles.push({
        x: best.x,
        y: h.y,
        wave: best.wave,
        pos: h.pos,
      })
    }
  }

  let nearestHoleToCut: SheetMeasure['nearestHoleToCut'] = null
  for (const h of holeInfos) {
    if (h.lost || h.distToCut === null) continue
    if (
      !nearestHoleToCut ||
      h.distToCut < nearestHoleToCut.dist
    ) {
      nearestHoleToCut = { wave: h.wave, pos: h.pos, dist: h.distToCut }
    }
  }

  const offcutArea = hexArea - s.pieceArea
  const offcut = sampleOffcutBBox(hex, piece, offcutArea)

  return {
    cuts,
    holes: holeInfos,
    replacementHoles,
    nearestHoleToCut,
    offcut,
  }
}
