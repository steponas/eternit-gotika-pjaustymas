import { Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react'
import {
  BufferGeometry,
  Float32BufferAttribute,
  TOUCH,
  Vector3,
  type Material,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { pitchY } from '../geometry/sheet'
import type { Layout, Polygon, SheetMeasure, SheetSpec } from '../geometry'
import { ROOF_GROUP_ROTATION, computeCameraTargets } from './camera'
import { COLOR_AREA_LINE, COLOR_BG, makeSharedMaterials } from './materials'
import { SheetMesh, type SheetVisualMode } from './SheetMesh'
import { MM } from './sheetGeometry'
import type { CameraMode } from './types'

export interface RoofSceneViewProps {
  layout: Layout
  spec: SheetSpec
  measures: Map<string, SheetMeasure>
  selectedId: string | null
  onSelect: (id: string | null) => void
  stepOrder: number | null
  cameraMode: CameraMode
  animateKey: number
}

function areaFillGeometry(
  area: Polygon,
  offset: { x: number; y: number },
  z: number,
): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  if (area.length < 3) return new BufferGeometry()
  for (const p of area) {
    positions.push((p.x - offset.x) * MM, (p.y - offset.y) * MM, z)
  }
  for (let i = 1; i < area.length - 1; i++) {
    indices.push(0, i, i + 1)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function Battens({
  layout,
  spec,
  offset,
  material,
}: {
  layout: Layout
  spec: SheetSpec
  offset: { x: number; y: number }
  material: Material
}) {
  const pY = pitchY(spec)
  const width = (layout.bounds.maxX - layout.bounds.minX) * MM
  const midX =
    ((layout.bounds.minX + layout.bounds.maxX) / 2 - offset.x) * MM
  const thickness = 0.012
  const depth = 0.03
  const ys: number[] = []
  for (let row = 0; row < layout.rows; row++) {
    ys.push(row * pY + 95)
  }
  if (layout.rows >= 1) {
    ys.push((layout.rows - 1) * pY + spec.length - 30)
  }
  const uniqueYs = [...new Set(ys.map((y) => Math.round(y * 10) / 10))]

  return (
    <group>
      {uniqueYs.map((yMm) => {
        const y = (yMm - offset.y) * MM
        return (
          <mesh
            key={yMm}
            position={[midX, y, -thickness * 0.5 - 0.002]}
            material={material}
          >
            <boxGeometry args={[width + 0.04, depth, thickness]} />
          </mesh>
        )
      })}
    </group>
  )
}

function CameraRig({
  layout,
  cameraMode,
}: {
  layout: Layout
  cameraMode: CameraMode
}) {
  const { camera, size, controls } = useThree()
  const orbit = controls as OrbitControlsImpl | null
  const targetPos = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const animating = useRef(false)
  const initialized = useRef(false)

  const aspect = size.width / Math.max(1, size.height)
  const boundsKey = `${layout.bounds.minX},${layout.bounds.maxX},${layout.bounds.height}`

  useEffect(() => {
    const t = computeCameraTargets(layout, cameraMode, aspect)
    targetPos.current.copy(t.position)
    targetLook.current.copy(t.target)
    if (!initialized.current) {
      camera.position.copy(t.position)
      camera.lookAt(t.target)
      if (orbit) {
        orbit.target.copy(t.target)
        orbit.update()
      }
      initialized.current = true
      animating.current = false
    } else {
      animating.current = true
    }
  }, [layout, cameraMode, aspect, camera, orbit, boundsKey])

  useFrame((_, dt) => {
    if (!animating.current) return
    const k = 1 - Math.exp(-5 * dt)
    camera.position.lerp(targetPos.current, k)
    if (orbit) {
      orbit.target.lerp(targetLook.current, k)
      orbit.update()
    } else {
      camera.lookAt(targetLook.current)
    }
    if (camera.position.distanceTo(targetPos.current) < 0.01) {
      camera.position.copy(targetPos.current)
      if (orbit) {
        orbit.target.copy(targetLook.current)
        orbit.update()
      }
      animating.current = false
    }
  })

  return null
}

function DropController({
  sheetCount,
  animateKey,
  progressRef,
}: {
  sheetCount: number
  animateKey: number
  progressRef: MutableRefObject<Float32Array>
}) {
  const startRef = useRef(0)

  useEffect(() => {
    startRef.current = performance.now()
    progressRef.current.fill(0)
  }, [animateKey, sheetCount, progressRef])

  useFrame(() => {
    const n = sheetCount
    if (n === 0) return
    const totalMs = Math.min(4000, 120 * n)
    const stagger = n > 1 ? totalMs / n : 0
    const sheetDur = Math.max(180, totalMs * 0.35)
    const elapsed = performance.now() - startRef.current
    for (let order = 1; order <= n; order++) {
      const start = (order - 1) * stagger
      const t = (elapsed - start) / sheetDur
      progressRef.current[order] = Math.max(0, Math.min(1, t))
    }
  })

  return null
}

function RoofContent(props: RoofSceneViewProps) {
  const {
    layout,
    spec,
    measures,
    selectedId,
    onSelect,
    stepOrder,
    cameraMode,
    animateKey,
  } = props

  const materials = useMemo(() => makeSharedMaterials(), [])
  useEffect(() => () => materials.dispose(), [materials])

  const originOffset = useMemo(
    () => ({
      x: (layout.bounds.minX + layout.bounds.maxX) / 2,
      y: layout.bounds.height / 2,
    }),
    [layout.bounds],
  )

  const fillGeo = useMemo(
    () => areaFillGeometry(layout.area, originOffset, -0.004),
    [layout.area, originOffset],
  )
  useEffect(() => () => fillGeo.dispose(), [fillGeo])

  const outlinePoints = useMemo(() => {
    const z = 0.055
    const pts: [number, number, number][] = layout.area.map((p) => [
      (p.x - originOffset.x) * MM,
      (p.y - originOffset.y) * MM,
      z,
    ])
    if (pts.length > 0) pts.push(pts[0]!)
    return pts
  }, [layout.area, originOffset])

  const maxOrder = layout.sheets.length
  const progressRef = useRef(new Float32Array(maxOrder + 2))

  useEffect(() => {
    progressRef.current = new Float32Array(maxOrder + 2)
  }, [maxOrder])

  const getDropProgress = useCallback(
    (order: number) => progressRef.current[order] ?? 1,
    [],
  )

  const sheetMode = useCallback(
    (sheet: (typeof layout.sheets)[number]): {
      mode: SheetVisualMode
      showCuts: boolean
    } => {
      if (stepOrder !== null) {
        if (sheet.order < stepOrder) return { mode: 'solid', showCuts: false }
        if (sheet.order === stepOrder) {
          return { mode: 'highlight', showCuts: sheet.kind === 'cut' }
        }
        return { mode: 'ghost', showCuts: false }
      }
      if (selectedId === sheet.id) {
        return { mode: 'highlight', showCuts: sheet.kind === 'cut' }
      }
      return { mode: 'solid', showCuts: false }
    },
    [stepOrder, selectedId],
  )

  return (
    <>
      <color attach="background" args={[COLOR_BG]} />
      <hemisphereLight args={['#f0f4f8', '#8a7a68', 0.85]} />
      <directionalLight position={[2.5, 4, 3]} intensity={0.95} />
      <ambientLight intensity={0.25} />

      <CameraRig layout={layout} cameraMode={cameraMode} />
      <DropController
        sheetCount={maxOrder}
        animateKey={animateKey}
        progressRef={progressRef}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI * 0.72}
        touches={{
          ONE: TOUCH.ROTATE,
          TWO: TOUCH.DOLLY_PAN,
        }}
      />

      <group rotation={ROOF_GROUP_ROTATION}>
        <mesh geometry={fillGeo} material={materials.areaFill} />
        <Line points={outlinePoints} color={COLOR_AREA_LINE} lineWidth={2} />
        <Battens
          layout={layout}
          spec={spec}
          offset={originOffset}
          material={materials.batten}
        />

        {layout.sheets.map((sheet) => {
          const { mode, showCuts } = sheetMode(sheet)
          return (
            <SheetMesh
              key={sheet.id}
              sheet={sheet}
              spec={spec}
              measure={measures.get(sheet.id)}
              materials={materials}
              mode={mode}
              showCuts={showCuts}
              getDropProgress={getDropProgress}
              onSelect={onSelect}
              originOffset={originOffset}
            />
          )
        })}
      </group>
    </>
  )
}

export function RoofScene(props: RoofSceneViewProps) {
  const { onSelect } = props
  const onMissed = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  return (
    <Canvas
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{ fov: 42, near: 0.05, far: 200, position: [0, 1, 3] }}
      onPointerMissed={onMissed}
    >
      <RoofContent {...props} />
    </Canvas>
  )
}
