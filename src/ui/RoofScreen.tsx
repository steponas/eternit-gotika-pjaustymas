import { Suspense, lazy } from 'react'
import { lt } from '../i18n/lt'
import type { AppState, CameraMode } from '../state/useAppState'
import { CuttingTab } from './CuttingTab'
import { DimensionsTab } from './DimensionsTab'
import { ResultsTab } from './ResultsTab'
import { SceneFallback } from './SceneFallback'

const RoofScene = lazy(() =>
  import('../three').then((m) => ({ default: m.RoofScene })),
)

export function RoofScreen({ state }: { state: AppState }) {
  const {
    layout,
    spec,
    measures,
    selectedId,
    selectSheet,
    stepOrder,
    setStepOrder,
    cameraMode,
    setCameraMode,
    animateKey,
    bumpAnimate,
    roofTab,
    setRoofTab,
    inputs,
    updateInputs,
    validationErrors,
    counts,
    onlyCut,
    setOnlyCut,
  } = state

  const emptyLayout = layout ?? {
    area: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    rows: 0,
    cols: 0,
    sheets: [],
    topRowKeep: 0,
    startCutApplied: 0,
    bounds: { minX: 0, maxX: 1, height: 1 },
  }

  const setCam = (mode: CameraMode) => setCameraMode(mode)

  return (
    <div className={`roof-screen${roofTab === 'cutting' ? ' roof-screen--cutting' : ''}`}>
      <div
        className={`viewport viewport--roof${roofTab === 'cutting' ? ' viewport--roof-compact' : ''}`}
      >
        <Suspense fallback={<SceneFallback />}>
          <RoofScene
            layout={layout ?? emptyLayout}
            spec={spec}
            measures={measures}
            selectedId={selectedId}
            onSelect={(id) => {
              if (id) selectSheet(id)
              else state.setSelectedId(null)
            }}
            stepOrder={stepOrder}
            cameraMode={cameraMode}
            animateKey={animateKey}
          />
        </Suspense>
        <div className="viewport__overlays">
          <div className="cam-seg" role="group" aria-label="Kamera">
            <button
              type="button"
              className={`cam-seg__btn${cameraMode === 'orbit' ? ' is-active' : ''}`}
              onClick={() => setCam('orbit')}
              aria-pressed={cameraMode === 'orbit'}
            >
              {lt.camOrbit}
            </button>
            <button
              type="button"
              className={`cam-seg__btn${cameraMode === 'top' ? ' is-active' : ''}`}
              onClick={() => setCam('top')}
              aria-pressed={cameraMode === 'top'}
            >
              {lt.camTop}
            </button>
          </div>
          <button type="button" className="btn btn--overlay" onClick={bumpAnimate}>
            {lt.replayAnim}
          </button>
        </div>
      </div>

      <div className="side-panel">
        <div className="tabs" role="tablist">
          {(
            [
              ['dimensions', lt.tabDimensions],
              ['results', lt.tabResults],
              ['cutting', lt.tabCutting],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={roofTab === id}
              className={`tabs__btn${roofTab === id ? ' is-active' : ''}`}
              onClick={() => setRoofTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="side-panel__body">
          {roofTab === 'dimensions' ? (
            <DimensionsTab
              inputs={inputs}
              onChange={updateInputs}
              errors={validationErrors}
            />
          ) : null}
          {roofTab === 'results' ? (
            <ResultsTab
              layout={layout}
              counts={counts}
              selectedId={selectedId}
              onSelectSheet={(id) => selectSheet(id, { goToCutting: true })}
            />
          ) : null}
          {roofTab === 'cutting' ? (
            <CuttingTab
              layout={layout}
              measures={measures}
              spec={spec}
              selectedId={selectedId}
              stepOrder={stepOrder}
              onlyCut={onlyCut}
              onOnlyCut={setOnlyCut}
              onSelect={(id) => selectSheet(id)}
              onStepOrder={setStepOrder}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
