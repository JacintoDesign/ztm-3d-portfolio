'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, DECORATIVE_SIGNAGE, SIGN_BOX_STRING_OFFSET, type Tier } from '@/lib/world'

/**
 * §3.4 / §11.4 — the painted face of a storefront sign box.
 *
 * **These were blank by decision, not by omission.** §3.5 gave the projecting neon sign the
 * string and left the box carrying nothing — the right rule for *which of two objects on the
 * same stretch of wall gets the words*, and the wrong conclusion about a box on a wall with no
 * sign near it. Fourteen blank coloured slabs read as unfinished geometry. §11.4 now carries
 * seven strings at indices 14–20 for the seven **lit** boxes; the seven unlit ones stay blank,
 * because an unlit box is `shutter` with no emissive term and a slab you cannot read is
 * exactly what a shut shop's sign box is.
 *
 * **Used as `emissiveMap` only, and greyscale.** §3.4's rule: the diffuse is `void` and the
 * accent lives in the emissive term, so the map says *how much* light leaves each texel and
 * the material says what colour it is. A coloured map here would multiply the accent by itself.
 *
 * **A lightbox, not a poster.** Three things beyond the string do that work, and all three
 * come free in the same canvas: an inset frame, a backlight brighter at the centre than at the
 * corners — a box lit by a tube behind a diffuser is never even — and grime along the bottom
 * edge, which is where it collects on something mounted above a street.
 */

/** Landscape: a §3.4 sign box is a wide shallow panel on the fascia. */
const SIZE = { desktop: [256, 128], mobile: [128, 64] } as const

function paint(text: string, tier: Tier): HTMLCanvasElement {
  const [width, height] = SIZE[tier]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* Start dark. Everything below adds light, which keeps the frame and the grime subtractive
     by construction — a lightbox is a dark case with a lit panel in it. */
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const inset = Math.round(width * 0.05)
  const panelW = width - inset * 2
  const panelH = height - inset * 2

  /* The backlight. Radial, hottest just above centre because the tube sits high in the case,
     falling to about a third at the corners. This is the single thing that most stops the box
     reading as flat coloured card. */
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.44,
    Math.min(panelW, panelH) * 0.1,
    width / 2,
    height * 0.44,
    Math.max(panelW, panelH) * 0.62,
  )
  glow.addColorStop(0, '#ffffff')
  glow.addColorStop(0.55, '#c8c8c8')
  glow.addColorStop(1, '#4e4e4e')
  ctx.fillStyle = glow
  ctx.fillRect(inset, inset, panelW, panelH)

  /* Two faint horizontal seams — a box this wide is two diffuser panels, not one sheet. */
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  for (const t of [0.34, 0.68]) ctx.fillRect(inset, Math.round(inset + panelH * t), panelW, 1)

  /* The string. §11.2 gives no size for these, so it is fitted to the panel rather than
     authored: 62% of the panel height, which leaves the frame visible above and below at
     every string length on the list. Centred, and never wider than the panel. */
  const fontPx = Math.round(panelH * 0.62)
  ctx.font = `${fontPx}px ${CANVAS_PAINTER.japaneseFace}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const metrics = ctx.measureText(text)
  const maxTextW = panelW * 0.86
  if (metrics.width > maxTextW) {
    ctx.font = `${Math.round((fontPx * maxTextW) / metrics.width)}px ${CANVAS_PAINTER.japaneseFace}`
  }

  /* Glyphs are cut *out* of the lit panel, which is what a real sign box is: the face is
     opaque where the characters are and the light comes through everything else. Painting them
     bright instead would make the strokes the light source and the panel the surround, which
     is §3.5's neon sign, not this. */
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'
  ctx.fillText(text, width / 2, height * 0.47)
  ctx.globalCompositeOperation = 'source-over'

  /* The frame: darken a border band so the case reads as standing proud of the lit face. */
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.lineWidth = Math.max(2, inset * 0.9)
  ctx.strokeRect(inset / 2, inset / 2, width - inset, height - inset)

  /* Grime along the bottom edge, where it collects on anything mounted over a street. */
  const grime = ctx.createLinearGradient(0, height * 0.74, 0, height)
  grime.addColorStop(0, 'rgba(0,0,0,0)')
  grime.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = grime
  ctx.fillRect(0, Math.round(height * 0.74), width, Math.round(height * 0.26))

  return canvas
}

const cache = new Map<string, CanvasTexture>()

/**
 * §3.4 — the face for one lit sign box, by its **box index** (0-based over the seven lit).
 *
 * The string comes from §11.4 by index and is never chosen here: `SIGN_BOX_STRING_OFFSET + i`,
 * so the list in `lib/world.ts` stays the single source and this file holds no words at all.
 * Indices past the end of the list return `null` rather than wrapping — a silent wrap would
 * put the same string on two boxes and look like a content decision.
 */
export function signBoxTexture(boxIndex: number, tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const text = DECORATIVE_SIGNAGE[SIGN_BOX_STRING_OFFSET + boxIndex]
  if (text === undefined) return null

  const key = `${tier}:${boxIndex}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(paint(text, tier))
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
