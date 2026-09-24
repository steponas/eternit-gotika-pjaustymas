import type { Polygon, SheetSpec } from './types'

export const GOTIKA: SheetSpec = {
  width: 920,
  length: 585,
  sideOverlap: 47,
  endOverlap: 125,
  cornerCutW: 50,
  cornerCutH: 134,
  waveHeight: 51,
  thickness: 6,
  crestX: [111, 285.6, 460.2, 634.8, 809.4],
  holeWaves: [2, 5],
  holeFromTop: 30,
  holeFromBottom: 95,
}

export function pitchX(spec: SheetSpec): number {
  return spec.width - spec.sideOverlap
}

export function pitchY(spec: SheetSpec): number {
  return spec.length - spec.endOverlap
}

export function sheetOutline(spec: SheetSpec): Polygon {
  const { width, length, cornerCutW, cornerCutH } = spec
  return [
    { x: cornerCutW, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length - cornerCutH },
    { x: width - cornerCutW, y: length },
    { x: 0, y: length },
    { x: 0, y: cornerCutH },
  ]
}

export function holes(
  spec: SheetSpec,
): { x: number; y: number; wave: number; pos: 'top' | 'bottom' }[] {
  const result: { x: number; y: number; wave: number; pos: 'top' | 'bottom' }[] =
    []
  for (const w of spec.holeWaves) {
    const x = spec.crestX[w - 1]!
    result.push({ x, y: spec.holeFromBottom, wave: w, pos: 'bottom' })
    result.push({
      x,
      y: spec.length - spec.holeFromTop,
      wave: w,
      pos: 'top',
    })
  }
  return result
}

export function profileZ(x: number, spec: SheetSpec): number {
  const p = pitchX(spec) / 5
  return (
    (spec.waveHeight / 2) *
    (1 + Math.cos((2 * Math.PI * (x - spec.crestX[0]!)) / p))
  )
}
