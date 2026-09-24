import { RoofScene } from '../three'
import { lt } from '../i18n/lt'
import type { AppState } from '../state/useAppState'
import { CuttingTab } from './CuttingTab'
import { DimensionsTab } from './DimensionsTab'
import { ResultsTab } from './ResultsTab'

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
    toggleCamera,
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

  return (
    <div className="roof-screen">
      <div className="viewport viewport--roof">
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
        <div className="viewport__overlays">
          <button type="button" className="btn btn--overlay" onClick={toggleCamera}>
            {cameraMode === 'orbit' ? lt.camOrbit : lt.camTop}
          </button>
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
