'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import {
  CANVAS_PAINTER,
  DECORATIVE_SIGNAGE,
  STATION_GATE,
  type Tier,
} from '@/lib/world'

/**
 * §3.1 — the station gate's closure notice: a shinkansen pictogram and §11.4's index 21 on one
 * canvas, so the whole thing is one texture, one material and one draw call.
 *
 * **The train is painted, not modelled.** §11 makes canvas the way every graphic in this world
 * arrives, and §3.2's bicycle-to-scooter argument applies verbatim: a shinkansen's entire identity
 * is the long nose curve, and this world's geometry vocabulary is boxes and cylinders, so built as
 * geometry it would read as a lump on a wall. It would also want a rung on §8.1 it does not have,
 * and a lit 3D object at the one place §3.1 wants flat, dark and municipal.
 *
 * **`emissiveMap` only, and greyscale**, per §3.4's rule: the diffuse stays `void`, the map says how
 * much light leaves each texel and the material says what colour it is.
 *
 * The string is never chosen here — it comes from §11.4 by index, so `lib/world.ts` stays the single
 * source and this file holds no words. An index past the end of the list returns `null` rather than
 * falling back, because a silent fallback would look like a content decision.
 */

function paint(text: string, tier: Tier): HTMLCanvasElement {
  const [width, height] = STATION_GATE.notice.canvas[tier]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* Start dark: a notice is a dark case with a lit face, so everything below adds light and the
     frame and grime stay subtractive by construction. Same shape as signBox.ts. */
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const inset = Math.round(width * 0.035)
  const panelW = width - inset * 2
  const panelH = height - inset * 2

  /* Even-ish backlight, brighter above centre where the tube sits. Flatter than a shop's sign box:
     §3.1 wants this fluorescent and municipal, not warm. */
  const glow = ctx.createLinearGradient(0, inset, 0, inset + panelH)
  glow.addColorStop(0, '#f2f2f2')
  glow.addColorStop(0.45, '#dcdcdc')
  glow.addColorStop(1, '#9a9a9a')
  ctx.fillStyle = glow
  ctx.fillRect(inset, inset, panelW, panelH)

  /* ── The pictogram, upper 52% of the panel ──────────────────────────────────────────────
     Cut *out* of the lit face rather than drawn onto it, the same way signBox.ts cuts its
     glyphs: the face is opaque where the train is and the light comes through everything
     else, which is what a real backlit notice does. */
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'

  const cx = width / 2
  const noseY = height * 0.30
  const bodyH = height * 0.20
  const halfLen = panelW * 0.34
  const top = noseY - bodyH / 2
  const bottom = noseY + bodyH / 2

  /* Profile, nose at the left. The nose is a long shallow bezier and the roofline a gentler one —
     that pair is the whole reason this is a canvas and not a box. */
  ctx.beginPath()
  ctx.moveTo(cx - halfLen, bottom)
  ctx.bezierCurveTo(
    cx - halfLen * 0.62, bottom - bodyH * 0.06,
    cx - halfLen * 0.40, top + bodyH * 0.10,
    cx - halfLen * 0.02, top,
  )
  ctx.lineTo(cx + halfLen * 0.86, top)
  ctx.quadraticCurveTo(cx + halfLen, top, cx + halfLen, top + bodyH * 0.22)
  ctx.lineTo(cx + halfLen, bottom)
  ctx.closePath()
  ctx.fill()

  /* Two bogies, so it sits on something. */
  const bogieH = Math.max(2, height * 0.028)
  for (const t of [0.24, 0.74]) {
    ctx.fillRect(
      Math.round(cx - halfLen + panelW * 0.68 * t),
      Math.round(bottom),
      Math.round(panelW * 0.10),
      Math.round(bogieH),
    )
  }
  ctx.globalCompositeOperation = 'source-over'

  /* The window band goes back *in* as light — a lit strip along the carriage, which is the one
     detail that stops the silhouette reading as a fish. */
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillRect(
    Math.round(cx - halfLen * 0.10),
    Math.round(top + bodyH * 0.26),
    Math.round(halfLen * 1.02),
    Math.round(bodyH * 0.24),
  )

  /* ── The string, lower third ───────────────────────────────────────────────────────────── */
  const fontPx = Math.round(panelH * 0.26)
  ctx.font = `${fontPx}px ${CANVAS_PAINTER.japaneseFace}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const metrics = ctx.measureText(text)
  const maxTextW = panelW * 0.88
  if (metrics.width > maxTextW) {
    ctx.font = `${Math.round((fontPx * maxTextW) / metrics.width)}px ${CANVAS_PAINTER.japaneseFace}`
  }

  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'
  ctx.fillText(text, cx, height * 0.74)
  ctx.globalCompositeOperation = 'source-over'

  /* A hairline under the pictogram, separating it from the words. */
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(Math.round(inset + panelW * 0.16), Math.round(height * 0.545), Math.round(panelW * 0.68), 1)

  /* The case, standing proud of the lit face. */
  ctx.strokeStyle = 'rgba(0,0,0,0.9)'
  ctx.lineWidth = Math.max(2, inset * 1.1)
  ctx.strokeRect(inset / 2, inset / 2, width - inset, height - inset)

  /* Grime along the bottom, where it collects on anything mounted over a street. */
  const grime = ctx.createLinearGradient(0, height * 0.8, 0, height)
  grime.addColorStop(0, 'rgba(0,0,0,0)')
  grime.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = grime
  ctx.fillRect(0, Math.round(height * 0.8), width, Math.round(height * 0.2))

  return canvas
}

const cache = new Map<Tier, CanvasTexture>()

/** §3.1 — painted on first call and cached for the lifetime of the page. Never per frame. */
export function gateNoticeTexture(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const text = DECORATIVE_SIGNAGE[STATION_GATE.notice.stringIndex]
  if (text === undefined) return null

  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(paint(text, tier))
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
