import {
  polygonArea,
  sheetOutline,
  type EdgePoint,
  type PlacedSheet,
  type SheetMeasure,
  type SheetSpec,
  type Vec2,
} from '../geometry'
import { lt, waveOrdinal } from '../i18n/lt'

const CORNER_TOL_MM = 3

function roundMm(n: number): number {
  return Math.round(n)
}

export type RectCorner = 'BL' | 'BR' | 'TL' | 'TR'

/** Rectangle-bounding corners of the sheet (not factory hex cuts). */
export function nearRectCorner(
  p: Vec2,
  spec: SheetSpec,
  tol = CORNER_TOL_MM,
): RectCorner | null {
  const W = spec.width
  const L = spec.length
  const corners: { id: RectCorner; x: number; y: number }[] = [
    { id: 'BL', x: 0, y: 0 },
    { id: 'BR', x: W, y: 0 },
    { id: 'TL', x: 0, y: L },
    { id: 'TR', x: W, y: L },
  ]
  let best: RectCorner | null = null
  let bestD = Infinity
  for (const c of corners) {
    const d = Math.hypot(p.x - c.x, p.y - c.y)
    if (d < bestD) {
      bestD = d
      best = c.id
    }
  }
  return bestD <= tol ? best : null
}

export function cornerNameLt(corner: RectCorner): string {
  switch (corner) {
    case 'BL':
      return 'apatiniame kairiajame kampe'
    case 'BR':
      return 'apatiniame dešiniajame kampe'
    case 'TL':
      return 'viršutiniame kairiajame kampe'
    case 'TR':
      return 'viršutiniame dešiniajame kampe'
  }
}

export function cornerInstruction(
  corner: RectCorner,
  role: 'start' | 'end',
): string {
  const name = cornerNameLt(corner)
  return role === 'start'
    ? `Pjūvis prasideda ${name}.`
    : `Pjūvis baigiasi ${name}.`
}

function crestHint(ep: EdgePoint): string {
  const nc = ep.nearestCrest
  if (!nc) return ''
  const ord = waveOrdinal(nc.wave)
  const abs = Math.abs(nc.offset)
  if (abs < 3) return `ties ${ord} bangos ketera`
  if (nc.offset < 0) return `${roundMm(abs)} mm kairiau ${ord} bangos keteros`
  return `${roundMm(abs)} mm dešiniau ${ord} bangos keteros`
}

function markOnEdge(ep: EdgePoint, spec: SheetSpec): string {
  const crest = crestHint(ep)
  const crestPart = crest ? ` (${crest})` : ''

  switch (ep.edge) {
    case 'bottom': {
      const fromRight = roundMm(ep.fromRight ?? spec.width - ep.p.x)
      const fromLeft = roundMm(ep.fromLeft ?? ep.p.x)
      if (ep.recommended === 'fromRight') {
        return `Apatiniame krašte pažymėkite ${fromRight} mm nuo dešiniojo krašto${crestPart}.`
      }
      return `Apatiniame krašte pažymėkite ${fromLeft} mm nuo kairiojo krašto${crestPart}.`
    }
    case 'top': {
      const fromLeft = roundMm(ep.fromLeft ?? ep.p.x)
      const fromRight = roundMm(ep.fromRight ?? spec.width - ep.p.x)
      if (ep.recommended === 'fromLeft') {
        return `Viršutiniame krašte pažymėkite ${fromLeft} mm nuo kairiojo krašto${crestPart}.`
      }
      return `Viršutiniame krašte pažymėkite ${fromRight} mm nuo dešiniojo krašto${crestPart}.`
    }
    case 'left': {
      const fromTop = roundMm(ep.fromTop ?? spec.length - ep.p.y)
      const fromBottom = roundMm(ep.fromBottom ?? ep.p.y)
      if (ep.recommended === 'fromTop') {
        return `Kairiajame krašte pažymėkite ${fromTop} mm nuo viršaus.`
      }
      return `Kairiajame krašte pažymėkite ${fromBottom} mm nuo apačios.`
    }
    case 'right': {
      const fromBottom = roundMm(ep.fromBottom ?? ep.p.y)
      const fromTop = roundMm(ep.fromTop ?? spec.length - ep.p.y)
      if (ep.recommended === 'fromBottom') {
        return `Dešiniajame krašte pažymėkite ${fromBottom} mm nuo apačios.`
      }
      return `Dešiniajame krašte pažymėkite ${fromTop} mm nuo viršaus.`
    }
    case 'cornerBL':
    case 'cornerTR':
    case 'inside':
    default: {
      const fromLeft = roundMm(ep.fromLeft ?? ep.p.x)
      const fromRight = roundMm(ep.fromRight ?? spec.width - ep.p.x)
      const fromBottom = roundMm(ep.fromBottom ?? ep.p.y)
      const nearerLeft = fromLeft <= fromRight
      const xLabel = nearerLeft
        ? `${fromLeft} mm nuo kairiojo krašto`
        : `${fromRight} mm nuo dešiniojo krašto`
      return `Pažymėkite tašką: ${xLabel}, ${fromBottom} mm nuo apačios.`
    }
  }
}

/** Describe a cut endpoint (corner shortcut or edge mark). */
export function describeEndpoint(
  ep: EdgePoint,
  spec: SheetSpec,
  role: 'start' | 'end',
): string {
  const corner = nearRectCorner(ep.p, spec)
  if (corner) return cornerInstruction(corner, role)
  return markOnEdge(ep, spec)
}

function centroid(poly: { x: number; y: number }[]): Vec2 {
  let sx = 0
  let sy = 0
  for (const p of poly) {
    sx += p.x
    sy += p.y
  }
  const n = Math.max(1, poly.length)
  return { x: sx / n, y: sy / n }
}

/** Which side(s) of the sheet are removed, in Lithuanian. */
export function removedSideLabel(
  piece: { x: number; y: number }[],
  spec: SheetSpec,
): string {
  const hex = sheetOutline(spec)
  const cPiece = centroid(piece)
  const cHex = centroid(hex)
  const dx = cPiece.x - cHex.x
  const dy = cPiece.y - cHex.y
  const parts: string[] = []
  const thrX = spec.width * 0.05
  const thrY = spec.length * 0.05
  if (Math.abs(dx) > thrX) {
    parts.push(dx < 0 ? lt.removedRight : lt.removedLeft)
  }
  if (Math.abs(dy) > thrY) {
    parts.push(dy < 0 ? lt.removedTop : lt.removedBottom)
  }
  if (parts.length === 0) {
    return lt.removedRight
  }
  if (parts.length === 2) {
    const vert = parts.find((p) => p === lt.removedTop || p === lt.removedBottom)
    const horiz = parts.find((p) => p === lt.removedLeft || p === lt.removedRight)
    if (vert && horiz) {
      const vAdj = vert === lt.removedTop ? 'viršutinė' : 'apatinė'
      return `${vAdj} ${horiz}`
    }
  }
  return parts.join(' ir ')
}

/**
 * Pure instruction generator for a sheet measure.
 * Returns numbered step texts (without leading numbers).
 */
export function generateInstructions(
  measure: SheetMeasure,
  sheet: PlacedSheet,
  spec: SheetSpec,
): string[] {
  if (sheet.kind === 'full') {
    return [lt.fullSheetNoCut]
  }

  const steps: string[] = []
  const multi = measure.cuts.length > 1

  measure.cuts.forEach((cut, i) => {
    if (multi) {
      steps.push(`${lt.cutLabel(i + 1)}.`)
    }
    steps.push(describeEndpoint(cut.a, spec, 'start'))
    steps.push(describeEndpoint(cut.b, spec, 'end'))
    const side = removedSideLabel(sheet.piece, spec)
    steps.push(
      `Sujunkite žymes tiesia linija ir pjaukite. Nupjaunama dalis: ${side}.`,
    )
  })

  for (const rh of measure.replacementHoles) {
    const ord = waveOrdinal(rh.wave)
    const along =
      rh.pos === 'bottom'
        ? `${roundMm(spec.holeFromBottom)} mm nuo apačios`
        : `${roundMm(spec.holeFromTop)} mm nuo viršaus`
    steps.push(
      `Išgręžkite naują skylę ant ${ord} bangos keteros, ${along} (Ø 8 mm).`,
    )
  }

  const lostTopUnneeded = measure.holes.filter(
    (h) => h.lost && !h.needed && h.pos === 'top' && sheet.isTopRow,
  )
  if (lostTopUnneeded.length > 0) {
    steps.push('Viršutinių skylių nereikia (kraigas).')
  }

  if (measure.nearestHoleToCut) {
    const n = measure.nearestHoleToCut
    const ord = waveOrdinal(n.wave)
    steps.push(
      `Artimiausia skylė iki pjūvio: ${ord} bangos, ${roundMm(n.dist)} mm.`,
    )
  }

  if (measure.offcut && measure.offcut.area > 0) {
    const w = roundMm(measure.offcut.bboxW)
    const h = roundMm(measure.offcut.bboxH)
    steps.push(`Atraiža: ~${w} × ${h} mm.`)
  }

  return steps
}

/** Trapezoid area in m² from area polygon (mm²). */
export function areaM2(poly: { x: number; y: number }[]): number {
  return polygonArea(poly) / 1e6
}
