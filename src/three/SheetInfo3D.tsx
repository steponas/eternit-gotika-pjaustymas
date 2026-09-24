import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, DoubleSide, MeshStandardMaterial } from 'three'
import { holes, profileZ, sheetOutline } from '../geometry/sheet'
import type { SheetSpec } from '../geometry'
import { LabelSprite } from './LabelSprite'
import { COLOR_BG, COLOR_FULL, COLOR_HOLE } from './materials'
import { MM, getCachedSheetGeometry } from './sheetGeometry'

export interface SheetInfo3DViewProps {
  spec: SheetSpec
  showOverlap: boolean
}

function SingleSheetView({ spec }: { spec: SheetSpec }) {
  const outline = useMemo(() => sheetOutline(spec), [spec])
  const geo = useMemo(() => getCachedSheetGeometry(outline, spec), [outline, spec])
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
      new MeshStandardMaterial({
        color: new Color(COLOR_HOLE),
        roughness: 0.6,
      }),
    [],
  )
  useEffect(
    () => () => {
      mat.dispose()
      holeMat.dispose()
    },
    [mat, holeMat],
  )

  const holeList = useMemo(() => holes(spec), [spec])
  const cx = (spec.width / 2) * MM
  const cy = (spec.length / 2) * MM

  return (
    <group position={[-cx, -cy, 0]}>
      <mesh geometry={geo} material={mat} />
      {holeList.map((h, i) => (
        <mesh
          key={i}
          position={[h.x * MM, h.y * MM, profileZ(h.x, spec) * MM + 0.001]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={holeMat}
        >
          <circleGeometry args={[0.004, 16]} />
        </mesh>
      ))}
      {spec.crestX.map((x, i) => (
        <LabelSprite
          key={`c-${i}`}
          text={String(i + 1)}
          position={[
            x * MM,
            (spec.length * 0.5) * MM,
            profileZ(x, spec) * MM + 0.02,
          ]}
          height={0.055}
          color="#fff"
          bg="rgba(40,40,40,0.75)"
        />
      ))}
      <LabelSprite
        text={`${spec.width} mm`}
        position={[cx, -0.04, 0.02]}
        height={0.05}
      />
      <LabelSprite
        text={`${spec.length} mm`}
        position={[-0.05, cy, 0.02]}
        height={0.05}
      />
    </group>
  )
}

function OverlapDemo({ spec }: { spec: SheetSpec }) {
  const outline = useMemo(() => sheetOutline(spec), [spec])
  const geo = useMemo(() => getCachedSheetGeometry(outline, spec), [outline, spec])

  const matBase = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(COLOR_FULL),
        roughness: 0.8,
        metalness: 0.05,
        side: DoubleSide,
      }),
    [],
  )
  const overlapMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#5b9bd5'),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  )
  useEffect(
    () => () => {
      matBase.dispose()
      overlapMat.dispose()
    },
    [matBase, overlapMat],
  )

  // Layout 2x2: bottom-right first (order 1), bottom-left (2), top-right (3), top-left (4)
  const side = spec.sideOverlap
  const end = spec.endOverlap
  const pitchX = spec.width - side
  const pitchY = spec.length - end

  // Positions of bottom-left corners relative to bottom-right sheet at (0,0)
  // BR: (0, 0) order 1
  // BL: (-pitchX, 0) order 2
  // TR: (0, pitchY) order 3
  // TL: (-pitchX, pitchY) order 4
  const sheets = [
    { ox: 0, oy: 0, order: 1 },
    { ox: -pitchX, oy: 0, order: 2 },
    { ox: 0, oy: pitchY, order: 3 },
    { ox: -pitchX, oy: pitchY, order: 4 },
  ]

  const centreX = (-pitchX + spec.width) / 2
  const centreY = (pitchY + spec.length) / 2

  return (
    <group position={[-centreX * MM, -centreY * MM, 0]}>
      {sheets.map((s) => (
        <mesh
          key={s.order}
          geometry={geo}
          material={matBase}
          position={[s.ox * MM, s.oy * MM, s.order * 0.0004]}
        />
      ))}
      {/* Side overlap strip between BL and BR on bottom row */}
      <mesh
        position={[(-side / 2) * MM, (spec.length / 2) * MM, 0.003]}
        material={overlapMat}
      >
        <boxGeometry args={[side * MM, spec.length * MM, 0.002]} />
      </mesh>
      {/* End overlap strip between bottom and top on right column */}
      <mesh
        position={[
          (spec.width / 2) * MM,
          (pitchY + end / 2) * MM,
          0.003,
        ]}
        material={overlapMat}
      >
        <boxGeometry args={[spec.width * MM, end * MM, 0.002]} />
      </mesh>
      {/* Cross overlap at centre (side ∩ end) */}
      <mesh
        position={[(-side / 2) * MM, (pitchY + end / 2) * MM, 0.004]}
        material={overlapMat}
      >
        <boxGeometry args={[side * MM, end * MM, 0.002]} />
      </mesh>
    </group>
  )
}

function InfoScene({ spec, showOverlap }: SheetInfo3DViewProps) {
  return (
    <>
      <color attach="background" args={[COLOR_BG]} />
      <hemisphereLight args={['#f5f7fa', '#8a7a68', 0.9]} />
      <directionalLight position={[2, 3, 2]} intensity={1} />
      <ambientLight intensity={0.3} />
      <group rotation={[-0.55, 0.35, 0.08]}>
        {showOverlap ? (
          <OverlapDemo spec={spec} />
        ) : (
          <SingleSheetView spec={spec} />
        )}
      </group>
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.8}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.4}
        maxDistance={3}
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
      camera={{ fov: 40, near: 0.05, far: 50, position: [0.6, 0.5, 1.1] }}
    >
      <InfoScene spec={spec} showOverlap={showOverlap} />
    </Canvas>
  )
}
