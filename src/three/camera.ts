import { MathUtils, Vector3 } from 'three'
import type { Layout } from '../geometry/types'
import { MM } from './sheetGeometry'

/** Roof pitch: group rotation around X so the plane slopes ~35° away from the viewer. */
export const ROOF_PITCH_RAD = MathUtils.degToRad(35)
/** Maps roof XY (Z = normal) into world: eave at front, slope up and away. */
export const ROOF_GROUP_ROTATION: [number, number, number] = [
  -Math.PI / 2 + ROOF_PITCH_RAD,
  0,
  0,
]

export function layoutSizeM(layout: Layout): { w: number; h: number } {
  const { minX, maxX, height } = layout.bounds
  return {
    w: (maxX - minX) * MM,
    h: height * MM,
  }
}

/** Apply roof group rotation to a group-local point → world direction. */
export function roofLocalToWorldDir(
  local: Vector3,
  out = new Vector3(),
): Vector3 {
  const θ = ROOF_GROUP_ROTATION[0]
  const cos = Math.cos(θ)
  const sin = Math.sin(θ)
  const x = local.x
  const y = local.y * cos - local.z * sin
  const z = local.y * sin + local.z * cos
  return out.set(x, y, z)
}

export interface CameraTargets {
  position: Vector3
  target: Vector3
  orthoSize: number
}

/**
 * Compute camera position & look-at for orbit (3/4 from front-below) or top
 * (perpendicular to roof), fitted so the whole area fits on a narrow phone.
 */
export function computeCameraTargets(
  layout: Layout,
  mode: 'orbit' | 'top',
  aspect: number,
): CameraTargets {
  const { w, h } = layoutSizeM(layout)
  const diag = Math.hypot(w, h)
  const pad = 1.25
  const fitSpan = Math.max(w, h, 0.5) * pad

  const centreWorld = roofLocalToWorldDir(new Vector3(0, 0, 0))
  const normalWorld = roofLocalToWorldDir(new Vector3(0, 0, 1)).normalize()
  const slopeWorld = roofLocalToWorldDir(new Vector3(0, 1, 0)).normalize()
  const eaveWorld = roofLocalToWorldDir(new Vector3(1, 0, 0)).normalize()

  const target = centreWorld.clone()

  if (mode === 'top') {
    const fov = 45
    const vFov = MathUtils.degToRad(fov)
    const dist =
      (fitSpan * 0.5) / Math.tan(vFov * 0.5) / Math.min(1, aspect)
    const position = target
      .clone()
      .add(normalWorld.clone().multiplyScalar(dist * 1.05))
    return {
      position,
      target,
      orthoSize: fitSpan / Math.min(1, aspect),
    }
  }

  const fov = 42
  const vFov = MathUtils.degToRad(fov)
  const dist =
    (fitSpan * 0.55) / Math.tan(vFov * 0.5) / Math.min(1, Math.sqrt(aspect))
  const position = target
    .clone()
    .add(normalWorld.clone().multiplyScalar(dist * 0.55))
    .add(slopeWorld.clone().multiplyScalar(-dist * 0.75))
    .add(eaveWorld.clone().multiplyScalar(dist * 0.22))
    .add(new Vector3(0, -diag * 0.08, 0))

  return {
    position,
    target,
    orthoSize: fitSpan,
  }
}
