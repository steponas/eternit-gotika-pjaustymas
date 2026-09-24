import { buildArea } from '../geometry'
import { lt } from '../i18n/lt'
import type { AreaInputs } from '../state/useAppState'
import { NumberField, Segmented } from './fields'

export interface DimensionsTabProps {
  inputs: AreaInputs
  onChange: (patch: Partial<AreaInputs>) => void
  errors: string[]
}

export function DimensionsTab({ inputs, onChange, errors }: DimensionsTabProps) {
  const area = buildArea({
    bottomWidth: Math.max(1, inputs.bottomWidth),
    topWidth: Math.max(1, inputs.topWidth),
    height: Math.max(1, inputs.height),
    shape: inputs.shape,
    topOffset: inputs.topOffset,
  })

  const xs = area.map((p) => p.x)
  const ys = area.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = 40
  const bw = maxX - minX || 1
  const bh = maxY - minY || 1
  const vbW = bw + pad * 2
  const vbH = bh + pad * 2
  // Flip Y for preview
  const pts = area
    .map((p) => `${p.x - minX + pad},${maxY - p.y + pad}`)
    .join(' ')

  return (
    <div className="tab-panel">
      <NumberField
        id="bottomWidth"
        label={lt.bottomWidth}
        value={inputs.bottomWidth}
        onChange={(v) => onChange({ bottomWidth: v })}
        error={errors.find((e) => e.toLowerCase().includes('plotis') && !e.toLowerCase().includes('viršutinis'))}
      />
      <NumberField
        id="topWidth"
        label={lt.topWidth}
        value={inputs.topWidth}
        onChange={(v) => onChange({ topWidth: v })}
        error={errors.find((e) => e.toLowerCase().includes('viršutinis'))}
      />
      <NumberField
        id="height"
        label={lt.height}
        value={inputs.height}
        onChange={(v) => onChange({ height: v })}
        error={errors.find((e) => e.toLowerCase().includes('aukštis'))}
      />

      <Segmented
        name="shape"
        label={lt.shapeLabel}
        value={inputs.shape}
        onChange={(shape) => onChange({ shape })}
        options={[
          { value: 'symmetric', label: lt.shapeSymmetric },
          { value: 'leftVertical', label: lt.shapeLeftVertical },
          { value: 'rightVertical', label: lt.shapeRightVertical },
          { value: 'custom', label: lt.shapeCustom },
        ]}
      />

      {inputs.shape === 'custom' ? (
        <NumberField
          id="topOffset"
          label={lt.topOffset}
          value={inputs.topOffset}
          onChange={(v) => onChange({ topOffset: v })}
          min={-1e7}
        />
      ) : null}

      <Segmented
        name="anchor"
        label={lt.anchorLabel}
        value={inputs.anchor}
        onChange={(anchor) => onChange({ anchor })}
        options={[
          { value: 'left', label: lt.anchorLeft },
          { value: 'right', label: lt.anchorRight },
        ]}
      />

      <Segmented
        name="startMode"
        label={lt.startLabel}
        value={inputs.startMode}
        onChange={(startMode) => onChange({ startMode })}
        options={[
          { value: 'full', label: lt.startFull },
          { value: 'cut', label: lt.startCut },
          { value: 'balance', label: lt.startBalance },
        ]}
      />

      {inputs.startMode === 'cut' ? (
        <NumberField
          id="startCut"
          label={lt.startCutAmount}
          value={inputs.startCut}
          onChange={(v) => onChange({ startCut: v })}
        />
      ) : null}

      <div className="area-preview">
        <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" aria-hidden>
          <polygon
            points={pts}
            fill="#f3d5cc"
            stroke="#b0452f"
            strokeWidth={3}
          />
          <text
            x={pad + bw / 2}
            y={pad + bh + 28}
            textAnchor="middle"
            fontSize={22}
            fill="#222"
          >
            {Math.round(inputs.bottomWidth)} mm
          </text>
          <text
            x={pad + bw / 2}
            y={pad - 10}
            textAnchor="middle"
            fontSize={20}
            fill="#222"
          >
            {Math.round(inputs.topWidth)} mm
          </text>
          <text
            x={pad - 8}
            y={pad + bh / 2}
            textAnchor="middle"
            fontSize={20}
            fill="#222"
            transform={`rotate(-90 ${pad - 8} ${pad + bh / 2})`}
          >
            {Math.round(inputs.height)} mm
          </text>
        </svg>
      </div>

      {errors.length > 0 ? (
        <ul className="error-list">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <p className="note">{lt.layingNote}</p>
    </div>
  )
}
