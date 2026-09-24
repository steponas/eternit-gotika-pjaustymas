import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GOTIKA,
  computeLayout,
  countSheets,
  measureSheet,
  validateArea,
  type AnchorSide,
  type Layout,
  type LayoutInput,
  type ShapePreset,
  type SheetMeasure,
  type SheetSpec,
  type StartMode,
} from '../geometry'

const STORAGE_KEY = 'gotika-v1'
const CREST_PITCH = 174.6

export type ScreenId = 'roof' | 'sheet'
export type RoofTab = 'dimensions' | 'results' | 'cutting'
export type CameraMode = 'orbit' | 'top'

export interface AreaInputs {
  bottomWidth: number
  topWidth: number
  height: number
  shape: ShapePreset
  topOffset: number
  anchor: AnchorSide
  startMode: StartMode
  startCut: number
}

export interface SpecOverrides {
  holeWaves: [number, number]
  crestX0: number
  holeFromTop: number
  holeFromBottom: number
}

export const DEFAULT_INPUTS: AreaInputs = {
  bottomWidth: 6000,
  topWidth: 2000,
  height: 3500,
  shape: 'symmetric',
  topOffset: 0,
  anchor: 'right',
  startMode: 'full',
  startCut: 0,
}

export const DEFAULT_OVERRIDES: SpecOverrides = {
  holeWaves: [2, 5],
  crestX0: 111,
  holeFromTop: 30,
  holeFromBottom: 95,
}

function buildCrestX(crestX0: number): number[] {
  return [0, 1, 2, 3, 4].map((i) => crestX0 + i * CREST_PITCH)
}

export function mergeSpec(overrides: SpecOverrides): SheetSpec {
  return {
    ...GOTIKA,
    holeWaves: [...overrides.holeWaves],
    crestX: buildCrestX(overrides.crestX0),
    holeFromTop: overrides.holeFromTop,
    holeFromBottom: overrides.holeFromBottom,
  }
}

interface Persisted {
  inputs: AreaInputs
  overrides: SpecOverrides
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { inputs: DEFAULT_INPUTS, overrides: DEFAULT_OVERRIDES }
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      inputs: { ...DEFAULT_INPUTS, ...(parsed.inputs ?? {}) },
      overrides: {
        ...DEFAULT_OVERRIDES,
        ...(parsed.overrides ?? {}),
        holeWaves: normalizeHoleWaves(
          (parsed.overrides as SpecOverrides | undefined)?.holeWaves,
        ),
      },
    }
  } catch {
    return { inputs: DEFAULT_INPUTS, overrides: DEFAULT_OVERRIDES }
  }
}

function normalizeHoleWaves(
  w: number[] | undefined,
): [number, number] {
  if (!w || w.length < 2) return DEFAULT_OVERRIDES.holeWaves
  const a = Math.min(5, Math.max(1, Math.round(w[0] ?? 2)))
  const b = Math.min(5, Math.max(1, Math.round(w[1] ?? 5)))
  return [a, b]
}

export function useAppState() {
  const initial = useMemo(() => loadPersisted(), [])
  const [inputs, setInputs] = useState<AreaInputs>(initial.inputs)
  const [overrides, setOverrides] = useState<SpecOverrides>(initial.overrides)

  const [screen, setScreen] = useState<ScreenId>('roof')
  const [roofTab, setRoofTab] = useState<RoofTab>('dimensions')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stepOrder, setStepOrder] = useState<number | null>(null)
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [animateKey, setAnimateKey] = useState(0)
  const [showOverlap, setShowOverlap] = useState(false)
  const [onlyCut, setOnlyCut] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ inputs, overrides } satisfies Persisted),
      )
    } catch {
      // ignore quota / private mode
    }
  }, [inputs, overrides])

  const spec = useMemo(() => mergeSpec(overrides), [overrides])

  const validationErrors = useMemo(
    () =>
      validateArea({
        bottomWidth: inputs.bottomWidth,
        topWidth: inputs.topWidth,
        height: inputs.height,
        shape: inputs.shape,
        topOffset: inputs.topOffset,
      }),
    [inputs],
  )

  const layoutInput: LayoutInput = useMemo(
    () => ({
      area: {
        bottomWidth: inputs.bottomWidth,
        topWidth: inputs.topWidth,
        height: inputs.height,
        shape: inputs.shape,
        topOffset: inputs.topOffset,
      },
      anchor: inputs.anchor,
      startMode: inputs.startMode,
      startCut: inputs.startCut,
    }),
    [inputs],
  )

  const layout: Layout | null = useMemo(() => {
    if (validationErrors.length > 0) return null
    try {
      return computeLayout(layoutInput, spec)
    } catch {
      return null
    }
  }, [layoutInput, spec, validationErrors])

  const counts = useMemo(
    () => (layout ? countSheets(layout) : null),
    [layout],
  )

  const measures: Map<string, SheetMeasure> = useMemo(() => {
    const m = new Map<string, SheetMeasure>()
    if (!layout) return m
    for (const s of layout.sheets) {
      m.set(s.id, measureSheet(s, spec))
    }
    return m
  }, [layout, spec])

  const updateInputs = useCallback((patch: Partial<AreaInputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateOverrides = useCallback((patch: Partial<SpecOverrides>) => {
    setOverrides((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetOverrides = useCallback(() => {
    setOverrides(DEFAULT_OVERRIDES)
  }, [])

  const selectSheet = useCallback(
    (id: string | null, opts?: { goToCutting?: boolean }) => {
      setSelectedId(id)
      if (id && layout) {
        const sheet = layout.sheets.find((s) => s.id === id)
        if (sheet) setStepOrder(sheet.order)
      }
      if (opts?.goToCutting) {
        setScreen('roof')
        setRoofTab('cutting')
      }
    },
    [layout],
  )

  const enterCuttingTab = useCallback(() => {
    setRoofTab('cutting')
    if (!layout || layout.sheets.length === 0) {
      setStepOrder(null)
      return
    }
    if (selectedId) {
      const sheet = layout.sheets.find((s) => s.id === selectedId)
      setStepOrder(sheet?.order ?? 1)
    } else {
      setStepOrder(1)
      const first = layout.sheets.find((s) => s.order === 1)
      if (first) setSelectedId(first.id)
    }
  }, [layout, selectedId])

  const leaveCuttingTab = useCallback(() => {
    setStepOrder(null)
  }, [])

  const setRoofTabSafe = useCallback(
    (tab: RoofTab) => {
      if (tab === 'cutting') {
        enterCuttingTab()
      } else {
        if (roofTab === 'cutting') leaveCuttingTab()
        setRoofTab(tab)
      }
    },
    [enterCuttingTab, leaveCuttingTab, roofTab],
  )

  const bumpAnimate = useCallback(() => {
    setAnimateKey((k) => k + 1)
  }, [])

  const toggleCamera = useCallback(() => {
    setCameraMode((m) => (m === 'orbit' ? 'top' : 'orbit'))
  }, [])

  const setScreenSafe = useCallback(
    (next: ScreenId) => {
      if (next !== 'roof' && roofTab === 'cutting') {
        leaveCuttingTab()
      }
      setScreen(next)
      if (next === 'roof' && roofTab === 'cutting') {
        // re-enter so stepOrder is restored
        enterCuttingTab()
      }
    },
    [enterCuttingTab, leaveCuttingTab, roofTab],
  )

  return {
    inputs,
    updateInputs,
    overrides,
    updateOverrides,
    resetOverrides,
    spec,
    validationErrors,
    layout,
    counts,
    measures,
    screen,
    setScreen: setScreenSafe,
    roofTab,
    setRoofTab: setRoofTabSafe,
    selectedId,
    selectSheet,
    setSelectedId,
    stepOrder,
    setStepOrder,
    cameraMode,
    toggleCamera,
    animateKey,
    bumpAnimate,
    showOverlap,
    setShowOverlap,
    onlyCut,
    setOnlyCut,
  }
}

export type AppState = ReturnType<typeof useAppState>
