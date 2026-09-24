import type { Layout, SheetMeasure, SheetSpec } from '../geometry'

export type CameraMode = 'orbit' | 'top'

export interface RoofSceneProps {
  layout: Layout
  spec: SheetSpec
  measures: Map<string, SheetMeasure>
  /** Id of the selected sheet (PlacedSheet.id), or null. */
  selectedId: string | null
  onSelect: (id: string | null) => void
  /**
   * Step mode: sheets with order <= stepOrder are solid, later ones are faint ghosts,
   * the sheet with order === stepOrder is highlighted with its cut line and offcut ghost.
   * null = show everything solid (overview).
   */
  stepOrder: number | null
  cameraMode: CameraMode
  /** Bump to replay the drop-in animation. */
  animateKey: number
}

export interface SheetInfo3DProps {
  spec: SheetSpec
  /** Show a 2x2 group of sheets demonstrating side/end overlaps and corner cuts. */
  showOverlap: boolean
}

// Placeholder implementations; the 3D phase replaces these.
export function RoofScene(_props: RoofSceneProps) {
  return <div style={{ width: '100%', height: '100%', background: '#dde3ea' }} />
}

export function SheetInfo3D(_props: SheetInfo3DProps) {
  return <div style={{ width: '100%', height: '100%', background: '#dde3ea' }} />
}
