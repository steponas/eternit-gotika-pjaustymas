export type Vec2 = { x: number; y: number }
export type Polygon = Vec2[] // CCW order

export interface SheetSpec {
  width: number
  length: number
  sideOverlap: number
  endOverlap: number
  cornerCutW: number
  cornerCutH: number
  waveHeight: number
  thickness: number
  crestX: number[] // crest x positions from sheet left edge, length 5
  holeWaves: number[] // 1-based wave indices with holes, default [2,5]
  holeFromTop: number
  holeFromBottom: number
}

export type ShapePreset = 'symmetric' | 'leftVertical' | 'rightVertical' | 'custom'

export interface AreaInput {
  bottomWidth: number
  topWidth: number
  height: number
  shape: ShapePreset
  topOffset: number // only for custom: x of top-left corner relative to bottom-left
}

export type AnchorSide = 'left' | 'right'
export type StartMode = 'full' | 'cut' | 'balance'

export interface LayoutInput {
  area: AreaInput
  anchor: AnchorSide
  startMode: StartMode
  startCut: number // mm cut off the anchor-side column when startMode==='cut'
}

export type SheetKind = 'full' | 'cut'

export interface PlacedSheet {
  id: string // `r${row}c${col}`
  row: number // 0 = eave row
  col: number // column index counted from the LEFT of the grid (0 = leftmost)
  order: number // 1-based laying order: rows bottom→top, within a row right→left
  origin: Vec2 // roof coords of the sheet's bottom-left rectangle corner
  kind: SheetKind
  isTopRow: boolean
  piece: Polygon // kept part, SHEET-LOCAL coords (CCW)
  pieceArea: number // mm^2
}

export interface Layout {
  area: Polygon
  rows: number
  cols: number
  sheets: PlacedSheet[]
  topRowKeep: number
  startCutApplied: number
  bounds: { minX: number; maxX: number; height: number }
}
