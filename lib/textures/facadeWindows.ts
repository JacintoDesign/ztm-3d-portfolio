'use client'

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from 'three'
import {
  CANVAS_PAINTER,
  FACADE_WINDOWS,
  LAYOUT,
  PALETTE,
  type Tier,
  facadeWindowFloors,
} from '@/lib/world'

/**
 * §3.3 — the upper facade window grid.
 *
 * One image per variant, used as **both `map` and `emissiveMap`**. That is the whole
 * idea and it is worth stating: two textures would let a window be lit in colour and
 * dark in glow, which is a class of bug nobody finds by looking at it — the wall simply
 * reads slightly wrong. One image cannot disagree with itself.
 *
 * The bay painted here is always **three** floors. The east wall has two, and samples
 * the bottom two thirds of this same image through its geometry's UVs (§3.3), so the
 * height classes cost geometry and not memory.
 *
 * Painted once per tier and cached. Deterministic — no `Math.random()` — so which
 * windows are lit is a property of the world rather than of the page load.
 */

/**
 * The texture is painted for the *taller* wall and the shorter one crops it. Taken from
 * the west facade rather than written as 3, so that changing a facade height in the
 * brief moves the image and the geometry together instead of leaving one behind.
 */
export const FLOORS_PER_TEXTURE = facadeWindowFloors(LAYOUT.facadeHeight.west)
const WINDOWS_PER_FLOOR = Math.round(FACADE_WINDOWS.bay.width / FACADE_WINDOWS.window.pitch)
const WINDOWS_PER_BAY = FLOORS_PER_TEXTURE * WINDOWS_PER_FLOOR

/** Bay height in metres — what the canvas's V axis covers. */
const BAY_HEIGHT = FLOORS_PER_TEXTURE * FACADE_WINDOWS.floorHeight

/**
 * A window sits high in its floor: 0.95 of spandrel below, 0.55 of header above the
 * 1.35 opening. Real buildings put the glass near the ceiling, and the difference is
 * visible from below — which is the only angle this wall is ever seen from.
 */
const SILL_ABOVE_FLOOR = 0.95

const SEED = 0x0facade

/** Deterministic PRNG. Same sequence every run, on every machine. */
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

/** `#RRGGBB` to an `rgb()` string, optionally dimmed. Multiplies in sRGB, which is
 *  where the value is authored — this is a paint operation, not a light calculation. */
function tint(hex: string, multiply = 1): string {
  const value = parseInt(hex.slice(1), 16)
  const r = Math.round(((value >> 16) & 255) * multiply)
  const g = Math.round(((value >> 8) & 255) * multiply)
  const b = Math.round((value & 255) * multiply)
  return `rgb(${r} ${g} ${b})`
}

/**
 * How many windows are lit in this variant.
 *
 * Distributed across the variants rather than rounded per variant: 15 windows at the
 * §3.3 fraction of 0.16 is 2.4, and rounding that three times gives 2 + 2 + 2 = 0.133
 * across the set — a sixth short of the figure the brief states. Running the rounding
 * over the cumulative total instead gives 2 + 3 + 2, which lands on 0.156.
 */
function litCountFor(variant: number): number {
  const perBay = WINDOWS_PER_BAY * FACADE_WINDOWS.litFraction
  return Math.round((variant + 1) * perBay) - Math.round(variant * perBay)
}

function paint(variant: number, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  // The bay is 8.00 × 8.55 on a square canvas, so the two axes have their own scale.
  // Everything below is authored in metres and converted here, once.
  const pxPerMetreX = size / FACADE_WINDOWS.bay.width
  const pxPerMetreY = size / BAY_HEIGHT
  /** Bay-local metres upward from the band base → canvas pixels downward. */
  const toCanvasY = (metresUp: number) => size - metresUp * pxPerMetreY

  ctx.fillStyle = tint(PALETTE[FACADE_WINDOWS.baseColor])
  ctx.fillRect(0, 0, size, size)

  // Which windows are lit — chosen by shuffling the whole set and taking the first N,
  // so a variant can never come out all-dark by an unlucky roll of a per-window coin.
  const random = mulberry32(SEED + variant * 0x9e3779b1)
  const order = Array.from({ length: WINDOWS_PER_BAY }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = order[i] as number
    order[i] = order[j] as number
    order[j] = a
  }
  const lit = new Set(order.slice(0, litCountFor(variant)))

  const { width: windowWidth, height: windowHeight, pitch } = FACADE_WINDOWS.window
  const inset = (pitch - windowWidth) / 2

  for (let floor = 0; floor < FLOORS_PER_TEXTURE; floor++) {
    const sill = floor * FACADE_WINDOWS.floorHeight + SILL_ABOVE_FLOOR

    for (let column = 0; column < WINDOWS_PER_FLOOR; column++) {
      const left = column * pitch + inset
      const index = floor * WINDOWS_PER_FLOOR + column

      const x = left * pxPerMetreX
      const y = toCanvasY(sill + windowHeight)
      const w = windowWidth * pxPerMetreX
      const h = windowHeight * pxPerMetreY

      const isLit = lit.has(index)
      /* Lit windows vary in brightness. A wall of identically-lit rectangles reads as a
         pattern; the variation is what makes it read as rooms. It rides on the map, so
         it costs nothing at runtime and stays under the §8.1 threshold either way. */
      const brightness = isLit ? 0.55 + random() * 0.45 : 1

      ctx.fillStyle = isLit
        ? tint(PALETTE[FACADE_WINDOWS.litColor], brightness)
        : tint(PALETTE[FACADE_WINDOWS.unlitColor])
      ctx.fillRect(x, y, w, h)

      // A hairline reveal in `concrete`, so the grid still reads when every window in
      // sight is dark — which, at 0.16 lit, is most of the wall most of the time.
      ctx.strokeStyle = tint(PALETTE.concrete)
      ctx.lineWidth = Math.max(1, Math.round(size / 512))
      ctx.strokeRect(x, y, w, h)

      // Mullions. Dark in the map and therefore dark in the emissive map too, which is
      // what stops a lit window reading as a solid glowing tile.
      if (isLit) {
        ctx.fillStyle = tint(PALETTE[FACADE_WINDOWS.unlitColor])
        const bar = Math.max(1, Math.round(size / 340))
        ctx.fillRect(x + w / 2 - bar / 2, y, bar, h)
        ctx.fillRect(x, y + h * 0.42 - bar / 2, w, bar)
      }
    }
  }

  return canvas
}

const cache = new Map<string, CanvasTexture>()

/**
 * The window bay for one variant, painted on first call and cached for the life of the
 * page. The same texture object is handed to both `map` and `emissiveMap`.
 */
export function facadeWindowTexture(variant: number, tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const key = `${tier}:${variant}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const texture = new CanvasTexture(paint(variant, FACADE_WINDOWS.canvas[tier]))
  // Colour, not data — unlike the ground's masks. §11.1.
  texture.colorSpace = SRGBColorSpace
  // One bay, one image. Nothing repeats within a panel; the repetition is six panels.
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(key, texture)
  return texture
}
