'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, CROSS_STREET, PALETTE, type Tier } from '@/lib/world'

/**
 * §2.4 / §3.6 — the studio's name on the far building: **individual letters bolted to the
 * facade**, not a sign in a frame.
 *
 * **This is §2.4's one named exception**, and it is written as an exception rather than as a
 * thirty-first §11.4 string, because that list is explicitly *"never project-related"* and this
 * is the one thing in the world that is. It extends the allowance §3.1 already makes for `終電`.
 *
 * **It was built as a §3.4 lightbox and that was the wrong object.** The argument for it was
 * that every other sign in this alley is one — which is precisely why it fails here: a lightbox
 * is a *shop's* fitting, and this is the only surface in the world that is not a shop. Cut
 * letters standing off a wall are the one signage idiom nothing else here uses, and a signature
 * that reads like the shop next door is not a signature.
 *
 * **The canvas is transparent except for the letters**, so the material has no panel to draw —
 * what renders is the type and its shadow, which is what "bolted to the wall" means when the
 * wall is 52 m away and modelling forty letter solids is not on the table. Each glyph gets a
 * dark offset below-right: at this range that reads as depth far more reliably than geometry
 * would, because geometry that small disappears into §5's fog before its silhouette arrives.
 */

function paint(tier: Tier): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null

  const sign = CROSS_STREET.farBuilding.brandSign
  const [width, height] = sign.canvas[tier]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* Left transparent. No fill, no frame, no case — the wall shows through everywhere the
     letters are not, which is the whole difference from the lightbox version. */
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const rowH = height / sign.rows.length
  const maxTextW = width * 0.88

  sign.rows.forEach((text, i) => {
    const token = sign.rowColors[i] ?? sign.rowColors[0] ?? 'neonMagenta'
    const hex = PALETTE[token as keyof typeof PALETTE]

    /* Fit the row height first, then shrink to the width — never the other way round, or a
       longer word grows past the wall it is bolted to. */
    let px = Math.round(rowH * 0.66)
    ctx.font = `700 ${px}px ${CANVAS_PAINTER.latinFace}`
    const measured = ctx.measureText(text).width
    if (measured > maxTextW) {
      px = Math.round((px * maxTextW) / measured)
      ctx.font = `700 ${px}px ${CANVAS_PAINTER.latinFace}`
    }

    const cx = width / 2
    /* Nudged down by 6% of the cap: canvas centres the *em box*, which carries descender space
       no capital uses, so an all-caps row otherwise sits visibly high. */
    const cy = rowH * (i + 0.5) + px * 0.06

    /* The shadow the letters cast on the wall behind them — the bolted-on read. Offset down
       and right, because §7 has nothing out here and the only light on this facade is its own
       windows above. */
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur = px * 0.10
    ctx.shadowOffsetX = px * 0.055
    ctx.shadowOffsetY = px * 0.075
    ctx.fillStyle = '#000000'
    ctx.fillText(text, cx, cy, maxTextW)

    /* The letters themselves, with their own halo. §9's bloom cannot supply it at 52 m through
       §5's fog — the same argument §2.1's sign makes at a tenth of the distance. */
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.shadowColor = hex
    ctx.shadowBlur = px * 0.30
    ctx.fillStyle = hex
    ctx.fillText(text, cx, cy, maxTextW)
    ctx.fillText(text, cx, cy, maxTextW)
    ctx.shadowBlur = 0
  })

  return canvas
}

const cache = new Map<Tier, CanvasTexture>()

export function brandSignTexture(tier: Tier): CanvasTexture | null {
  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const canvas = paint(tier)
  if (canvas === null) return null

  const texture = new CanvasTexture(canvas)
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
