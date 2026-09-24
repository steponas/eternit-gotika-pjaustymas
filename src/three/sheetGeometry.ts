import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three'
import {
  clipConvex,
  ensureCCW,
  pointInConvex,
  polygonArea,
  rectPolygon,
} from '../geometry/polygon'
import { profileZ, sheetOutline } from '../geometry/sheet'
import type { CutSegment } from '../geometry/measure'
import type { Polygon, SheetSpec, Vec2 } from '../geometry/types'

export const MM = 0.001
export const STRIP_MM = 8
export const BACK_OFFSET_MM = 6

function polygonKey(poly: Polygon): string {
  return poly.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(';')
}

function collectStripXs(polygon: Polygon, stripMm: number): number[] {
  const xs = new Set<number>()
  let minX = Infinity
  let maxX = -Infinity
  for (const p of polygon) {
    xs.add(p.x)
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return []
  for (let x = minX; x <= maxX + 1e-9; x += stripMm) {
    xs.add(x)
  }
  xs.add(maxX)
  return [...xs].sort((a, b) => a - b)
}

function fanTriangles(poly: Polygon): number[] {
  const indices: number[] = []
  if (poly.length < 3) return indices
  for (let i = 1; i < poly.length - 1; i++) {
    indices.push(0, i, i + 1)
  }
  return indices
}

function pushVertex(
  positions: number[],
  uvs: number[],
  p: Vec2,
  zMm: number,
  width: number,
  length: number,
): void {
  positions.push(p.x * MM, p.y * MM, zMm * MM)
  uvs.push(p.x / width, p.y / length)
}

/**
 * Build corrugated sheet BufferGeometry for a convex sheet-local polygon (mm).
 * Vertices are in metres. Front face at profileZ; optional back face offset below.
 */
export function buildSheetGeometry(
  polygon: Polygon,
  spec: SheetSpec,
  options?: { stripMm?: number; includeBack?: boolean },
): BufferGeometry {
  const stripMm = options?.stripMm ?? STRIP_MM
  const includeBack = options?.includeBack ?? true
  const poly = ensureCCW(polygon)
  if (poly.length < 3) {
    return new BufferGeometry()
  }

  const xs = collectStripXs(poly, stripMm)
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const addFace = (strip: Polygon, back: boolean) => {
    if (strip.length < 3) return
    const base = positions.length / 3
    const zSign = back ? -1 : 1
    const zOff = back ? -BACK_OFFSET_MM : 0
    for (const p of strip) {
      const z = zSign * profileZ(p.x, spec) + zOff
      pushVertex(positions, uvs, p, z, spec.width, spec.length)
    }
    const tris = fanTriangles(strip)
    if (back) {
      for (let i = 0; i < tris.length; i += 3) {
        indices.push(base + tris[i]!, base + tris[i + 2]!, base + tris[i + 1]!)
      }
    } else {
      for (const idx of tris) indices.push(base + idx)
    }
  }

  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i]!
    const x1 = xs[i + 1]!
    if (x1 - x0 < 1e-9) continue
    const strip = clipConvex(
      poly,
      rectPolygon(x0, -1, x1, spec.length + 1),
    )
    if (strip.length < 3) continue
    const ccw = ensureCCW(strip)
    addFace(ccw, false)
    if (includeBack) addFace(ccw, true)
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Half-plane clip polygon on the OUTSIDE of directed edge a→b (right side). */
export function outsideHalfPlane(a: Vec2, b: Vec2, pad = 1e5): Polygon {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const ox = uy
  const oy = -ux
  return ensureCCW([
    { x: a.x - ux * pad, y: a.y - uy * pad },
    { x: a.x - ux * pad + ox * pad, y: a.y - uy * pad + oy * pad },
    { x: b.x + ux * pad + ox * pad, y: b.y + uy * pad + oy * pad },
    { x: b.x + ux * pad, y: b.y + uy * pad },
  ])
}

/** Outward unit normal (mm space) for a cut edge, pointing away from the kept piece. */
export function cutOutwardNormal(a: Vec2, b: Vec2, piece: Polygon): Vec2 {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const right = { x: dy / len, y: -dx / len }
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const probe = { x: mid.x + right.x * 2, y: mid.y + right.y * 2 }
  if (!pointInConvex(probe, piece, 1e-6)) return right
  return { x: -right.x, y: -right.y }
}

/**
 * Build offcut ghost geometries: for each cut segment, hex ∩ outside half-plane.
 * Overlaps between halves are intentional for a translucent ghost.
 */
export function buildOffcutGeometries(
  piece: Polygon,
  cuts: CutSegment[],
  spec: SheetSpec,
): BufferGeometry[] {
  const hex = sheetOutline(spec)
  const geos: BufferGeometry[] = []
  for (const cut of cuts) {
    const a = cut.a.p
    const b = cut.b.p
    let ea = a
    let eb = b
    const dx = eb.x - ea.x
    const dy = eb.y - ea.y
    const len = Math.hypot(dx, dy) || 1
    const right = { x: dy / len, y: -dx / len }
    const mid = { x: (ea.x + eb.x) / 2, y: (ea.y + eb.y) / 2 }
    const probe = { x: mid.x + right.x * 2, y: mid.y + right.y * 2 }
    if (pointInConvex(probe, piece, 1e-6)) {
      ea = b
      eb = a
    }
    const half = outsideHalfPlane(ea, eb)
    const offcut = clipConvex(hex, half)
    if (offcut.length < 3) continue
    geos.push(
      buildSheetGeometry(ensureCCW(offcut), spec, { includeBack: false }),
    )
  }
  return geos
}

/** Sample cut segment points along the wave surface (metres, sheet-local). */
export function sampleCutLine(
  a: Vec2,
  b: Vec2,
  spec: SheetSpec,
  samples = 40,
  zLiftMm = 2,
): [number, number, number][] {
  const pts: [number, number, number][] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    const z = profileZ(x, spec) + zLiftMm
    pts.push([x * MM, y * MM, z * MM])
  }
  return pts
}

/** Sum of signed XY triangle areas (front+back ⇒ ~2×). Returns absolute value. */
export function xyTriangleAreaSum(geo: BufferGeometry): number {
  const pos = geo.getAttribute('position') as BufferAttribute
  const index = geo.getIndex()
  if (!index || !pos) return 0
  let area = 0
  for (let i = 0; i < index.count; i += 3) {
    const i0 = index.getX(i)
    const i1 = index.getX(i + 1)
    const i2 = index.getX(i + 2)
    const ax = pos.getX(i0)
    const ay = pos.getY(i0)
    const bx = pos.getX(i1)
    const by = pos.getY(i1)
    const cx = pos.getX(i2)
    const cy = pos.getY(i2)
    area += (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2
  }
  return Math.abs(area)
}

export function geometryZRange(geo: BufferGeometry): {
  min: number
  max: number
} {
  const pos = geo.getAttribute('position') as BufferAttribute
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i)
    min = Math.min(min, z)
    max = Math.max(max, z)
  }
  return { min, max }
}

const geoCache = new Map<string, BufferGeometry>()

export function getCachedSheetGeometry(
  polygon: Polygon,
  spec: SheetSpec,
  options?: { stripMm?: number; includeBack?: boolean },
): BufferGeometry {
  const includeBack = options?.includeBack ?? true
  const stripMm = options?.stripMm ?? STRIP_MM
  const key = `${polygonKey(polygon)}|${spec.width}x${spec.length}|${stripMm}|${includeBack ? 1 : 0}|${spec.waveHeight}`
  let geo = geoCache.get(key)
  if (!geo) {
    geo = buildSheetGeometry(polygon, spec, { stripMm, includeBack })
    geoCache.set(key, geo)
  }
  return geo
}

export function clearGeometryCache(): void {
  for (const g of geoCache.values()) g.dispose()
  geoCache.clear()
}

export { polygonArea }
