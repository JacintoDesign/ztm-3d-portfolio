'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, PROPS, type Tier } from '@/lib/world'

/**
 * §3.7 — the paper of a 提灯, painted once and shared by all eleven lanterns.
 *
 * **A bare cylinder is not a paper lantern.** The silhouette was already right; what was
 * missing is the thing that actually identifies one at four metres — the **horizontal ribs**
 * banding the shade, brighter paper stretched between them and a darker line at each rib
 * where the frame blocks the light from inside.
 *
 * **Used as `emissiveMap` and not as `map`.** §3.4's rule holds here: the diffuse stays
 * `void` and the accent lives in the emissive term, so a `map` would modulate a near-black
 * surface and change nothing visible. `emissiveMap` multiplies `emissive × emissiveIntensity`
 * per texel, which is exactly "this part of the paper is letting less light through".
 * Greyscale for the same reason — the colour is `lantern`, and the map only says how much.
 *
 * **One canvas for eleven.** §15 lists lanterns among the instanced meshes, and instancing
 * carries one material, so the texture cannot vary per lantern. That is a constraint, not a
 * compromise: eleven identical mass-produced paper shades is what an alley actually has.
 */

/** Ribs run around the shade, so the map repeats in U and clamps in V. */
const RIBS = 9

/** Canvas is small on purpose: it is 9 horizontal bands and a seam, with no detail in U. */
const SIZE = { desktop: 256, mobile: 128 } as const

function paint(tier: Tier): HTMLCanvasElement {
  const size = SIZE[tier]
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* The paper itself. Not pure white: a lantern's shade is already carrying most of the
     emissive intensity from §8.1's rung, and a map that peaks at 1.0 everywhere would put
     the rung's full value on every texel and lose the ribs to the top of the range. */
  ctx.fillStyle = '#d8d2c8'
  ctx.fillRect(0, 0, size, size)

  /* Vertical falloff — brightest at the shade's waist, dimmer at top and bottom. The light
     source is inside and the paper gathers toward the fittings at both ends, so a lantern is
     never evenly lit along its height. */
  const waist = ctx.createLinearGradient(0, 0, 0, size)
  waist.addColorStop(0.0, 'rgba(0,0,0,0.55)')
  waist.addColorStop(0.28, 'rgba(0,0,0,0.06)')
  waist.addColorStop(0.5, 'rgba(0,0,0,0)')
  waist.addColorStop(0.72, 'rgba(0,0,0,0.06)')
  waist.addColorStop(1.0, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = waist
  ctx.fillRect(0, 0, size, size)

  /* The ribs. Each is a soft dark band rather than a hard line: the frame is behind paper,
     so what you see is a shadow through it, and a 1 px line would alias into a dotted ring
     the moment the lantern is more than a few metres away. */
  const pitch = size / RIBS
  const ribHalf = Math.max(1, size / 128)
  for (let i = 0; i <= RIBS; i++) {
    const y = i * pitch
    const band = ctx.createLinearGradient(0, y - ribHalf * 2, 0, y + ribHalf * 2)
    band.addColorStop(0, 'rgba(0,0,0,0)')
    band.addColorStop(0.5, 'rgba(0,0,0,0.62)')
    band.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = band
    ctx.fillRect(0, y - ribHalf * 2, size, ribHalf * 4)
  }

  /* The vertical seam where the paper is glued. One per shade, and it is what stops eleven
     identical lanterns from looking like eleven copies of a procedural texture. */
  const seam = ctx.createLinearGradient(size * 0.12, 0, size * 0.16, 0)
  seam.addColorStop(0, 'rgba(0,0,0,0)')
  seam.addColorStop(0.5, 'rgba(0,0,0,0.30)')
  seam.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = seam
  ctx.fillRect(size * 0.12, 0, size * 0.05, size)

  return canvas
}

const cache = new Map<Tier, CanvasTexture>()

/** §3.7 — painted on first call and cached for the lifetime of the page. Never per frame. */
export function lanternPaper(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(paint(tier))
  texture.colorSpace = SRGBColorSpace
  /* U wraps because the ribs run around the shade and the cylinder's seam meets itself;
     V clamps because the shade has a top and a bottom and must not tile into them. */
  texture.wrapS = RepeatWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(tier, texture)
  return texture
}

/** §3.7 — the shade's proportions, so the ribs read at the same pitch on any lantern size. */
export const LANTERN_RIB_COUNT = RIBS
export const LANTERN_SHADE = PROPS.paperLantern.shade
