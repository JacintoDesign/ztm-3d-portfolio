'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, PALETTE, type ColorToken, type Tier } from '@/lib/world'

/**
 * §11 / §3.5 — the painted face of a neon sign, and the cloth of a banner.
 *
 * All text in the 3D world is a canvas texture. No `Text3D`, no troika, no font file
 * shipped: a painted canvas is crisper at distance and costs one texture instead of
 * glyph geometry plus a webfont.
 *
 * The image is used as both `map` and `emissiveMap`, the same as §3.3's window bays —
 * one image cannot disagree with itself about which pixels are lit.
 *
 * Strings come only from §11.4's fixed list, and the caller passes them by index.
 */

export type Orientation = 'vertical' | 'horizontal'

/**
 * How much of its own colour the ground behind the glyphs keeps.
 *
 * A tube sign is 0: the panel is dark and only the strokes are lit, which is what a
 * neon sign is. A banner is not — there is no light anywhere near y = 6.90, so cloth
 * lit by the scene is cloth nobody can see, and the first build left three strings
 * hanging in mid-air with no banner under them. A backlit banner is a real object and
 * this is the honest way to build one: its ground carries a sixteenth of its colour
 * through the same emissive map that lights the text.
 */
const GROUND_TINT = { sign: 0, banner: 0.16 } as const
export type SignKind = keyof typeof GROUND_TINT

function dim(hex: string, multiply: number): string {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 255) * multiply)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

function paint(
  text: string,
  color: string,
  orientation: Orientation,
  width: number,
  height: number,
  kind: SignKind,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const tint = GROUND_TINT[kind]
  ctx.fillStyle = tint === 0 ? PALETTE.void : dim(color, tint)
  ctx.fillRect(0, 0, width, height)

  const characters = [...text]
  /* Cell size along the run of the text. The cross-axis is the panel's short side, and
     the glyph is fitted to whichever is smaller — a 6-character vertical sign must not
     paint characters wider than the 0.44 m panel they sit on. */
  const along = orientation === 'vertical' ? height : width
  const across = orientation === 'vertical' ? width : height
  const cell = along / characters.length
  const size = Math.min(cell, across) * 0.78

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${size}px ${CANVAS_PAINTER.japaneseFace}`

  /* The tube, in two passes: a wide soft stroke for the bloom the glass throws, then the
     bright core on top. One flat fill reads as a sticker of a word rather than as a lit
     tube, which is the same failure the flush-vs-projecting rule in §3.5 is about. */
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  characters.forEach((character, i) => {
    const centre = (i + 0.5) * cell
    const x = orientation === 'vertical' ? width / 2 : centre
    const y = orientation === 'vertical' ? centre : height / 2

    ctx.globalAlpha = 0.35
    ctx.lineWidth = size * 0.34
    ctx.strokeStyle = color
    ctx.strokeText(character, x, y)

    ctx.globalAlpha = 1
    ctx.lineWidth = size * 0.1
    ctx.strokeText(character, x, y)

    // The core is lighter than the tube colour — a lit tube is white at the centre.
    ctx.fillStyle = '#FFFFFF'
    ctx.globalAlpha = 0.82
    ctx.fillText(character, x, y)
    ctx.globalAlpha = 1
  })

  return canvas
}

const cache = new Map<string, CanvasTexture>()

/**
 * A painted face, cached for the life of the page. Keyed on everything that changes the
 * pixels, so two signs with the same string and colour share one texture.
 */
export function neonSignTexture(
  text: string,
  color: ColorToken,
  orientation: Orientation,
  size: readonly [number, number],
  tier: Tier,
  kind: SignKind = 'sign',
): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const key = `${text}|${color}|${orientation}|${size[0]}x${size[1]}|${kind}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(
    paint(text, PALETTE[color], orientation, size[0], size[1], kind),
  )
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
