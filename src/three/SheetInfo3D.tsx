import { Line, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { holes, profileZ, sheetOutline } from '../geometry/sheet'
import type { SheetSpec } from '../geometry'
import { computeBoxCameraTargets, TOP_OVERLAY_PX } from './camera'
import { LabelSprite } from './LabelSprite'
import { COLOR_BG, COLOR_FULL, COLOR_HOLE, COLOR_OUTLINE } from './materials'
import { MM, getCachedSheetGeometry, samplePieceOutline } from './sheetGeometry'

export interface SheetInfo3DViewProps {
  spec: SheetSpec
  showOverlap: boolean
}

const INFO_FOV = 40
/** Visual hole radius ~10 mm */
const HOLE_R_OUTER = 0.01
const HOLE_R_INNER = 0.0055
const OVERLAP_ELEVATION_DEG = 65

const SHEET_TINTS = ['#9c3b2c', '#b5523a', '#7f2f24', '#c86a4a'] as const

function FitCamera({
  sizeM,
  camDir,
  showOverlap,
}: {
  sizeM: { w: number; h: number; d?: number }
  camDir: Vector3
  showOverlap: boolean
}) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const scratchRef = useRef<PerspectiveCamera | null>(null)

  useEffect(() => {
    camera.clearViewOffset()
    camera.aspect = size.width / Math.max(1, size.height)
    camera.far = Math.max(camera.far, 200)
    camera.updateProjectionMatrix()

    if (!scratchRef.current) {
      scratchRef.current = new PerspectiveCamera(
        camera.fov ?? INFO_FOV,
        size.width / Math.max(1, size.height),
        0.05,
        2000,
      )
    }
    const scratch = scratchRef.current
    scratch.fov = camera.fov ?? INFO_FOV

    const t = computeBoxCameraTargets(
      sizeM,
      camDir,
      size.width,
      size.height,
      scratch.fov,
      TOP_OVERLAY_PX,
      scratch,
    )
    camera.position.copy(t.position)
    camera.lookAt(t.target)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()
    if (controls) {
      controls.target.copy(t.target)
      const dist = t.position.distanceTo(t.target)
      controls.minDistance = Math.max(0.2, dist * 0.25)
      controls.maxDistance = Math.max(8, dist * 4)
      controls.update()
    }
  }, [
    sizeM.w,
    sizeM.h,
    sizeM.d,
    camDir,
    camera,
    controls,
    showOverlap,
    size.width,
    size.height,
  ])

  return null
}

function HoleMarker({
  x,
  y,
  z,
  holeMat,
  ringMat,
}: {
  x: number
  y: number
  z: number
  holeMat: MeshBasicMaterial
  ringMat: MeshBasicMaterial
}) {
  return (
    <group position={[x, y, z]}>
      <mesh material={ringMat} renderOrder={2}>
        <circleGeometry args={[HOLE_R_OUTER, 28]} />
      </mesh>
      <mesh material={holeMat} position={[0, 0, 0.0008]} renderOrder={3}>
        <circleGeometry args={[HOLE_R_INNER, 24]} />
      </mesh>
    </group>
  )
}

function SingleSheetView({ spec }: { spec: SheetSpec }) {
  const outline = useMemo(() => sheetOutline(spec), [spec])
  const geo = useMemo(
    () => getCachedSheetGeometry(outline, spec),
    [outline, spec],
  )
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(COLOR_FULL),
        roughness: 0.8,
        metalness: 0.05,
        side: DoubleSide,
      }),
    [],
  )
  const holeMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(COLOR_HOLE),
        depthTest: true,
      }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color('#f0e6dc'),
        depthTest: true,
      }),
    [],
  )
  useEffect(
    () => () => {
      mat.dispose()
      holeMat.dispose()
      ringMat.dispose()
    },
    [mat, holeMat, ringMat],
  )

  const holeList = useMemo(() => holes(spec), [spec])
  const cx = (spec.width / 2) * MM
  const cy = (spec.length / 2) * MM

  return (
    <group position={[-cx, -cy, 0]}>
      <mesh geometry={geo} material={mat} />
      {holeList.map((h, i) => (
        <HoleMarker
          key={i}
          x={h.x * MM}
          y={h.y * MM}
          z={profileZ(h.x, spec) * MM + 0.003}
          holeMat={holeMat}
          ringMat={ringMat}
        />
      ))}
      {spec.crestX.map((x, i) => (
        <LabelSprite
          key={`c-${i}`}
          text={String(i + 1)}
          position={[
            x * MM,
            (spec.length + 35) * MM,
            profileZ(x, spec) * MM + 0.01,
          ]}
          height={0.07}
          color="#ffffff"
          bg="rgba(28,22,18,0.88)"
        />
      ))}
      <LabelSprite
        text={`${spec.width} mm`}
        position={[cx, -0.055, 0.025]}
        height={0.06}
      />
      <LabelSprite
        text={`${spec.length} mm`}
        position={[-0.07, cy, 0.025]}
        height={0.06}
      />
    </group>
  )
}

function OverlapDemo({ spec }: { spec: SheetSpec }) {
  const outline = useMemo(() => sheetOutline(spec), [spec])
  const geo = useMemo(
    () => getCachedSheetGeometry(outline, spec),
    [outline, spec],
  )
  const edgePts = useMemo(
    () => samplePieceOutline(outline, spec, 1.5),
    [outline, spec],
  )

  const mats = useMemo(
    () =>
      SHEET_TINTS.map(
        (c) =>
          new MeshStandardMaterial({
            color: new Color(c),
            roughness: 0.8,
            metalness: 0.05,
            side: DoubleSide,
          }),
      ),
    [],
  )
  const overlapMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color('#ffd400'),
        transparent: true,
        opacity: 0.45,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )
  useEffect(
    () => () => {
      for (const m of mats) m.dispose()
      overlapMat.dispose()
    },
    [mats, overlapMat],
  )

  const side = spec.sideOverlap
  const end = spec.endOverlap
  const pitchX = spec.width - side
  const pitchY = spec.length - end

  // BR=1, BL=2, TR=3, TL=4
  const sheets = [
    { ox: 0, oy: 0, order: 1 },
    { ox: -pitchX, oy: 0, order: 2 },
    { ox: 0, oy: pitchY, order: 3 },
    { ox: -pitchX, oy: pitchY, order: 4 },
  ]

  const centreX = (-pitchX + spec.width) / 2
  const centreY = (pitchY + spec.length) / 2

  // Full side-overlap band across both rows; full end-overlap across both cols
  const sideStripH = (spec.length + pitchY) * MM
  const sideStripY = ((spec.length + pitchY) / 2) * MM
  const sideStripX = (side / 2) * MM
  const endStripW = (spec.width + pitchX) * MM
  const endStripX = ((-pitchX + spec.width) / 2) * MM

  return (
    <group position={[-centreX * MM, -centreY * MM, 0]}>
      {sheets.map((s) => {
        const mat = mats[s.order - 1]!
        return (
          <group
            key={s.order}
            position={[s.ox * MM, s.oy * MM, s.order * 0.0005]}
          >
            <mesh geometry={geo} material={mat} />
            {edgePts.length > 1 && (
              <Line
                points={edgePts}
                color={COLOR_OUTLINE}
                lineWidth={1.5}
                depthTest
              />
            )}
            <LabelSprite
              text={String(s.order)}
              position={[
                (spec.width / 2) * MM,
                (spec.length / 2) * MM,
                0.04,
              ]}
              height={0.11}
              color="#ffffff"
              bg="rgba(28,22,18,0.9)"
            />
          </group>
        )
      })}

      {/* Side overlap strip (47 mm) — bright yellow on top */}
      <mesh
        position={[sideStripX, sideStripY, 0.045]}
        material={overlapMat}
        renderOrder={10}
      >
        <boxGeometry args={[side * MM, sideStripH, 0.001]} />
      </mesh>
      <LabelSprite
        text={`${side} mm`}
        position={[sideStripX, sideStripY, 0.07]}
        height={0.08}
        color="#1a1a1a"
        bg="rgba(255,212,0,0.92)"
      />

      {/* End overlap strip (125 mm) */}
      <mesh
        position={[endStripX, (pitchY + end / 2) * MM, 0.046]}
        material={overlapMat}
        renderOrder={10}
      >
        <boxGeometry args={[endStripW, end * MM, 0.001]} />
      </mesh>
      <LabelSprite
        text={`${end} mm`}
        position={[endStripX, (pitchY + end / 2) * MM, 0.07]}
        height={0.08}
        color="#1a1a1a"
        bg="rgba(255,212,0,0.92)"
      />
    </group>
  )
}

function InfoScene({ spec, showOverlap }: SheetInfo3DViewProps) {
  const side = spec.sideOverlap
  const end = spec.endOverlap
  const pitchX = spec.width - side
  const pitchY = spec.length - end

  const sizeM = useMemo(
    () =>
      showOverlap
        ? {
            w: (spec.width + pitchX) * MM,
            h: (spec.length + pitchY) * MM,
            d: 0.08,
          }
        : {
            w: spec.width * MM * 1.15,
            h: (spec.length + 80) * MM,
            d: 0.08,
          },
    [showOverlap, spec.width, spec.length, pitchX, pitchY],
  )

  const camDir = useMemo(() => {
    if (showOverlap) {
      // ~65° elevation: mostly top-down so overlap strips read clearly
      const elev = MathUtils.degToRad(OVERLAP_ELEVATION_DEG)
      return new Vector3(
        0.2 * Math.cos(elev),
        -Math.cos(elev),
        Math.sin(elev),
      ).normalize()
    }
    return new Vector3(0.25, -0.4, 0.88).normalize()
  }, [showOverlap])

  return (
    <>
      <color attach="background" args={[COLOR_BG]} />
      <hemisphereLight args={['#f5f7fa', '#8a7a68', 0.95]} />
      <directionalLight position={[1.5, -1, 3]} intensity={1.1} />
      <ambientLight intensity={0.4} />

      <FitCamera sizeM={sizeM} camDir={camDir} showOverlap={showOverlap} />

      {showOverlap ? (
        <OverlapDemo spec={spec} />
      ) : (
        <SingleSheetView spec={spec} />
      )}

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={0.7}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.2}
        maxDistance={20}
      />
    </>
  )
}

export function SheetInfo3D({ spec, showOverlap }: SheetInfo3DViewProps) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{
        fov: INFO_FOV,
        near: 0.05,
        far: 200,
        position: [0.4, -0.5, 1.2],
      }}
    >
      <InfoScene spec={spec} showOverlap={showOverlap} />
    </Canvas>
  )
}
