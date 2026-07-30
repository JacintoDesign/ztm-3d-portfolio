'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, CROSS_STREET, PALETTE, type Tier } from '@/lib/world'

/**
 * §2.4 / §3.6 — the studio's name on the far building. Two rows, two colours, one canvas.
 *
 * **This is §2.4's one named exception**, and it is written as an exception rather than as a
 * thirty-first §11.4 string, because that list is explicitly *"never project-related"* and this is
 * the one thing in the world that is. It extends the allowance §3.1 already makes for `終電`: the
 * piece is permitted to be signed, in two places, both recorded.
 *
 * **A `MeshBasicMaterial`, matching §3.6's boards rather than §8.1's ladder.** The boards next to it
 * are basic-material quads whose colour arrives as a linear `instanceColor` gain of 1.25 — chosen
 * because a basic material tops out at white and `FogExp2` mixes toward `fogColor` before the blend,
 * so a *fraction* of the colour disappears into the fog at this range. The sign takes the same gain,
 * applied to the material's `color` so it multiplies the painted map. Putting it on §8.1 instead
 * would give the far building the only emissive surface out there and a rung it does not have.
 *
 * Latin text, so §11.1's `latinFace` rather than its Japanese face — the only place in the world
 * that is true.
 */

function paint(tier: Tier): HTMLCanvasElement {
  const sign = CROSS_STREET.farBuilding.brandSign
  const [width, height] = sign.canvas[tier]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* The case is dark and the letters are the light, the same way §3.5's neon signs are built:
     a lit panel with dark type would read as a billboard, and there are no billboards here. */
  ctx.fillStyle = PALETTE.void
  ctx.fillRect(0, 0, width, height)

  const [rowA, rowB] = sign.rows
  const [colorA, colorB] = sign.rowColors

  /* Both rows fitted to the panel rather than to a point size, and to the *narrower* of the two
     constraints — 'JACINTO' is 7 characters and 'DESIGN' is 6, so a single size chosen for one
     overflows or under-fills the other. The two are sized independently and centred. */
  const rows: readonly [string, string][] = [
    [rowA ?? '', colorA ?? 'neonMagenta'],
    [rowB ?? '', colorB ?? 'neonCyan'],
  ]

  const maxTextW = width * 0.86
  const rowH = height * 0.34

  rows.forEach(([text, token], i) => {
    /* Start from the row height and shrink to fit the width — never the other way round, or a
       long row grows past the panel edge. */
    let px = Math.round(rowH * 0.86)
    ctx.font = `700 ${px}px ${CANVAS_PAINTER.latinFace}`
    const measured = ctx.measureText(text).width
    if (measured > maxTextW) {
      px = Math.round((px * maxTextW) / measured)
      ctx.font = `700 ${px}px ${CANVAS_PAINTER.latinFace}`
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const cy = height * (i === 0 ? 0.33 : 0.70)
    const hex = PALETTE[token as keyof typeof PALETTE]

    /* A soft bloom of the letter's own colour under the letter, so the tube reads as glowing into
       the case rather than as flat type on black. §9's bloom pass cannot do this for us — at
       52 m the sign is under 0.11 transmittance and lands far below the 0.90 knee. */
    ctx.shadowColor = hex
    ctx.shadowBlur = Math.max(6, px * 0.35)
    ctx.fillStyle = hex
    ctx.fillText(text, width / 2, cy)
    ctx.fillText(text, width / 2, cy)
    ctx.shadowBlur = 0
  })

  /* A thin frame in the same dark as the case, so the sign has an edge against the facade it is
     mounted on — §4's `metalDark`, the token every bracket and railing in the alley already uses. */
  ctx.strokeStyle = PALETTE.metalDark
  ctx.lineWidth = Math.max(2, width * 0.012)
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth)

  return canvas
}

const cache = new Map<Tier, CanvasTexture>()

/** §3.6 — painted on first call and cached for the lifetime of the page. Never per frame. */
export function brandSignTexture(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(paint(tier))
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
