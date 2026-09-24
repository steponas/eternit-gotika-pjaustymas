import { describe, expect, it } from 'vitest'
import { GOTIKA, sheetOutline } from '../geometry/sheet'
import { polygonArea } from '../geometry/polygon'
import {
  MM,
  buildSheetGeometry,
  geometryZRange,
  xyTriangleAreaSum,
} from './sheetGeometry'

describe('buildSheetGeometry', () => {
  it('full hexagon has vertices, XY area ≈ hexagon, z in [0, 0.051]', () => {
    const hex = sheetOutline(GOTIKA)
    const hexAreaMm2 = polygonArea(hex)
    const geo = buildSheetGeometry(hex, GOTIKA, { includeBack: false })

    const pos = geo.getAttribute('position')
    expect(pos).toBeTruthy()
    expect(pos!.count).toBeGreaterThan(10)

    const xyAreaM2 = xyTriangleAreaSum(geo)
    const xyAreaMm2 = xyAreaM2 / (MM * MM)
    expect(xyAreaMm2).toBeGreaterThan(hexAreaMm2 * 0.99)
    expect(xyAreaMm2).toBeLessThan(hexAreaMm2 * 1.01)

    const { min, max } = geometryZRange(geo)
    expect(min).toBeGreaterThanOrEqual(-1e-6)
    expect(max).toBeLessThanOrEqual(0.051 + 1e-6)

    geo.dispose()
  })
})
