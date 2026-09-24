export type {
  Vec2,
  Polygon,
  SheetSpec,
  ShapePreset,
  AreaInput,
  AnchorSide,
  StartMode,
  LayoutInput,
  SheetKind,
  PlacedSheet,
  Layout,
} from './types'

export {
  GOTIKA,
  pitchX,
  pitchY,
  sheetOutline,
  holes,
  profileZ,
} from './sheet'

export {
  polygonArea,
  polygonAreaSigned,
  ensureCCW,
  translate,
  clipConvex,
  pointInConvex,
  distPointSegment,
  rectPolygon,
} from './polygon'

export { buildArea, validateArea } from './area'

export { computeLayout, countSheets } from './layout'

export type {
  EdgeName,
  EdgePoint,
  CutSegment,
  HoleInfo,
  SheetMeasure,
} from './measure'
export { measureSheet } from './measure'
