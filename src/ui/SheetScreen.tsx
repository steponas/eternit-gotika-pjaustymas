import { Suspense, lazy } from 'react'
import { holes, pitchX, pitchY, sheetOutline } from '../geometry'
import { lt } from '../i18n/lt'
import type { AppState } from '../state/useAppState'
import { NumberField } from './fields'
import { SceneFallback } from './SceneFallback'

const SheetInfo3D = lazy(() =>
  import('../three').then((m) => ({ default: m.SheetInfo3D })),
)

export function SheetScreen({ state }: { state: AppState }) {
  const {
    spec,
    showOverlap,
    setShowOverlap,
    overrides,
    updateOverrides,
    resetOverrides,
  } = state

  const outline = sheetOutline(spec)
  const holeList = holes(spec)
  const L = spec.length
  const W = spec.width
  const margin = 40
  const sy = (y: number) => L - y
  const pts = outline.map((p) => `${p.x},${sy(p.y)}`).join(' ')

  return (
    <div className="sheet-screen">
      <div className="viewport viewport--sheet">
        <Suspense fallback={<SceneFallback />}>
          <SheetInfo3D spec={spec} showOverlap={showOverlap} />
        </Suspense>
        <div className="viewport__overlays">
          <button
            type="button"
            className={`btn btn--overlay${showOverlap ? '' : ' is-active'}`}
            onClick={() => setShowOverlap(false)}
          >
            {lt.sheetModeSingle}
          </button>
          <button
            type="button"
            className={`btn btn--overlay${showOverlap ? ' is-active' : ''}`}
            onClick={() => setShowOverlap(true)}
          >
            {lt.sheetModeOverlap}
          </button>
        </div>
      </div>

      <div className="sheet-body">
        <h2 className="section-title">{lt.specTitle}</h2>
        <table className="spec-table">
          <tbody>
            <tr>
              <th>{lt.specDims}</th>
              <td>
                {spec.width} × {spec.length} mm
              </td>
            </tr>
            <tr>
              <th>{lt.specThickness}</th>
              <td>{spec.thickness} mm</td>
            </tr>
            <tr>
              <th>{lt.specWaves}</th>
              <td>5</td>
            </tr>
            <tr>
              <th>{lt.specWaveHeight}</th>
              <td>{spec.waveHeight} mm</td>
            </tr>
            <tr>
              <th>{lt.specSideOverlap}</th>
              <td>{spec.sideOverlap} mm</td>
            </tr>
            <tr>
              <th>{lt.specEndOverlap}</th>
              <td>{spec.endOverlap} mm</td>
            </tr>
            <tr>
              <th>{lt.specUsefulW}</th>
              <td>{pitchX(spec)} mm</td>
            </tr>
            <tr>
              <th>{lt.specUsefulL}</th>
              <td>{pitchY(spec)} mm</td>
            </tr>
            <tr>
              <th>{lt.specBatten}</th>
              <td>{pitchY(spec)} mm</td>
            </tr>
            <tr>
              <th>{lt.specCorners}</th>
              <td>{lt.specCornersValue}</td>
            </tr>
            <tr>
              <th>{lt.specHoles}</th>
              <td>{lt.specHolesValue}</td>
            </tr>
          </tbody>
        </table>

        <p className="note">{lt.sheetAbout}</p>

        <div className="sheet-2d">
          <svg
            viewBox={`${-margin} ${-margin} ${W + margin * 2} ${L + margin * 2}`}
            width="100%"
            aria-label="Lakšto schema"
          >
            <polygon
              points={pts}
              fill="#e8b4a4"
              stroke="#222"
              strokeWidth={2}
            />
            {spec.crestX.map((cx, i) => (
              <g key={i}>
                <line
                  x1={cx}
                  y1={0}
                  x2={cx}
                  y2={L}
                  stroke="#666"
                  strokeDasharray="8 6"
                  strokeWidth={1.5}
                />
                <text
                  x={cx}
                  y={-10}
                  textAnchor="middle"
                  fontSize={22}
                  fill="#333"
                >
                  {i + 1}
                </text>
              </g>
            ))}
            {holeList.map((h, i) => (
              <circle
                key={i}
                cx={h.x}
                cy={sy(h.y)}
                r={7}
                fill="#111"
              />
            ))}
          </svg>
        </div>

        <section className="settings">
          <h2 className="section-title">{lt.settings}</h2>
          <div className="settings__row">
            <label className="settings__select">
              <span>{lt.holeWave1}</span>
              <select
                value={overrides.holeWaves[0]}
                onChange={(e) =>
                  updateOverrides({
                    holeWaves: [
                      Number(e.target.value),
                      overrides.holeWaves[1],
                    ],
                  })
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__select">
              <span>{lt.holeWave2}</span>
              <select
                value={overrides.holeWaves[1]}
                onChange={(e) =>
                  updateOverrides({
                    holeWaves: [
                      overrides.holeWaves[0],
                      Number(e.target.value),
                    ],
                  })
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <NumberField
            id="crestX0"
            label={lt.crestX0}
            value={overrides.crestX0}
            onChange={(v) => updateOverrides({ crestX0: v })}
            step={0.1}
          />
          <NumberField
            id="holeFromTop"
            label={lt.holeFromTop}
            value={overrides.holeFromTop}
            onChange={(v) => updateOverrides({ holeFromTop: v })}
          />
          <NumberField
            id="holeFromBottom"
            label={lt.holeFromBottom}
            value={overrides.holeFromBottom}
            onChange={(v) => updateOverrides({ holeFromBottom: v })}
          />

          <button type="button" className="btn btn--secondary" onClick={resetOverrides}>
            {lt.resetDefaults}
          </button>
          <p className="note settings__hint">{lt.settingsHint}</p>
        </section>
      </div>
    </div>
  )
}
