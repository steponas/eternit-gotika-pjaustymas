import type { Polygon, Vec2 } from './types'

const DEDUPE_EPS = 1e-6

export function polygonAreaSigned(poly: Polygon): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

export function polygonArea(poly: Polygon): number {
  return Math.abs(polygonAreaSigned(poly))
}

export function ensureCCW(poly: Polygon): Polygon {
  if (poly.length < 3) return poly.slice()
  if (polygonAreaSigned(poly) < 0) return poly.slice().reverse()
  return poly.slice()
}

export function translate(poly: Polygon, dx: number, dy: number): Polygon {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

export function rectPolygon(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Polygon {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
}

export function distPointSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Point strictly inside or on boundary of convex CCW polygon. */
export function pointInConvex(p: Vec2, poly: Polygon, eps = 1e-9): boolean {
  if (poly.length < 3) return false
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
    if (cross < -eps) return false
  }
  return true
}

function cross2(o: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function lineIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)
  if (Math.abs(den) < 1e-12) return null
  const t =
    ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}

function isInsideEdge(p: Vec2, a: Vec2, b: Vec2): boolean {
  // left of directed edge a→b (CCW clip means interior is to the left)
  return cross2(a, b, p) >= -1e-9
}

function dedupePolygon(poly: Polygon): Polygon {
  if (poly.length === 0) return []
  const out: Polygon = []
  for (const p of poly) {
    const prev = out[out.length - 1]
    if (
      !prev ||
      Math.hypot(p.x - prev.x, p.y - prev.y) > DEDUPE_EPS
    ) {
      out.push(p)
    }
  }
  if (out.length > 1) {
    const first = out[0]!
    const last = out[out.length - 1]!
    if (Math.hypot(first.x - last.x, first.y - last.y) <= DEDUPE_EPS) {
      out.pop()
    }
  }
  return out
}

/** Sutherland–Hodgman; clip must be convex CCW. */
export function clipConvex(subject: Polygon, clip: Polygon): Polygon {
  if (subject.length === 0 || clip.length < 3) return []
  let output = subject.slice()
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i]!
    const b = clip[(i + 1) % clip.length]!
    const input = output
    output = []
    if (input.length === 0) break
    for (let j = 0; j < input.length; j++) {
      const cur = input[j]!
      const prev = input[(j + input.length - 1) % input.length]!
      const curIn = isInsideEdge(cur, a, b)
      const prevIn = isInsideEdge(prev, a, b)
      if (curIn) {
        if (!prevIn) {
          const inter = lineIntersect(prev, cur, a, b)
          if (inter) output.push(inter)
        }
        output.push(cur)
      } else if (prevIn) {
        const inter = lineIntersect(prev, cur, a, b)
        if (inter) output.push(inter)
      }
    }
  }
  return dedupePolygon(output)
}
