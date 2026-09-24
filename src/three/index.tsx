import type { Layout, SheetMeasure, SheetSpec } from '../geometry'
import { RoofScene as RoofSceneImpl } from './RoofScene'
import { SheetInfo3D as SheetInfo3DImpl } from './SheetInfo3D'
import type { CameraMode } from './types'

export type { CameraMode } from './types'

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

export function RoofScene(props: RoofSceneProps) {
  return <RoofSceneImpl {...props} />
}

export function SheetInfo3D(props: SheetInfo3DProps) {
  return <SheetInfo3DImpl {...props} />
}
