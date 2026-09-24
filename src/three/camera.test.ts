import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import {
  TOP_OVERLAY_PX,
  boxCorners,
  measureProjectedFit,
  ndcBandForCanvas,
  numericFitCamera,
} from './camera'

describe('numericFitCamera', () => {
  it('fits a 6×3.5 m box on a 390×287 canvas tightly inside the NDC band', () => {
    const width = 390
    const height = 287
    const camera = new PerspectiveCamera(45, width / height, 0.05, 500)
    const corners = boxCorners(6, 3.5, 0.051)
    const target = new Vector3(0, 0, 0.0255)
    const viewDir = new Vector3(0.15, -0.35, 0.92).normalize()

    const fitted = numericFitCamera(
      camera,
      corners,
      target,
      viewDir,
      width,
      height,
      TOP_OVERLAY_PX,
    )

    camera.position.copy(fitted.position)
    camera.lookAt(fitted.target)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()

    const band = ndcBandForCanvas(height, TOP_OVERLAY_PX)
    const m = measureProjectedFit(camera, corners, band)

    expect(m.ok).toBe(true)
    expect(m.maxX).toBeLessThanOrEqual(band.maxX + 1e-4)
    expect(m.minX).toBeGreaterThanOrEqual(band.minX - 1e-4)
    expect(m.maxY).toBeLessThanOrEqual(band.maxY + 1e-4)
    expect(m.minY).toBeGreaterThanOrEqual(band.minY - 1e-4)

    // Tight: at least one corner within 0.05 of a band edge
    expect(m.slack).toBeLessThanOrEqual(0.05 + 1e-3)
    expect(m.slack).toBeGreaterThanOrEqual(-1e-3)
  })
})
