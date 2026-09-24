import { useEffect, useMemo } from 'react'
import { createLabelTexture } from './labels'

interface LabelPlaneProps {
  text: string
  position: [number, number, number]
  /** World-space height of the sprite in metres (≈0.14 = 140 mm). */
  height?: number
  color?: string
  bg?: string
  fontSize?: number
}

/** Camera-facing label via Sprite + CanvasTexture (works offline). */
export function LabelSprite({
  text,
  position,
  height = 0.14,
  color = '#ffffff',
  bg = 'rgba(28,22,18,0.88)',
  fontSize = 64,
}: LabelPlaneProps) {
  const label = useMemo(
    () => createLabelTexture(text, { color, bg, fontSize }),
    [text, color, bg, fontSize],
  )

  useEffect(() => () => label.dispose(), [label])

  const aspect = label.aspect
  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial
        map={label.texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  )
}
