'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, RAIN, type Tier } from '@/lib/world'

/**
 * §10 — the painted rain streak, at §10's own 8 × 64.
 *
 * White, with the whole shape in the **alpha** channel, so one image serves both layers
 * and the material's `color` and `opacity` do the rest. It is used through `map` and not
 * through `alphaMap`: three's `alphaMap` samples the **green** channel, which is 255
 * across every pixel of an image painted this way. §3.7 shipped that fault and §3.6 had
 * already avoided it; the note is here so the next painter does not have to rediscover it.
 *
 * Eight pixels across is not a compromise. A streak is a soft line with no detail in it —
 * the entire content of the image is one falloff across and one along — and §15 gets a
 * 2 KB texture for the whole of the rain.
 */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)
const smooth = (value: number) => value * value * (3 - 2 * value)

/**
 * Across the streak: a soft falloff to nothing at both edges.
 *
 * The exponent keeps a bright core rather than a linear ramp, so the streak reads as a
 * line at distance instead of as a grey smear — at 0.06 m wide it is two or three pixels
 * on screen and the core is most of what survives.
 */
const across = (u: number) => smooth(clamp01(1 - Math.abs(u * 2 - 1))) ** 0.8

/**
 * Along the streak, with `v = 0` at the leading end.
 *
 * Head-heavy and tapering behind, which is what a falling drop smeared over an exposure
 * actually looks like: bright where the drop is now, trailing off to where it was. A
 * symmetric profile reads as a floating dash.
 */
const along = (v: number) => {
  const head = smooth(clamp01(v / 0.12))
  const tail = clamp01(1 - v) ** 1.6
  return head * tail
}

function paint(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const image = ctx.createImageData(width, height)
  const data = image.data

  for (let y = 0; y < height; y++) {
    // A plane's V runs up the image and the streak leads downward, so row 0 — the top of
    // the image, V = 1 — is the trailing end and the last row is the head.
    const v = 1 - (y + 0.5) / height

    for (let x = 0; x < width; x++) {
      const alpha = across((x + 0.5) / width) * along(v)

      const i = (y * width + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(alpha * 255)
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

const cache = new Map<Tier, CanvasTexture>()

/** Painted once per tier, kept for the life of the page. */
export function rainStreakTexture(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const [width, height] = RAIN.streakTexture
  const texture = new CanvasTexture(paint(width, height))
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(tier, texture)
  return texture
}
