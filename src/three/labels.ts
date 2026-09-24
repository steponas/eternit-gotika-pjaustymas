import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from 'three'

export interface LabelHandle {
  texture: CanvasTexture
  material: SpriteMaterial
  sprite: Sprite
  dispose: () => void
}

function makeLabelCanvas(
  text: string,
  opts?: { fontSize?: number; color?: string; bg?: string; pad?: number },
): HTMLCanvasElement {
  const fontSize = opts?.fontSize ?? 48
  const pad = opts?.pad ?? 12
  const color = opts?.color ?? '#1a1a1a'
  const bg = opts?.bg ?? 'rgba(255,255,255,0.85)'
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  const metrics = ctx.measureText(text)
  const w = Math.ceil(metrics.width + pad * 2)
  const h = Math.ceil(fontSize * 1.35 + pad * 2)
  canvas.width = Math.max(2, w)
  canvas.height = Math.max(2, h)
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  ctx.fillStyle = bg
  ctx.beginPath()
  const r = 8
  ctx.moveTo(r, 0)
  ctx.arcTo(w, 0, w, h, r)
  ctx.arcTo(w, h, 0, h, r)
  ctx.arcTo(0, h, 0, 0, r)
  ctx.arcTo(0, 0, w, 0, r)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)
  return canvas
}

export function createTextSprite(
  text: string,
  worldScale: number,
  opts?: { fontSize?: number; color?: string; bg?: string },
): LabelHandle {
  const canvas = makeLabelCanvas(text, opts)
  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new Sprite(material)
  const aspect = canvas.width / canvas.height
  sprite.scale.set(worldScale * aspect, worldScale, 1)
  return {
    texture,
    material,
    sprite,
    dispose: () => {
      texture.dispose()
      material.dispose()
    },
  }
}

/** React-friendly: build a CanvasTexture for use on a mesh/sprite. Caller must dispose. */
export function createLabelTexture(
  text: string,
  opts?: { fontSize?: number; color?: string; bg?: string },
): { texture: CanvasTexture; aspect: number; dispose: () => void } {
  const canvas = makeLabelCanvas(text, opts)
  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return {
    texture,
    aspect: canvas.width / canvas.height,
    dispose: () => texture.dispose(),
  }
}
