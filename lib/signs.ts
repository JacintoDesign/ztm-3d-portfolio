/**
 * §3.5 — where the nine decorative neon signs go, and what each one says.
 *
 * Pure data, the same split as `lib/storefronts.ts`: this decides the wall, the height,
 * how far it projects and which §11.4 string it carries; `components/world/NeonSigns.tsx`
 * turns that into geometry.
 *
 * **Carries nothing** (§2.4). Every string is from §11.4's fixed list, by index, never
 * randomised and never project-related.
 */

import type { Orientation } from './textures/neonSign'
import {
  DECORATIVE_SIGNAGE,
  NEON_SIGNS,
  NEON_RATIO,
  OVERHEAD,
  STOREFRONT,
  type ColorToken,
} from './world'

export type NeonSign = {
  index: number
  wall: 'west' | 'east'
  z: number
  /** Base of the panel. */
  y: number
  /** Distance from the wall face to the near edge of the panel. */
  projection: number
  orientation: Orientation
  text: string
  color: ColorToken
  /** §11.3 — signs 3 and 7 only. */
  flickers: boolean
  /** Panel size in world metres, along × across. */
  size: [width: number, height: number]
}

const SEED = 0x9e0f11

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

const lerp = (range: readonly [number, number], t: number) =>
  range[0] + (range[1] - range[0]) * t

/**
 * §4's ratio over nine signs: 55 / 30 / 12 / 3 gives **5 / 3 / 1 / 0**. Blue rounds
 * away again, which is what §4 means by *rare, distance signs only*.
 *
 * Largest remainder, so the four buckets sum to exactly nine rather than to whatever
 * independent rounding happens to produce.
 */
function colorRun(total: number): ColorToken[] {
  const shares = [NEON_RATIO.magentaPink, NEON_RATIO.sodiumLantern, NEON_RATIO.cyan, NEON_RATIO.blue]
  const exact = shares.map((share) => share * total)
  const counts = exact.map(Math.floor)
  let remaining = total - counts.reduce((a, b) => a + b, 0)

  exact
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ i }) => {
      if (remaining <= 0) return
      counts[i] = (counts[i] as number) + 1
      remaining--
    })

  const buckets = [...STOREFRONT.signPalette, ['neonBlue'] as const]
  const out: ColorToken[] = []
  buckets.forEach((bucket, i) => {
    const count = counts[i] as number
    for (let n = 0; n < count; n++) out.push(bucket[n % bucket.length] as ColorToken)
  })
  return out
}

/** §2.1's own neon sign owns this stretch of the west wall at exactly this height. */
const SHOWCASE_SIGN_Z: [number, number] = [-5.6, -2.4]

function build(): NeonSign[] {
  const random = mulberry32(SEED)
  const colors = colorRun(NEON_SIGNS.count)
  const signs: NeonSign[] = []

  /* Spread along the alley rather than scattered: an even stride with a jitter puts a
     sign roughly every 4.7 m, which is what stops three of them stacking in one view
     while a third of the alley carries none. */
  const from = STOREFRONT.z[0]
  const stride = (STOREFRONT.z[1] - from) / NEON_SIGNS.count

  for (let index = 0; index < NEON_SIGNS.count; index++) {
    const wall: 'west' | 'east' = index % 2 === 0 ? 'west' : 'east'
    let z = from + stride * (index + 0.5) + (random() - 0.5) * stride * 0.5

    // Never over §2.1's vertical sign, which occupies the same band of the west wall.
    if (wall === 'west' && z > SHOWCASE_SIGN_Z[0] && z < SHOWCASE_SIGN_Z[1]) {
      z = z < -4 ? SHOWCASE_SIGN_Z[0] - 0.4 : SHOWCASE_SIGN_Z[1] + 0.4
    }

    const orientation: Orientation = index < NEON_SIGNS.vertical ? 'vertical' : 'horizontal'
    const text = DECORATIVE_SIGNAGE[
      (NEON_SIGNS.stringOffset + index) % DECORATIVE_SIGNAGE.length
    ] as string
    const characters = [...text].length

    const size: [number, number] =
      orientation === 'vertical'
        ? [
            NEON_SIGNS.verticalSize.width,
            characters * NEON_SIGNS.verticalSize.perChar + NEON_SIGNS.verticalSize.pad,
          ]
        : [
            characters * NEON_SIGNS.horizontalSize.perChar + NEON_SIGNS.horizontalSize.pad,
            NEON_SIGNS.horizontalSize.height,
          ]

    signs.push({
      index,
      wall,
      z,
      y: lerp(NEON_SIGNS.mountY, random()),
      projection: lerp(NEON_SIGNS.projection, random()),
      orientation,
      text,
      color: colors[index] as ColorToken,
      // §11.3 — indices 3 and 7, hand-picked in the brief, not chosen here.
      flickers: index === 3 || index === 7,
      size,
    })
  }

  return signs
}

export const NEON_SIGN_LIST: readonly NeonSign[] = build()

export type Banner = {
  index: number
  z: number
  text: string
  color: ColorToken
}

/** §3.5 — three cross-alley banners, continuing §11.4's index run from 9. */
export const BANNERS: readonly Banner[] = OVERHEAD.banner.z.map((z, index) => ({
  index,
  z,
  text: DECORATIVE_SIGNAGE[
    (OVERHEAD.banner.stringOffset + index) % DECORATIVE_SIGNAGE.length
  ] as string,
  // Warm, and the same rung as the station plate: cloth read through, not tube.
  color: (index % 2 === 0 ? 'sodium' : 'signWhite') as ColorToken,
}))
