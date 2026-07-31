'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import type { Channel } from '@/lib/contact'
import { BIO_STATION, CANVAS_PAINTER, CONTACT_STATION, EMISSIVE, PALETTE, type Tier } from '@/lib/world'

/**
 * §2.2 / §2.3 — **every lit label on both stations, on one canvas.**
 *
 * Two stations, four kinds of surface, one texture: §2.3's six mailbox plates and six flags,
 * and §2.2's canopy sign band. They are painted into one atlas so that `Stations.tsx` can
 * bake them into **one geometry with one material — one draw call for all thirteen.** §15
 * has three calls of headroom on mobile and §2.3's boxes and plate need two of them;
 * thirteen separately-materialled quads would have been thirteen.
 *
 * **The brightness ratios are painted in, not set per surface.** `emissiveIntensity` is a
 * property of a material, so one material means one intensity — and these want three. The
 * material runs at §8.1's brightest rung of the group (`mailboxFlag`, 3.10) and each region
 * is painted at its own rung's *fraction* of it: labels at 1.89/3.10, the cart's faces at
 * 2.44/3.10. This is `lib/textures/vendingFront.ts`'s finding turned around — there, albedo
 * decided what was legible with no emissive at all; here, albedo decides how much of one
 * emissive term each surface takes.
 *
 * Deterministic and content-driven: the six labels are whatever `CONTENT.md` says they are,
 * so a seventh channel repaints rather than requiring an edit here.
 */

/**
 * Regions in a nominal 1024² atlas, as `[x, y, w, h]`. Scaled by the tier.
 *
 * **Each region's aspect matches its surface's**, and that is the only constraint on the
 * layout — a 0.34 × 0.10 plate sampling a square region stretches its type. Checked here
 * rather than assumed: `320/94 = 3.40` against `0.34/0.10 = 3.40`.
 */
const ATLAS = 1024

const REGION = {
  /** 1.60 × 0.26 → 6.15. `1024/166 = 6.17`. */
  signBand: [0, 0, 1024, 166],
  /** 0.34 × 0.10 → 3.40. `320/94 = 3.40`. Six, stacked. */
  label: (i: number): readonly [number, number, number, number] => [620, 180 + i * 104, 320, 94],
  /** Square, and it is a flat colour — the size is only about not being one texel. */
  flag: (i: number): readonly [number, number, number, number] => [40 + i * 72, 560, 56, 56],
} as const

/** Every region's rung as a fraction of the material's — see the note above. */
const BRIGHTNESS = {
  flag: 1,
  label: EMISSIVE.mailboxLabel / EMISSIVE.mailboxFlag,
  cart: EMISSIVE.bioStationPanel / EMISSIVE.mailboxFlag,
} as const

/** `#RRGGBB` at a fraction, in sRGB. `vendingFront.ts`'s helper, for its reasons. */
function tint(hex: string, multiply: number): string {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * multiply)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}

/** Scales a nominal-1024 region to the atlas actually being painted. */
const at = (region: readonly [number, number, number, number], size: number) =>
  region.map((n) => (n * size) / ATLAS) as unknown as [number, number, number, number]

/**
 * UVs for a region, in the atlas's own space. `Stations.tsx` bakes these into the geometry.
 *
 * **`1 - y` twice, and it is not decoration.** A canvas's origin is top-left and a texture's
 * is bottom-left, so a region's *top* in canvas pixels is its *high* v. Getting it upside
 * down puts every label on its head, which reads as a broken font rather than as a flipped
 * coordinate — §6.2 spent a section on the same class of mistake.
 */
export function uvRect(
  region: readonly [number, number, number, number],
): { u0: number; v0: number; u1: number; v1: number } {
  const [x, y, w, h] = region
  return { u0: x / ATLAS, v0: 1 - (y + h) / ATLAS, u1: (x + w) / ATLAS, v1: 1 - y / ATLAS }
}

export const LABEL_REGION = REGION

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  family: string,
  weight: string,
): number {
  let px = startPx
  ctx.font = `${weight} ${px}px ${family}`
  while (ctx.measureText(text).width > maxWidth && px > 6) {
    px -= 1
    ctx.font = `${weight} ${px}px ${family}`
  }
  return px
}

const MONO = '"SF Mono", "Menlo", "Consolas", monospace'

function paint(size: number, channels: readonly Channel[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  /* Black everywhere that is not a region. An emissive map multiplies the emissive colour,
     so untouched atlas is unlit — which is what the gaps between regions should be. */
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)

  ctx.textBaseline = 'middle'

  /* ── §2.3's six plates. One per channel, in CONTENT.md's order. ────────────── */
  channels.forEach((channel, i) => {
    if (i >= 24) return
    const [x, y, w, h] = at(REGION.label(i), size)
    const b = BRIGHTNESS.label

    /* The plate: a dark ground with a bright rule under the type. A plate that is bright all
       over is a glowing rectangle; a plate with a lit edge is a sign. */
    ctx.fillStyle = tint(PALETTE.void, b)
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = tint(PALETTE.signWhite, b * 0.55)
    ctx.lineWidth = Math.max(1, h * 0.045)
    ctx.strokeRect(x + h * 0.09, y + h * 0.13, w - h * 0.18, h - h * 0.26)

    ctx.textAlign = 'center'
    ctx.fillStyle = tint(PALETTE.signWhite, b)
    const label = channel.label.toUpperCase()
    const px = fitText(ctx, label, w * 0.74, h * 0.42, MONO, '700')
    ctx.font = `700 ${px}px ${MONO}`
    ctx.fillText(label, x + w / 2, y + h / 2)
  })

  /* ── §2.3's six flags. Flat colour at full brightness; the geometry is 0.05 m. ── */
  const flagTokens = CONTACT_STATION.flagColors
  channels.forEach((_, i) => {
    if (i >= 24) return
    const [x, y, w, h] = at(REGION.flag(i), size)
    const token = flagTokens[i % flagTokens.length] as keyof typeof PALETTE
    ctx.fillStyle = tint(PALETTE[token], BRIGHTNESS.flag)
    ctx.fillRect(x, y, w, h)
  })

  /* ── §2.2's canopy sign band. §11.4's kana, not a project name — this is the one thing
        on the cart's outside that says what it is. ──────────────────────────────── */
  {
    const [x, y, w, h] = at(REGION.signBand, size)
    const b = BRIGHTNESS.cart

    ctx.fillStyle = tint(PALETTE.lantern, b * 0.9)
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = tint(PALETTE.void, 1)
    ctx.fillRect(x, y + h * 0.86, w, h * 0.14)

    ctx.textAlign = 'center'
    ctx.fillStyle = tint(PALETTE.signWhite, b)
    const px = fitText(ctx, 'ラーメン', w * 0.5, h * 0.62, '"Hiragino Sans", "Yu Gothic", sans-serif', '700')
    ctx.font = `700 ${px}px "Hiragino Sans", "Yu Gothic", sans-serif`
    ctx.fillText('ラーメン', x + w / 2, y + h * 0.46)
  }

  /* §2.2's stats board was painted here and is gone with the surface it was on: the three
     stats read as a poster stuck to a food cart, and §2.2's own rule — *no text on the
     exterior beyond decorative kana* — always had them in the overlay. */

  return canvas
}

/**
 * Painted on first call and cached per tier. Never per frame.
 *
 * **Keyed on the content too.** `CONTENT.md` is read at build time so the channels cannot
 * change during a session — but a cache keyed only on the tier would silently serve a stale
 * atlas the first time somebody makes them dynamic, and the failure would be six mailboxes
 * with the wrong names on them.
 */
const cache = new Map<string, CanvasTexture>()

export function stationLabels(
  tier: Tier,
  channels: readonly Channel[],
): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const key = `${tier}:${channels.map((c) => c.label).join(',')}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const size = BIO_STATION.labelCanvas[tier]
  const texture = new CanvasTexture(paint(size, channels))
  // Colour, not data. §11.1.
  texture.colorSpace = SRGBColorSpace
  // One atlas, sampled by baked UVs. Nothing here repeats.
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(key, texture)
  return texture
}
