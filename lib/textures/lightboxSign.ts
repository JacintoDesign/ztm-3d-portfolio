'use client'

import { CanvasTexture, ClampToEdgeWrapping, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { CANVAS_PAINTER, type Tier } from '@/lib/world'

/**
 * §3.4 — the lightbox recipe, shared by §2.1's project sign and §3.6's brand sign.
 *
 * **A lit coloured face with the type cut out of it in black.** That is what every shop sign
 * in this alley already is, and both of these were something else: the project name was white
 * neon glyphs at §8.1's 4.20 rung, which blew all three channels and read as a hole in the
 * world; the brand sign was two rows of coloured type glowing on a dark panel, which is a
 * poster rather than a sign.
 *
 * **Greyscale, and used as `emissiveMap` only.** §3.4's rule: the map says *how much* light
 * leaves each texel and the material's `emissive` says what colour it is. A coloured map here
 * would multiply the accent by itself. So this paints white where the box is lit and black
 * where the glyphs are, and the caller supplies the colour — which is also what makes one
 * painter serve two signs in two different colours.
 *
 * `destination-out` for the glyphs rather than filling them dark, because a cut-out is what a
 * real lightbox is: opaque vinyl on a lit panel, so the letters are the only place the light
 * does not come through.
 */

export type LightboxRow = { text: string; face: 'latin' | 'japanese' }

export function paintLightbox(
  rows: readonly LightboxRow[],
  size: readonly [number, number],
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null

  const [width, height] = size
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* The case. Black is *unlit*, and the frame and the grime below stay subtractive by
     construction because everything after this only ever adds light or cuts it away. */
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const inset = Math.round(Math.min(width, height) * 0.075)
  const panelW = width - inset * 2
  const panelH = height - inset * 2

  /**
   * The lit face. Brightest a little above centre, where a real box's tube sits — flat white
   * would read as a printed panel rather than as one with a lamp behind it.
   *
   * **It peaks at 0.85, not at white**, and that is what lets the colour survive. The map is
   * greyscale and the emissive colour multiplies through it, so a face at 255 pushes every
   * channel of a light token like `neonCyan` over the knee at once and ACES returns it as
   * near-white — a lightbox that has lost the thing that makes it a *coloured* lightbox.
   */
  const glow = ctx.createLinearGradient(0, inset, 0, inset + panelH)
  glow.addColorStop(0, '#c0c0c0')
  glow.addColorStop(0.42, '#d8d8d8')
  glow.addColorStop(1, '#9c9c9c')
  ctx.fillStyle = glow
  ctx.fillRect(inset, inset, panelW, panelH)

  /* Two diffuser seams, the width of the box. One pixel each: at any size above that they
     stop reading as a seam and start reading as a stripe. */
  ctx.fillStyle = 'rgba(0,0,0,0.10)'
  ctx.fillRect(inset, Math.round(inset + panelH * 0.30), panelW, 1)
  ctx.fillRect(inset, Math.round(inset + panelH * 0.70), panelW, 1)

  /* ── The type, cut out ── */
  ctx.globalCompositeOperation = 'destination-out'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const rowH = panelH / rows.length
  const maxTextW = panelW * 0.84

  rows.forEach((row, i) => {
    const face = row.face === 'latin' ? CANVAS_PAINTER.latinFace : CANVAS_PAINTER.japaneseFace
    /* Start from the row height and shrink to fit the width — never the other way round, or
       a long name grows past the panel edge. §17 needs a longer name to work unedited. */
    let px = Math.round(rowH * 0.62)
    ctx.font = `700 ${px}px ${face}`
    const measured = ctx.measureText(row.text).width
    if (measured > maxTextW) {
      px = Math.round((px * maxTextW) / measured)
      ctx.font = `700 ${px}px ${face}`
    }
    ctx.fillStyle = '#000000'
    /* `textBaseline: 'middle'` centres the *em box*, which includes descender space no capital
       uses — so an all-caps row sits visibly high. Nudging down by 6% of the cap height puts
       the letterforms on the panel's optical centre rather than the font's metric one. */
    ctx.fillText(row.text, width / 2, inset + rowH * (i + 0.5) + px * 0.06, maxTextW)
  })

  ctx.globalCompositeOperation = 'source-over'

  /* The case standing proud of the lit face. */
  ctx.strokeStyle = 'rgba(0,0,0,0.92)'
  ctx.lineWidth = Math.max(2, inset * 1.15)
  ctx.strokeRect(inset / 2, inset / 2, width - inset, height - inset)

  /* Grime along the bottom, where it collects on anything mounted over a street. */
  const grime = ctx.createLinearGradient(0, height * 0.82, 0, height)
  grime.addColorStop(0, 'rgba(0,0,0,0)')
  grime.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = grime
  ctx.fillRect(0, Math.round(height * 0.82), width, Math.round(height * 0.18))

  return canvas
}

/** Applies the conventions every painter in this directory shares. */
export function finishLightbox(canvas: HTMLCanvasElement, tier: Tier): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true
  return texture
}
