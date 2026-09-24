import { describe, expect, it } from 'vitest'
import {
  GOTIKA,
  computeLayout,
  measureSheet,
  type PlacedSheet,
  type SheetMeasure,
} from '../geometry'
import { waveOrdinal } from '../i18n/lt'
import {
  generateInstructions,
  removedSideLabel,
} from './instructions'

describe('waveOrdinal', () => {
  it('uses correct Lithuanian genitive forms', () => {
    expect(waveOrdinal(1)).toBe('1-os')
    expect(waveOrdinal(2)).toBe('2-os')
    expect(waveOrdinal(3)).toBe('3-ios')
    expect(waveOrdinal(4)).toBe('4-os')
    expect(waveOrdinal(5)).toBe('5-os')
  })
})

describe('generateInstructions', () => {
  it('returns full-sheet message for full sheets', () => {
    const full: PlacedSheet = {
      id: 'r0c0',
      row: 0,
      col: 0,
      order: 1,
      origin: { x: 0, y: 0 },
      kind: 'full',
      isTopRow: true,
      piece: [
        { x: 50, y: 0 },
        { x: 920, y: 0 },
        { x: 920, y: 451 },
        { x: 870, y: 585 },
        { x: 0, y: 585 },
        { x: 0, y: 134 },
      ],
      pieceArea: 500000,
    }
    const m = measureSheet(full, GOTIKA)
    const steps = generateInstructions(m, full, GOTIKA)
    expect(steps).toEqual(['Pilnas lakštas — pjauti nereikia'])
  })

  it('mentions crest left/right and ordinals for cut sheets', () => {
    const layout = computeLayout(
      {
        area: {
          bottomWidth: 6000,
          topWidth: 2000,
          height: 3500,
          shape: 'symmetric',
          topOffset: 0,
        },
        anchor: 'right',
        startMode: 'full',
        startCut: 0,
      },
      GOTIKA,
    )
    const cut = layout.sheets.find((s) => s.kind === 'cut')
    expect(cut).toBeTruthy()
    const m = measureSheet(cut!, GOTIKA)
    const steps = generateInstructions(m, cut!, GOTIKA)
    expect(steps.length).toBeGreaterThan(2)
    const joined = steps.join('\n')
    expect(joined).toMatch(/pažymėkite/i)
    expect(joined).toMatch(/pjaukite/i)
    // ordinal forms appear somewhere when crest hints exist
    const hasOrdinal =
      /1-os|2-os|3-ios|4-os|5-os/.test(joined)
    expect(hasOrdinal).toBe(true)
  })

  it('uses kairiau for negative crest offset and dešiniau for positive', () => {
    const sheet: PlacedSheet = {
      id: 'r0c0',
      row: 0,
      col: 0,
      order: 1,
      origin: { x: 0, y: 0 },
      kind: 'cut',
      isTopRow: false,
      piece: [
        { x: 50, y: 0 },
        { x: 500, y: 0 },
        { x: 500, y: 585 },
        { x: 0, y: 585 },
        { x: 0, y: 134 },
      ],
      pieceArea: 200000,
    }

    const measure: SheetMeasure = {
      cuts: [
        {
          a: {
            p: { x: 591, y: 0 },
            edge: 'bottom',
            fromLeft: 591,
            fromRight: 329,
            recommended: 'fromRight',
            nearestCrest: { wave: 4, offset: -43 },
          },
          b: {
            p: { x: 174, y: 585 },
            edge: 'top',
            fromLeft: 174,
            fromRight: 746,
            recommended: 'fromLeft',
            nearestCrest: { wave: 1, offset: 63 },
          },
          length: 700,
        },
      ],
      holes: [],
      replacementHoles: [
        { x: 285.6, y: 95, wave: 2, pos: 'bottom' },
      ],
      nearestHoleToCut: { wave: 2, pos: 'bottom', dist: 40 },
      offcut: { area: 10000, bboxW: 200, bboxH: 300 },
    }

    const steps = generateInstructions(measure, sheet, GOTIKA)
    const joined = steps.join('\n')

    expect(joined).toContain(
      'Apatiniame krašte pažymėkite 329 mm nuo dešiniojo krašto (43 mm kairiau 4-os bangos keteros).',
    )
    expect(joined).toContain(
      'Viršutiniame krašte pažymėkite 174 mm nuo kairiojo krašto (63 mm dešiniau 1-os bangos keteros).',
    )
    expect(joined).toContain(
      'Išgręžkite naują skylę ant 2-os bangos keteros, 95 mm nuo apačios (Ø 8 mm).',
    )
    expect(joined).toContain(
      'Artimiausia skylė iki pjūvio: 2-os bangos, 40 mm.',
    )
    expect(joined).toContain('Atraiža: ~200 × 300 mm.')
  })

  it('says ties bangos ketera when |offset| < 3', () => {
    const sheet: PlacedSheet = {
      id: 'r0c0',
      row: 0,
      col: 0,
      order: 1,
      origin: { x: 0, y: 0 },
      kind: 'cut',
      isTopRow: true,
      piece: [
        { x: 50, y: 0 },
        { x: 920, y: 0 },
        { x: 920, y: 451 },
        { x: 870, y: 585 },
        { x: 0, y: 585 },
        { x: 0, y: 134 },
      ],
      pieceArea: 400000,
    }
    const measure: SheetMeasure = {
      cuts: [
        {
          a: {
            p: { x: 111, y: 0 },
            edge: 'bottom',
            fromLeft: 111,
            fromRight: 809,
            recommended: 'fromRight',
            nearestCrest: { wave: 1, offset: 0.5 },
          },
          b: {
            p: { x: 111, y: 300 },
            edge: 'inside',
            recommended: 'xy',
            nearestCrest: { wave: 1, offset: 0 },
          },
          length: 300,
        },
      ],
      holes: [
        {
          x: 285.6,
          y: 555,
          wave: 2,
          pos: 'top',
          lost: true,
          needed: false,
          distToCut: 10,
        },
      ],
      replacementHoles: [],
      nearestHoleToCut: null,
      offcut: null,
    }
    const steps = generateInstructions(measure, sheet, GOTIKA)
    const joined = steps.join('\n')
    expect(joined).toContain('ties 1-os bangos ketera')
    expect(joined).toContain('Viršutinių skylių nereikia (kraigas).')
  })

  it('describes left/right edge marks', () => {
    const sheet: PlacedSheet = {
      id: 'r0c0',
      row: 0,
      col: 0,
      order: 1,
      origin: { x: 0, y: 0 },
      kind: 'cut',
      isTopRow: false,
      piece: [
        { x: 50, y: 0 },
        { x: 920, y: 0 },
        { x: 920, y: 200 },
        { x: 0, y: 400 },
        { x: 0, y: 134 },
      ],
      pieceArea: 250000,
    }
    const measure: SheetMeasure = {
      cuts: [
        {
          a: {
            p: { x: 0, y: 400 },
            edge: 'left',
            fromTop: 185,
            fromBottom: 400,
            recommended: 'fromTop',
          },
          b: {
            p: { x: 920, y: 200 },
            edge: 'right',
            fromTop: 385,
            fromBottom: 200,
            recommended: 'fromBottom',
          },
          length: 940,
        },
      ],
      holes: [],
      replacementHoles: [],
      nearestHoleToCut: null,
      offcut: null,
    }
    const steps = generateInstructions(measure, sheet, GOTIKA)
    expect(steps.some((s) => s.includes('Kairiajame krašte pažymėkite 185 mm nuo viršaus'))).toBe(
      true,
    )
    expect(
      steps.some((s) => s.includes('Dešiniajame krašte pažymėkite 200 mm nuo apačios')),
    ).toBe(true)
  })
})

describe('removedSideLabel', () => {
  it('returns a non-empty Lithuanian side label', () => {
    const piece = [
      { x: 50, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 585 },
      { x: 0, y: 585 },
      { x: 0, y: 134 },
    ]
    const label = removedSideLabel(piece, GOTIKA)
    expect(label.length).toBeGreaterThan(0)
  })
})
