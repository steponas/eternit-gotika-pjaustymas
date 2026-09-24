/** Lithuanian UI strings and helpers. */

export const lt = {
  appTitle: 'Gotika pjovimas',
  screenRoof: 'Stogas',
  screenSheet: 'Lakštas',

  camOrbit: '3D',
  camTop: 'Iš viršaus',
  replayAnim: '↻ Rodyti dengimą',

  tabDimensions: 'Matmenys',
  tabResults: 'Rezultatas',
  tabCutting: 'Pjovimas',

  bottomWidth: 'Apatinis plotis (prie karnizo)',
  topWidth: 'Viršutinis plotis',
  height: 'Aukštis (išilgai šlaito)',
  unitMm: 'mm',

  shapeLabel: 'Forma',
  shapeSymmetric: 'Simetriška',
  shapeLeftVertical: 'Kairė pusė tiesi',
  shapeRightVertical: 'Dešinė pusė tiesi',
  shapeCustom: 'Pasirinktinis poslinkis',
  topOffset: 'Viršaus poslinkis nuo kairės',

  anchorLabel: 'Lygiuoti lakštus pagal',
  anchorLeft: 'Kairįjį kraštą',
  anchorRight: 'Dešinįjį kraštą',

  startLabel: 'Pirmas stulpelis',
  startFull: 'Pilnas lakštas',
  startCut: 'Nukirstas',
  startBalance: 'Subalansuotas',
  startCutAmount: 'Kiek nukirsti',

  layingNote:
    'Lakštai dengiami iš dešinės į kairę ir iš apačios į viršų.',

  countFull: 'Pilnų lakštų',
  countCut: 'Pjaustomų lakštų',
  countTotal: 'Iš viso lakštų',
  countGrid: 'Eilių × stulpelių',
  countScrews: 'Sraigtų (apytiksliai)',
  areaM2: 'Plotas',
  topRowKeep: 'Paskutinės eilės lakšto ilgis',
  topRowCutNote: 'nukirstas',
  resultsReuseNote:
    'Kiekviena nupjauta dalis skaičiuojama kaip atskiras lakštas; atraižas galima panaudoti pakartotinai.',
  rowNearEave: (n: number) => `Eilė ${n} (prie karnizo)`,
  rowN: (n: number) => `Eilė ${n}`,

  prev: 'Ankstesnis',
  next: 'Kitas',
  onlyCut: 'Tik pjaustomi',
  sheetOf: (n: number, m: number) => `Lakštas ${n} iš ${m}`,
  sheetPosition: (row: number, colFromRight: number) =>
    `Eilė ${row} (nuo karnizo), stulpelis ${colFromRight} nuo dešinės`,

  fullSheetNoCut: 'Pilnas lakštas — pjauti nereikia',
  cutLabel: (n: number) => `Pjūvis ${n}`,
  drillLabel: 'gręžti',
  legendKept: 'Paliekama dalis',
  legendRemoved: 'Nupjaunama',
  legendHole: 'Esama skylė',
  legendLost: 'Prarasta skylė',
  legendNewHole: 'Nauja skylė',
  tipMeasure:
    'Matuokite tiesia rulete, uždėta ant bangų keterų (ne pagal bangų paviršių). Žymes darykite lakšto viršutinėje (dažytoje) pusėje.',

  sheetModeSingle: 'Vienas lakštas',
  sheetModeOverlap: 'Persidengimas (4 lakštai)',
  settings: 'Nustatymai',
  resetDefaults: 'Atkurti numatytuosius',
  settingsHint:
    'Pasitikrinkite su tikru lakštu — gamintojo instrukcijose nenurodyta, nuo kurio krašto skaičiuojamos bangos.',
  holeWave1: '1-os bangos skylė',
  holeWave2: '2-os bangos skylė',
  crestX0: 'Pirmos keteros poslinkis',
  holeFromTop: 'Skylių atstumas nuo viršaus',
  holeFromBottom: 'Skylių atstumas nuo apačios',

  specTitle: 'Techniniai duomenys',
  specDims: 'Matmenys',
  specThickness: 'Storis',
  specWaves: 'Bangų skaičius',
  specWaveHeight: 'Bangos aukštis',
  specSideOverlap: 'Šoninis užleidimas',
  specEndOverlap: 'Išilginis užleidimas',
  specUsefulW: 'Naudingas plotis',
  specUsefulL: 'Naudingas ilgis',
  specBatten: 'Atstumas tarp grebėstų',
  specCorners: 'Nukirsti kampai',
  specCornersValue:
    'apatinis kairys ir viršutinis dešinys, ~50 × 134 mm',
  specHoles: 'Skylės',
  specHolesValue:
    '2-os ir 5-os bangos keterose, 30 mm nuo viršaus ir 95 mm nuo apačios',
  sheetAbout:
    'Lakštai klojami iš dešinės į kairę ir iš apačios į viršų. Gamykliniai kampų nukirtimai — apatiniame kairiajame ir viršutiniame dešiniajame kampuose.',

  noSheets: 'Nėra lakštų — patikrinkite matmenis.',
  removedLeft: 'kairė',
  removedRight: 'dešinė',
  removedTop: 'viršus',
  removedBottom: 'apačia',
} as const

export type Lt = typeof lt

/** Lithuanian genitive feminine ordinal for wave 1–5: 1-os, 2-os, 3-ios, 4-os, 5-os */
export function waveOrdinal(wave: number): string {
  switch (wave) {
    case 1:
      return '1-os'
    case 2:
      return '2-os'
    case 3:
      return '3-ios'
    case 4:
      return '4-os'
    case 5:
      return '5-os'
    default:
      return `${wave}-os`
  }
}
