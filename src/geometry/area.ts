import type { AreaInput, Polygon } from './types'
import { ensureCCW } from './polygon'

export function buildArea(a: AreaInput): Polygon {
  let off: number
  switch (a.shape) {
    case 'symmetric':
      off = (a.bottomWidth - a.topWidth) / 2
      break
    case 'leftVertical':
      off = 0
      break
    case 'rightVertical':
      off = a.bottomWidth - a.topWidth
      break
    case 'custom':
      off = a.topOffset
      break
  }
  return ensureCCW([
    { x: 0, y: 0 },
    { x: a.bottomWidth, y: 0 },
    { x: off + a.topWidth, y: a.height },
    { x: off, y: a.height },
  ])
}

export function validateArea(a: AreaInput): string[] {
  const errors: string[] = []
  if (!(a.bottomWidth > 0)) errors.push('Plotis turi būti didesnis už 0')
  if (!(a.topWidth > 0)) errors.push('Viršutinis plotis turi būti didesnis už 0')
  if (!(a.height > 0)) errors.push('Aukštis turi būti didesnis už 0')
  return errors
}
