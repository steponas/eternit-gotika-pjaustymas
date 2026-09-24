import { Edges, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { Color } from 'three'
import { profileZ } from '../geometry/sheet'
import type { PlacedSheet, SheetMeasure, SheetSpec } from '../geometry'
import { LabelSprite } from './LabelSprite'
import type { SharedMaterials } from './materials'
import { COLOR_CUT_LINE, COLOR_HIGHLIGHT } from './materials'
import {
  MM,
  buildOffcutGeometries,
  cutOutwardNormal,
  getCachedSheetGeometry,
  sampleCutLine,
} from './sheetGeometry'

const ORDER_Z_MM = 0.4
const HOLE_R = 0.004
const DROP_FROM = 0.4

export type SheetVisualMode = 'solid' | 'ghost' | 'highlight'

interface SheetMeshProps {
  sheet: PlacedSheet
  spec: SheetSpec
  measure: SheetMeasure | undefined
  materials: SharedMaterials
  mode: SheetVisualMode
  showCuts: boolean
  /** 0..1 progress of drop-in (1 = settled). Driven by parent via getDropProgress. */
  getDropProgress: (order: number) => number
  onSelect: (id: string) => void
  /** Roof-group centering offset already applied by parent; origin is absolute roof mm. */
  originOffset: { x: number; y: number }
}

export function SheetMesh({
  sheet,
  spec,
  measure,
  materials,
  mode,
  showCuts,
  getDropProgress,
  onSelect,
  originOffset,
}: SheetMeshProps) {
  const groupRef = useRef<Group>(null)
  const offcutRef = useRef<Group>(null)

  const geometry = useMemo(
    () => getCachedSheetGeometry(sheet.piece, spec),
    [sheet.piece, spec],
  )

  const material =
    sheet.kind === 'cut' ? materials.cut : materials.full

  const ox = (sheet.origin.x - originOffset.x) * MM
  const oy = (sheet.origin.y - originOffset.y) * MM
  const baseZ = sheet.order * ORDER_Z_MM * MM

  // Centroid for label (sheet-local)
  const labelPos = useMemo((): [number, number, number] => {
    let cx = 0
    let cy = 0
    for (const p of sheet.piece) {
      cx += p.x
      cy += p.y
    }
    const n = sheet.piece.length || 1
    cx /= n
    cy /= n
    const z = profileZ(cx, spec) + 8
    return [cx * MM, cy * MM, z * MM]
  }, [sheet.piece, spec])

  const holes = measure?.holes ?? []
  const replacements = measure?.replacementHoles ?? []

  const cutLines = useMemo(() => {
    if (!showCuts || !measure || measure.cuts.length === 0) return []
    return measure.cuts.map((c) => sampleCutLine(c.a.p, c.b.p, spec, 40, 2))
  }, [showCuts, measure, spec])

  const offcutGeos = useMemo(() => {
    if (!showCuts || !measure || measure.cuts.length === 0) return []
    return buildOffcutGeometries(sheet.piece, measure.cuts, spec)
  }, [showCuts, measure, sheet.piece, spec])

  const offcutMat = useMemo(() => materials.offcut.clone(), [materials.offcut])
  useEffect(() => {
    return () => {
      for (const g of offcutGeos) g.dispose()
      offcutMat.dispose()
    }
  }, [offcutGeos, offcutMat])

  const offcutSlide = useMemo(() => {
    if (!measure || measure.cuts.length === 0) return { x: 0, y: 0 }
    const cut = measure.cuts[0]!
    const n = cutOutwardNormal(cut.a.p, cut.b.p, sheet.piece)
    return { x: n.x * 120 * MM, y: n.y * 120 * MM }
  }, [measure, sheet.piece])

  const highlightMat = useMemo(
    () => (mode === 'highlight' ? materials.highlight.clone() : null),
    [mode, materials.highlight],
  )
  useEffect(() => () => highlightMat?.dispose(), [highlightMat])

  const activeMaterial =
    mode === 'ghost'
      ? materials.ghost
      : mode === 'highlight' && highlightMat
        ? highlightMat
        : material

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    const p = getDropProgress(sheet.order)
    g.visible = p > 0.001
    // easeOutCubic
    const e = 1 - Math.pow(1 - p, 3)
    g.position.z = baseZ + (1 - e) * DROP_FROM

    if (highlightMat) {
      highlightMat.emissiveIntensity =
        0.25 + 0.2 * Math.sin(clock.elapsedTime * 3)
    }

    if (showCuts && offcutRef.current) {
      const t = (Math.sin(clock.elapsedTime * 1.2) + 1) / 2
      offcutRef.current.position.x = offcutSlide.x * (0.35 + 0.65 * t)
      offcutRef.current.position.y = offcutSlide.y * (0.35 + 0.65 * t)
      offcutMat.opacity = 0.25 + 0.12 * (1 - t)
    }
  })

  return (
    <group
      ref={groupRef}
      position={[ox, oy, baseZ + DROP_FROM]}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta > 6) return
        onSelect(sheet.id)
      }}
    >
      <mesh geometry={geometry} material={activeMaterial} castShadow={false}>
        {mode === 'highlight' && (
          <Edges threshold={15} color={new Color(COLOR_HIGHLIGHT)} />
        )}
      </mesh>

      {mode !== 'ghost' &&
        holes.map((h, i) => {
          if (h.lost) return null
          const z = profileZ(h.x, spec) * MM + 0.001
          return (
            <mesh
              key={`h-${i}`}
              position={[h.x * MM, h.y * MM, z]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={materials.hole}
            >
              <circleGeometry args={[HOLE_R, 16]} />
            </mesh>
          )
        })}

      {mode !== 'ghost' &&
        replacements.map((h, i) => {
          const z = profileZ(h.x, spec) * MM + 0.0015
          return (
            <mesh
              key={`r-${i}`}
              position={[h.x * MM, h.y * MM, z]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={materials.replacement}
            >
              <ringGeometry args={[HOLE_R * 0.55, HOLE_R * 1.35, 20]} />
            </mesh>
          )
        })}

      {mode !== 'ghost' && (
        <LabelSprite
          text={String(sheet.order)}
          position={labelPos}
          height={0.09}
          color="#1a1a1a"
          bg="rgba(255,255,255,0.9)"
        />
      )}

      {showCuts &&
        cutLines.map((pts, i) => (
          <Line
            key={`cut-${i}`}
            points={pts}
            color={COLOR_CUT_LINE}
            lineWidth={2.5}
            dashed
            dashSize={0.025}
            gapSize={0.015}
            depthTest
          />
        ))}

      {showCuts && offcutGeos.length > 0 && (
        <group ref={offcutRef}>
          {offcutGeos.map((geo, i) => (
            <mesh key={`off-${i}`} geometry={geo} material={offcutMat} />
          ))}
        </group>
      )}
    </group>
  )
}
