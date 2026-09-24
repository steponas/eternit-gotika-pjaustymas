import { Color, DoubleSide, MeshStandardMaterial } from 'three'

export const COLOR_FULL = '#9c3b2c'
export const COLOR_CUT = '#b8573f'
export const COLOR_GHOST = '#9c3b2c'
export const COLOR_HIGHLIGHT = '#e8c84a'
export const COLOR_CUT_LINE = '#c62828'
export const COLOR_OFFCUT = '#e53935'
export const COLOR_REPLACEMENT = '#ff9800'
export const COLOR_HOLE = '#2a2a2a'
export const COLOR_BATTEN = '#c4a574'
export const COLOR_AREA_FILL = '#90a4ae'
export const COLOR_AREA_LINE = '#212121'
export const COLOR_BG = '#d8e0e8'

export function makeSharedMaterials() {
  const full = new MeshStandardMaterial({
    color: new Color(COLOR_FULL),
    roughness: 0.82,
    metalness: 0.05,
    side: DoubleSide,
  })
  const cut = new MeshStandardMaterial({
    color: new Color(COLOR_CUT),
    roughness: 0.82,
    metalness: 0.05,
    side: DoubleSide,
  })
  const ghost = new MeshStandardMaterial({
    color: new Color(COLOR_GHOST),
    roughness: 0.85,
    metalness: 0.02,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: DoubleSide,
  })
  const highlight = new MeshStandardMaterial({
    color: new Color(COLOR_FULL),
    emissive: new Color(COLOR_HIGHLIGHT),
    emissiveIntensity: 0.35,
    roughness: 0.75,
    metalness: 0.05,
    side: DoubleSide,
  })
  const offcut = new MeshStandardMaterial({
    color: new Color(COLOR_OFFCUT),
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    roughness: 0.9,
    side: DoubleSide,
  })
  const batten = new MeshStandardMaterial({
    color: new Color(COLOR_BATTEN),
    roughness: 0.9,
    metalness: 0,
  })
  const areaFill = new MeshStandardMaterial({
    color: new Color(COLOR_AREA_FILL),
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: DoubleSide,
  })
  const hole = new MeshStandardMaterial({
    color: new Color(COLOR_HOLE),
    roughness: 0.6,
    metalness: 0.1,
  })
  const replacement = new MeshStandardMaterial({
    color: new Color(COLOR_REPLACEMENT),
    roughness: 0.55,
    metalness: 0.05,
    emissive: new Color(COLOR_REPLACEMENT),
    emissiveIntensity: 0.15,
  })

  const dispose = () => {
    full.dispose()
    cut.dispose()
    ghost.dispose()
    highlight.dispose()
    offcut.dispose()
    batten.dispose()
    areaFill.dispose()
    hole.dispose()
    replacement.dispose()
  }

  return {
    full,
    cut,
    ghost,
    highlight,
    offcut,
    batten,
    areaFill,
    hole,
    replacement,
    dispose,
  }
}

export type SharedMaterials = ReturnType<typeof makeSharedMaterials>
