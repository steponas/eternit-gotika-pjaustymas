import { useEffect, useMemo } from 'react'
import { createLabelTexture } from './labels'

interface LabelPlaneProps {
  text: string
  position: [number, number, number]
  height?: number
  color?: string
  bg?: string
  fontSize?: number
}

/** Billboard-ish label using a Sprite via drei... we use raw sprite through R3F. */
export function LabelSprite({
  text,
  position,
  height = 0.08,
  color = '#1a1a1a',
  bg = 'rgba(255,255,255,0.88)',
  fontSize = 48,
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
