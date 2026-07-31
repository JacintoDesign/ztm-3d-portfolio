'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import { CANVAS_PAINTER, PALETTE, PROPS, type Tier } from '@/lib/world'

/**
 * §3.7 — the drinks rack on a dead vending machine's front, painted once and shared by all
 * four.
 *
 * **`map` only. There is no emissive term anywhere on this and that is the whole design.**
 * What was wrong was never the light — it was the **albedo**. The panel was a `void` slab at
 * 0.4% reflectance, which is not *an unlit drinks machine*, it is a hole cut in a machine,
 * and §4.1 already found and named that exact fault at wall scale: a hex in §4 is an albedo,
 * not a pixel.
 *
 * **All four machines are dead now and the rule that made them so has gone.** This existed
 * to keep four machines unlit so §2.2's fifth could mean something; §2.2 has since moved the
 * bio station to §3.7's food cart, so there is no fifth machine and nothing to distinguish
 * from. The painter is unchanged, because what it worked out — that a surface is legible
 * from its albedo and not from a glow — never depended on that rule.
 *
 * So the cans are painted at the reflectance real drinks cans have — 35–55% — and §7's
 * hemisphere, the alley lights and the gate light do the rest. The distinction from §2.2
 * becomes **lit versus legible**, which is a stronger distinction than *dark versus lit*
 * was: §2.2's machine takes this same canvas at §8.1's `vendingFrontPanel` rung of 2.44,
 * over the bloom knee, **and §7's light 4**. One of the five throws light on the alley, and
 * no amount of paint imitates that.
 *
 * **One canvas for four.** §15 lists the props among the instanced meshes and an instanced
 * mesh carries one material, so the rack cannot vary per machine. Four identical
 * mass-produced machines is what an alley actually has.
 *
 * Deterministic — no `Math.random()`. Which can is which colour is a property of the world
 * rather than of the page load, exactly as §3.3's lit windows are.
 */

/** §11.1's precedent. Same sequence every run, on every machine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 0x0d21d1c

const ROWS = 4
const COLUMNS = 5

/**
 * The cans, and these are §4 tokens rather than free choices.
 *
 * A vending machine is the one object in this alley that is *allowed* to be a row of
 * saturated colours, because that is what it is — but they are the alley's colours, so a
 * machine reads as part of this street rather than as a sprite dropped into it. `signWhite`
 * is in the list twice because a rack of drinks is mostly water and tea.
 */
const CAN_COLORS: readonly string[] = [
  PALETTE.neonPink,
  PALETTE.neonCyan,
  PALETTE.sodium,
  PALETTE.lantern,
  PALETTE.phoneGreen,
  PALETTE.signWhite,
  PALETTE.signWhite,
  PALETTE.vendGlow,
]

/**
 * `#RRGGBB` at a fraction, in sRGB — a paint operation, not a light calculation.
 *
 * The fraction is what keeps this honest: §4's neon tokens are authored for surfaces that
 * *emit*, so used at full value on a diffuse panel they would be the brightest albedo in the
 * world by a wide margin. 0.62 puts a can at roughly 35–55% linear, which is what painted
 * aluminium actually returns.
 */
function tint(hex: string, multiply: number): string {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * multiply)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}

function paint(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const random = mulberry32(SEED)

  /* The cabinet behind the glass. Dark, but not `void`: this is the inside of a lit-when-on
     cabinet seen through glass at 3am, and §4.1's whole lesson is that the darkest thing in
     a frame should still be a material. */
  ctx.fillStyle = tint(PALETTE.shutter, 1.0)
  ctx.fillRect(0, 0, width, height)

  /* The header band — the panel that says what is in it. On a live machine this is backlit;
     on a dead one it is a pale plastic sheet with the alley's light on it. */
  const pad = width * 0.055
  const headerHeight = height * 0.115
  ctx.fillStyle = tint(PALETTE.signWhite, 0.66)
  ctx.fillRect(pad, pad, width - pad * 2, headerHeight)

  ctx.textAlign = 'center'
  ctx.fillStyle = tint(PALETTE.void, 1.0)
  ctx.font = `700 ${Math.round(headerHeight * 0.56)}px "Hiragino Sans", "Yu Gothic", sans-serif`
  ctx.fillText('ドリンク', width / 2, pad + headerHeight * 0.68)

  /* Four shelves of five. Each row sits on a shelf lip, which is the detail that makes a
     grid of rectangles read as a rack rather than as a colour chart. */
  const rackTop = pad * 2 + headerHeight
  const rackBottom = height * 0.8
  const rowPitch = (rackBottom - rackTop) / ROWS
  const columnPitch = (width - pad * 2) / COLUMNS
  const canWidth = columnPitch * 0.6
  const canHeight = rowPitch * 0.58

  for (let row = 0; row < ROWS; row++) {
    const shelfY = rackTop + row * rowPitch

    // Shelf lip, and a shadow under it.
    ctx.fillStyle = tint(PALETTE.metalDark, 1.0)
    ctx.fillRect(pad, shelfY + rowPitch * 0.78, width - pad * 2, Math.max(1, rowPitch * 0.05))

    for (let column = 0; column < COLUMNS; column++) {
      const x = pad + column * columnPitch + (columnPitch - canWidth) / 2
      const y = shelfY + rowPitch * 0.14
      const colour = CAN_COLORS[Math.floor(random() * CAN_COLORS.length)] as string

      // The body. 0.62 of the token — see `tint`.
      ctx.fillStyle = tint(colour, 0.62)
      ctx.fillRect(x, y, canWidth, canHeight)
      // A brighter cap and one specular stripe, which is all a can needs at this size.
      ctx.fillStyle = tint(colour, 0.86)
      ctx.fillRect(x, y, canWidth, Math.max(1, canHeight * 0.12))
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillRect(x + canWidth * 0.16, y + canHeight * 0.18, Math.max(1, canWidth * 0.1), canHeight * 0.68)

      // Price tag under each can.
      ctx.fillStyle = tint(PALETTE.uiDim, 0.9)
      ctx.font = `600 ${Math.max(6, Math.round(rowPitch * 0.13))}px "Helvetica Neue", sans-serif`
      ctx.fillText(
        `¥${110 + Math.floor(random() * 5) * 10}`,
        x + canWidth / 2,
        shelfY + rowPitch * 0.74,
      )
    }
  }

  /* Glass. One broad diagonal sheen across the whole face — the single cue that says there
     is a pane in front of the cans, and the reason the rack does not read as a poster. */
  const sheen = ctx.createLinearGradient(0, rackTop, width, rackBottom)
  sheen.addColorStop(0.3, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.46, 'rgba(255,255,255,0.07)')
  sheen.addColorStop(0.54, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(pad, rackTop, width - pad * 2, rackBottom - rackTop)

  /* The dispense flap and the coin slot, along the bottom. §3.7 gives the machine a separate
     flap slab in geometry; this is the recess it sits in. */
  const flapTop = height * 0.845
  ctx.fillStyle = tint(PALETTE.void, 1.0)
  ctx.fillRect(pad, flapTop, (width - pad * 2) * 0.62, height * 0.1)
  ctx.strokeStyle = tint(PALETTE.metalDark, 1.0)
  ctx.lineWidth = Math.max(1, width / 180)
  ctx.strokeRect(pad, flapTop, (width - pad * 2) * 0.62, height * 0.1)

  ctx.fillStyle = tint(PALETTE.metalDark, 1.0)
  ctx.fillRect(width - pad - (width - pad * 2) * 0.16, flapTop + height * 0.012, (width - pad * 2) * 0.16, height * 0.014)

  return canvas
}

const cache = new Map<Tier, CanvasTexture>()

/** §3.7 — painted on first call and cached for the lifetime of the page. Never per frame. */
export function vendingFront(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const [width, height] = PROPS.vendingMachine.frontCanvas[tier]
  const texture = new CanvasTexture(paint(width, height))
  // Colour, not data. §11.1.
  texture.colorSpace = SRGBColorSpace
  // One panel, one image. Nothing here repeats.
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(tier, texture)
  return texture
}
