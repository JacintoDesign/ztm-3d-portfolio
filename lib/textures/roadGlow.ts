'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, TRAFFIC, type Tier } from '@/lib/world'

/**
 * §3.6 — the light the vehicles put on the road.
 *
 * Two painted falloffs, white with the shape carried entirely in the alpha channel, so
 * one image serves every colour: the material's own `color` tints it and §4's ratio
 * decides that per vehicle.
 *
 * **These are not lights.** §7 caps the world at ten dynamic lights and all ten are
 * spent inside the alley; six vehicles with headlights, tail lamps and underglow would
 * want eighteen more. They are quads lying on the road — the same answer §3.3 gives for
 * a hundred and fifty windows and §7 gives for every contact shadow in the world.
 *
 * **Alpha, never additive.** Additive is the obvious blend for a glow and it breaks
 * under `FogExp2`: three mixes the fragment toward `fogColor` before the blend, so at
 * thirty metres an additive quad adds most of `#0A0F1A` across its whole rectangle and
 * the glow arrives inside a visible dark-blue box. Alpha blending fogs the colour and
 * leaves the alpha alone, so the quad has no edges.
 */

export type GlowKind = 'pool' | 'beam'

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)
const smooth = (value: number) => value * value * (3 - 2 * value)

/**
 * The symmetric ellipse: underglow, and the tail smear at a different scale.
 *
 * Painted round and stretched by the mesh rather than painted at each aspect ratio —
 * a falloff has no detail that an anisotropic scale can spoil, and it halves the number
 * of canvases §15's budget has to carry.
 */
function poolAlpha(u: number, v: number): number {
  const radius = Math.sqrt(u * u + v * v)
  return smooth(clamp01(1 - radius)) ** 1.35
}

/**
 * The headlight beam. `u` runs 0 at the nose to 1 at the far end of the pool, `v` is
 * lateral.
 *
 * Two lobes a fixed distance apart, each widening as it travels: that is what two lamps
 * a metre apart actually put on a road — distinct patches close to the car, one wash by
 * the time they reach the far side. A single cone reads as a spotlight.
 */
function beamAlpha(u: number, v: number): number {
  const separation = 0.3
  const lobeWidth = 0.18 + 0.75 * u

  /* Rises over the first fraction of a metre — a lamp does not start at the bumper —
     then falls away with distance. The exponent is what decides how far the throw
     carries: at 1.3 the pool was spent within two metres of the bumper and read as a
     puddle under the nose rather than as a beam. */
  const along = Math.min(1, u / 0.14) * (1 - u) ** 0.85

  const lobe = (centre: number) => smooth(clamp01(1 - Math.abs(v - centre) / lobeWidth))
  const lobes = Math.max(lobe(-separation), lobe(separation)) ** 1.4

  // A faint wash between and around the lobes, so the pair reads as light rather than
  // as two painted stripes.
  const wash = 0.14 * smooth(clamp01(1 - Math.abs(v) / (0.35 + 0.65 * u)))

  return clamp01(along * (lobes + wash))
}

function paint(kind: GlowKind, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const image = ctx.createImageData(size, size)
  const data = image.data

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // A plane's V runs up the image, and the mesh is laid flat with its far edge at
      // V = 1, so row 0 is the end of the beam and the last row is the nose.
      const v = ((x + 0.5) / size) * 2 - 1
      const alpha =
        kind === 'pool'
          ? poolAlpha(v, ((y + 0.5) / size) * 2 - 1)
          : beamAlpha(1 - (y + 0.5) / size, v)

      const i = (y * size + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(alpha * 255)
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

const cache = new Map<string, CanvasTexture>()

/** Painted once per kind and tier, kept for the life of the page. */
export function roadGlowTexture(kind: GlowKind, tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const key = `${kind}|${tier}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(paint(kind, TRAFFIC.glow.canvas[tier]))
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(key, texture)
  return texture
}
