import {
  MathUtils,
  PerspectiveCamera,
  Vector3,
} from 'three'
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

/** Elevation of orbit camera above the roof plane (degrees). */
export const ORBIT_ELEVATION_DEG = 52

export const DEFAULT_VFOV_DEG = 42

/** HTML overlay buttons cover the top of the canvas (px). */
export const TOP_OVERLAY_PX = 64

const NDC_MARGIN = 0.9
const FIT_ITERS = 40
const DIST_LO = 0.1
const DIST_HI = 200

/** Apply roof group rotation to a group-local point → world. */
export function roofLocalToWorld(
  local: Vector3,
  out = new Vector3(),
): Vector3 {
  const θ = ROOF_GROUP_ROTATION[0]
  const cos = Math.cos(θ)
  const sin = Math.sin(θ)
  return out.set(
    local.x,
    local.y * cos - local.z * sin,
    local.y * sin + local.z * cos,
  )
}

export function roofLocalToWorldDir(
  local: Vector3,
  out = new Vector3(),
): Vector3 {
  return roofLocalToWorld(local, out)
}

export interface CameraTargets {
  position: Vector3
  target: Vector3
}

export interface NdcBand {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Allowed NDC band: ±0.9 on X; Y leaves the top overlay clear.
 * Top overlay occupies `2 * topOverlayPx / height` of the full NDC Y range [-1,1].
 */
export function ndcBandForCanvas(
  canvasHeight: number,
  topOverlayPx = TOP_OVERLAY_PX,
): NdcBand {
  const h = Math.max(1, canvasHeight)
  const top = Math.min(topOverlayPx, h * 0.45)
  return {
    minX: -NDC_MARGIN,
    maxX: NDC_MARGIN,
    minY: -NDC_MARGIN,
    maxY: NDC_MARGIN - (2 * top) / h,
  }
}

/**
 * Order-label height in metres: clamp(140 mm, 0.035 * max(span), 260 mm).
 */
export function orderLabelHeightM(layout: Layout): number {
  const w = (layout.bounds.maxX - layout.bounds.minX) * MM
  const h = layout.bounds.height * MM
  const span = Math.max(w, h, 0.5)
  return Math.min(0.26, Math.max(0.14, 0.035 * span))
}

/** 8 corners of a centred AABB in local metres. */
export function boxCorners(
  w: number,
  h: number,
  d = 0.051,
  centre = new Vector3(0, 0, d * 0.5),
): Vector3[] {
  const corners: Vector3[] = []
  for (const x of [-w / 2, w / 2]) {
    for (const y of [-h / 2, h / 2]) {
      for (const z of [centre.z - d / 2, centre.z + d / 2]) {
        corners.push(new Vector3(centre.x + x, centre.y + y, z))
      }
    }
  }
  return corners
}

function areaWorldCorners(layout: Layout, waveHeightM = 0.051): Vector3[] {
  const { minX, maxX, height } = layout.bounds
  const cx = (minX + maxX) / 2
  const cy = height / 2
  const x0 = (minX - cx) * MM
  const x1 = (maxX - cx) * MM
  const y0 = (0 - cy) * MM
  const y1 = (height - cy) * MM
  const corners: Vector3[] = []
  for (const x of [x0, x1]) {
    for (const y of [y0, y1]) {
      for (const z of [0, waveHeightM]) {
        corners.push(roofLocalToWorld(new Vector3(x, y, z)))
      }
    }
  }
  return corners
}

function placeCamera(
  camera: PerspectiveCamera,
  target: Vector3,
  dir: Vector3,
  dist: number,
): void {
  camera.position.copy(target).addScaledVector(dir, dist)
  camera.lookAt(target)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
}

function cornersFitBand(
  camera: PerspectiveCamera,
  corners: Vector3[],
  band: NdcBand,
): boolean {
  const v = new Vector3()
  const view = new Vector3()
  for (const c of corners) {
    // Must be in front of the camera (Three.js looks down −Z)
    view.copy(c).applyMatrix4(camera.matrixWorldInverse)
    if (!(view.z < -camera.near * 0.5)) return false

    v.copy(c).project(camera)
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) return false
    // Only X/Y NDC matter for framing — do NOT require NDC z∈[-1,1],
    // which fails whenever distance > camera.far and wrongly blows up the search.
    if (Math.abs(v.x) > band.maxX) return false
    if (v.y < band.minY || v.y > band.maxY) return false
  }
  return true
}

function projectedNdcBBox(
  camera: PerspectiveCamera,
  corners: Vector3[],
): { minX: number; maxX: number; minY: number; maxY: number } {
  const v = new Vector3()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const c of corners) {
    v.copy(c).project(camera)
    minX = Math.min(minX, v.x)
    maxX = Math.max(maxX, v.x)
    minY = Math.min(minY, v.y)
    maxY = Math.max(maxY, v.y)
  }
  return { minX, maxX, minY, maxY }
}

/** Binary-search minimum distance so all corners sit inside the NDC band. */
export function binarySearchFitDistance(
  camera: PerspectiveCamera,
  target: Vector3,
  dir: Vector3,
  corners: Vector3[],
  band: NdcBand,
  lo = DIST_LO,
  hi = DIST_HI,
  iters = FIT_ITERS,
): number {
  // Ensure hi fits; expand if needed
  placeCamera(camera, target, dir, hi)
  let guard = 0
  while (!cornersFitBand(camera, corners, band) && hi < DIST_HI * 8 && guard < 8) {
    hi *= 2
    placeCamera(camera, target, dir, hi)
    guard++
  }

  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) * 0.5
    placeCamera(camera, target, dir, mid)
    if (cornersFitBand(camera, corners, band)) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return hi
}

/**
 * Pan target (+ camera) along camera right/up so the projected bbox centre
 * sits at ndc.x = 0 and ndc.y = midpoint of the allowed band.
 */
function recenterTarget(
  camera: PerspectiveCamera,
  target: Vector3,
  corners: Vector3[],
  band: NdcBand,
): void {
  const bb = projectedNdcBBox(camera, corners)
  const cx = (bb.minX + bb.maxX) * 0.5
  const cy = (bb.minY + bb.maxY) * 0.5
  const desiredCy = (band.minY + band.maxY) * 0.5

  const depth = camera.position.distanceTo(target)
  const halfV =
    Math.tan(MathUtils.degToRad(camera.fov) * 0.5) * Math.max(depth, 1e-6)
  const halfH = halfV * camera.aspect

  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize()
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize()

  // Pan camera+target right when content is too far right (cx > 0)
  const shift = right
    .multiplyScalar(cx * halfH)
    .addScaledVector(up, (cy - desiredCy) * halfV)
  target.add(shift)
  camera.position.add(shift)
}

/**
 * Robust numeric camera fit via NDC projection + binary search distance,
 * then re-centre into the clear band below the top overlay. No setViewOffset.
 *
 * Mutates `camera` temporarily for projection; returns the fitted pose.
 * Caller should keep camera.aspect = fullWidth/fullHeight.
 */
export function numericFitCamera(
  camera: PerspectiveCamera,
  corners: Vector3[],
  initialTarget: Vector3,
  viewDir: Vector3,
  canvasWidth: number,
  canvasHeight: number,
  topOverlayPx = TOP_OVERLAY_PX,
): CameraTargets {
  camera.clearViewOffset()
  camera.aspect = canvasWidth / Math.max(1, canvasHeight)
  // Generous far plane so the binary search can evaluate large distances
  // without NDC depth clipping; callers keep their own far after applying pose.
  if (camera.far < 2000) camera.far = 2000
  camera.updateProjectionMatrix()

  const dir = viewDir.clone().normalize()
  const band = ndcBandForCanvas(canvasHeight, topOverlayPx)
  const target = initialTarget.clone()

  // Pass 1: distance → recenter
  let d = binarySearchFitDistance(camera, target, dir, corners, band)
  placeCamera(camera, target, dir, d)
  recenterTarget(camera, target, corners, band)

  // Pass 2: distance again after shift → light recenter → final distance
  d = binarySearchFitDistance(camera, target, dir, corners, band)
  placeCamera(camera, target, dir, d)
  recenterTarget(camera, target, corners, band)
  d = binarySearchFitDistance(camera, target, dir, corners, band)
  placeCamera(camera, target, dir, d)

  return {
    position: camera.position.clone(),
    target: target.clone(),
  }
}

function roofViewDir(mode: 'orbit' | 'top'): Vector3 {
  const normalWorld = roofLocalToWorldDir(new Vector3(0, 0, 1)).normalize()
  if (mode === 'top') return normalWorld

  const slopeWorld = roofLocalToWorldDir(new Vector3(0, 1, 0)).normalize()
  const eaveWorld = roofLocalToWorldDir(new Vector3(1, 0, 0)).normalize()
  const elev = MathUtils.degToRad(ORBIT_ELEVATION_DEG)
  const inPlane = slopeWorld
    .clone()
    .multiplyScalar(-1)
    .addScaledVector(eaveWorld, 0.28)
    .normalize()
  return normalWorld
    .clone()
    .multiplyScalar(Math.sin(elev))
    .addScaledVector(inPlane, Math.cos(elev))
    .normalize()
}

/**
 * Fit RoofScene camera for orbit / top using numeric NDC search.
 */
export function computeCameraTargets(
  layout: Layout,
  mode: 'orbit' | 'top',
  canvasWidth: number,
  canvasHeight: number,
  vfovDeg = DEFAULT_VFOV_DEG,
  topOverlayPx = TOP_OVERLAY_PX,
  scratch?: PerspectiveCamera,
): CameraTargets {
  const corners = areaWorldCorners(layout)
  const target = new Vector3()
  for (const c of corners) target.add(c)
  target.multiplyScalar(1 / corners.length)

  const cam =
    scratch ??
    new PerspectiveCamera(vfovDeg, canvasWidth / Math.max(1, canvasHeight), 0.05, 500)
  cam.fov = vfovDeg
  cam.near = 0.05
  cam.far = 500

  return numericFitCamera(
    cam,
    corners,
    target,
    roofViewDir(mode),
    canvasWidth,
    canvasHeight,
    topOverlayPx,
  )
}

/**
 * Fit SheetInfo3D (or any AABB) with the same numeric utility.
 */
export function computeBoxCameraTargets(
  size: { w: number; h: number; d?: number },
  camDir: Vector3,
  canvasWidth: number,
  canvasHeight: number,
  vfovDeg = 40,
  topOverlayPx = TOP_OVERLAY_PX,
  scratch?: PerspectiveCamera,
): CameraTargets {
  const depth = size.d ?? 0.06
  const corners = boxCorners(size.w, size.h, depth)
  const target = new Vector3(0, 0, depth * 0.5)
  const cam =
    scratch ??
    new PerspectiveCamera(vfovDeg, canvasWidth / Math.max(1, canvasHeight), 0.05, 2000)
  cam.fov = vfovDeg
  cam.near = 0.05
  cam.far = Math.max(cam.far, 2000)

  return numericFitCamera(
    cam,
    corners,
    target,
    camDir,
    canvasWidth,
    canvasHeight,
    topOverlayPx,
  )
}

/** Exported for tests: project corners and report band compliance. */
export function measureProjectedFit(
  camera: PerspectiveCamera,
  corners: Vector3[],
  band: NdcBand,
): {
  ok: boolean
  minX: number
  maxX: number
  minY: number
  maxY: number
  slack: number
} {
  const bb = projectedNdcBBox(camera, corners)
  const ok = cornersFitBand(camera, corners, band)
  const slackLeft = bb.minX - band.minX
  const slackRight = band.maxX - bb.maxX
  const slackBottom = bb.minY - band.minY
  const slackTop = band.maxY - bb.maxY
  const slack = Math.min(slackLeft, slackRight, slackBottom, slackTop)
  return { ok, minX: bb.minX, maxX: bb.maxX, minY: bb.minY, maxY: bb.maxY, slack }
}
