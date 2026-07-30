/**
 * §3.4 — where the fourteen storefronts go, and what each one is.
 *
 * Pure data. No three, no React, no DOM — this module answers the question "what does
 * the wall look like" and `components/world/Storefronts.tsx` answers "how is it drawn".
 * Keeping them apart is what makes the layout checkable: the unit list can be read and
 * measured against the brief without a renderer in the room.
 *
 * Deterministic throughout. No `Math.random()` — the alley is the same alley on every
 * load, which is the difference between a designed street and one that happens.
 */

import { NEON_SIGN_LIST } from './signs'
import { STOREFRONT, type ColorToken } from './world'

export type ShutterState = 'closed' | 'ajar' | 'open'

export type StorefrontUnit = {
  /** 0..13, in placement order: west wall north to south, then east. */
  index: number
  wall: 'west' | 'east'
  /** Centre of the unit along the alley. */
  z: number
  width: number
  state: ShutterState
  /** §3.2 — one of three shutter variants. */
  variant: number
  /** Which end of the unit the doorway takes: −1 toward −Z, +1 toward +Z. */
  doorSide: -1 | 1
  /** Null when the sign box is dark, which is what a shut shop's sign looks like. */
  signColor: ColorToken | null
  /**
   * False where a §3.5 neon sign already claims this stretch of wall. The unit keeps
   * everything else; it just does not also get a lightbox under the projecting sign.
   */
  signBox: boolean
  awning: boolean
}

const SEED = 0x570e17

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

/** Fisher-Yates against a supplied generator, so every shuffle here is reproducible. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = out[i] as T
    out[i] = out[j] as T
    out[j] = swap
  }
  return out
}

/** A joint narrower than this is not a joint, it is a coincidence. */
const MIN_JOINT = 0.15

type Segment = { start: number; end: number }

/**
 * Clear air either side of a §3.5 neon sign, along the alley.
 *
 * A projecting sign and a flush lightbox on the same stretch of wall never intersect —
 * the sign starts at 0.55 and the box stops at 0.49 — but they stack in the view from
 * the street and the box reads as a blank slab hung under the sign. The sign wins: it
 * carries a §11.4 string and the box carries nothing.
 */
/**
 * §3.5's clear air either side of a projecting sign, and §3.7's beside a lit box.
 *
 * Exported because §3.7's lantern audit needs the same number: two clearances that drift apart
 * are two rules, and only one of them would be the one in the brief.
 */
export const SIGN_CLEARANCE = 0.25
const NEON_CLEARANCE = SIGN_CLEARANCE

/** The wall minus the §2.1 / §2.2 / §2.3 slots, which no unit may enter. */
function segmentsFor(wall: 'west' | 'east'): Segment[] {
  const reserved = [...STOREFRONT.reserved[wall]].sort((a, b) => a[0] - b[0])
  const segments: Segment[] = []
  /* Annotated: `world.ts` is `as const`, so an unannotated cursor takes the literal type
     of the z start and rejects every advance. Same shape as `sizes` below. */
  let cursor: number = STOREFRONT.z[0]

  for (const [from, to] of reserved) {
    if (from > cursor) segments.push({ start: cursor, end: from })
    cursor = Math.max(cursor, to)
  }
  if (cursor < STOREFRONT.z[1]) segments.push({ start: cursor, end: STOREFRONT.z[1] })

  return segments
}

/**
 * Largest-remainder apportionment of `total` units across segments by length.
 *
 * Rounding each share independently loses or gains a unit depending on where the
 * fractions fall, and §3.2's count of 14 is not a target to land near.
 */
function apportion(segments: Segment[], total: number): number[] {
  const lengths = segments.map((s) => s.end - s.start)
  const sum = lengths.reduce((a, b) => a + b, 0)
  const exact = lengths.map((length) => (length / sum) * total)
  const counts = exact.map(Math.floor)

  let remaining = total - counts.reduce((a, b) => a + b, 0)
  const byRemainder = exact
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  for (const { i } of byRemainder) {
    if (remaining <= 0) break
    counts[i] = (counts[i] as number) + 1
    remaining--
  }

  return counts
}

/**
 * Widths for one segment, drawn from the five sizes so that they fit.
 *
 * Greedy with a look-ahead: each pick leaves room for every unit still to come at the
 * narrowest size plus a minimum joint. Without the look-ahead a run of wide units early
 * in a segment makes the last one impossible, and the failure is a unit overlapping the
 * reserved slot it was supposed to stop short of.
 */
function widthsFor(count: number, budget: number, random: () => number): number[] {
  const sizes: number[] = [...STOREFRONT.widths].sort((a, b) => a - b)
  const narrowest = sizes[0] as number
  const chosen: number[] = []

  /** What is left to spend on units, joints already set aside. */
  let pool = budget - (count + 1) * MIN_JOINT

  for (let i = 0; i < count; i++) {
    const slotsLeft = count - i
    /* Aim at the fair share rather than the largest that fits. Taking the largest is
       feasible at every step and still wrong: one 6.20 early in a 14.30 m segment
       leaves nothing but the narrowest size behind it, and the wall came out eight of
       fourteen at 3.60 — the exact pattern five sizes exist to avoid. */
    const target = pool / slotsLeft
    /* Feasibility is still the outer bound: never take so much that a later unit cannot
       reach the narrowest size. */
    const feasible = sizes.filter((size) => size <= pool - (slotsLeft - 1) * narrowest)
    const previous = chosen[chosen.length - 1]

    let candidates = feasible.filter((size) => size !== previous)
    if (candidates.length === 0) candidates = feasible
    if (candidates.length === 0) candidates = [narrowest]

    // Nearest to target, then a coin between the best two — enough jitter that the run
    // does not settle into an alternation, not so much that it front-loads again.
    candidates.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
    const width = candidates[Math.floor(random() * Math.min(2, candidates.length))] as number

    chosen.push(width)
    pool -= width
  }

  return chosen
}

type Placement = { wall: 'west' | 'east'; z: number; width: number }

function placeWall(wall: 'west' | 'east', random: () => number): Placement[] {
  const segments = segmentsFor(wall)
  const counts = apportion(segments, STOREFRONT.perWall)

  // The service gap goes in the longest segment, which is the only one with the slack
  // to give 1.80 m away without squeezing its units to the narrowest size.
  let gapSegment = 0
  segments.forEach((segment, i) => {
    const longest = segments[gapSegment] as Segment
    if (segment.end - segment.start > longest.end - longest.start) gapSegment = i
  })

  const placements: Placement[] = []

  segments.forEach((segment, segmentIndex) => {
    const count = counts[segmentIndex] as number
    if (count === 0) return

    const hasGap = segmentIndex === gapSegment && count > 1
    const length = segment.end - segment.start
    const budget = length - (hasGap ? STOREFRONT.serviceGap : 0)

    const widths = widthsFor(count, budget, random)
    const joint = (budget - widths.reduce((a, b) => a + b, 0)) / (count + 1)
    // Which joint widens into the service gap. Never the two end margins.
    const gapAfter = hasGap ? Math.floor(random() * (count - 1)) : -1

    let cursor = segment.start + joint
    widths.forEach((width, i) => {
      placements.push({ wall, z: cursor + width / 2, width })
      cursor += width + joint
      if (i === gapAfter) cursor += STOREFRONT.serviceGap
    })
  })

  return placements
}

/**
 * §4's neon ratio applied to the sign boxes: 55 / 30 / 12 / 3 over 14 units is 8 / 4 /
 * 2 / 0. Blue rounds away, which is what §4 means by *rare, distance signs only*.
 *
 * Returns one token per lit sign, in bucket order — the caller decides which units get
 * them. Within a bucket the two tokens alternate rather than repeating.
 */
function signColors(total: number): ColorToken[] {
  const shares = [0.55, 0.3, 0.12, 0.03]
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

  const out: ColorToken[] = []
  STOREFRONT.signPalette.forEach((bucket, i) => {
    const count = counts[i] as number
    for (let n = 0; n < count; n++) out.push(bucket[n % bucket.length] as ColorToken)
  })
  return out
}

/**
 * The fourteen units, resolved once at module load.
 *
 * Placement runs first and the per-unit properties are dealt afterwards, across both
 * walls at once. Dealing them per wall instead would put every open shutter on one side
 * whenever the counts did not divide evenly.
 */
function build(): StorefrontUnit[] {
  const random = mulberry32(SEED)
  const placements = [...placeWall('west', random), ...placeWall('east', random)]
  const total = placements.length

  const { closed, ajar, open } = STOREFRONT.states
  const states: ShutterState[] = [
    ...Array<ShutterState>(closed).fill('closed'),
    ...Array<ShutterState>(ajar).fill('ajar'),
    ...Array<ShutterState>(open).fill('open'),
  ].slice(0, total)
  const dealtStates = shuffle(states, random)

  const awningSlots = shuffle(
    placements.map((_, i) => i),
    random,
  ).slice(0, STOREFRONT.awning.count)
  const awnings = new Set(awningSlots)

  /* Which units lose their sign box to a §3.5 neon sign. Resolved before the lit signs
     are dealt, so a suppressed unit does not consume one of the seven — otherwise the
     alley quietly ships six lit boxes while every count in §3.4 still reads seven. */
  const doorSides = placements.map((_, i): -1 | 1 => (i % 2 === 0 ? -1 : 1))
  const keepsSignBox = placements.map((placement, i) => {
    const usable = placement.width - STOREFRONT.aperture.sideInset * 2
    const doorZ =
      placement.z +
      (doorSides[i] as number) * (usable / 2 - STOREFRONT.doorway.width / 2)
    const min = doorZ - STOREFRONT.signBox.width / 2
    const max = doorZ + STOREFRONT.signBox.width / 2

    return !NEON_SIGN_LIST.some((sign) => {
      if (sign.wall !== placement.wall) return false
      const half = sign.size[0] / 2 + NEON_CLEARANCE
      return sign.z - half < max && sign.z + half > min
    })
  })

  /* Lit signs: every non-closed unit first — an open shop with a dark sign reads as a
     mistake — then the balance dealt among the closed ones. */
  const hasBox = (i: number) => keepsSignBox[i] === true
  const openIndices = dealtStates
    .map((state, i) => ({ state, i }))
    .filter(({ state, i }) => state !== 'closed' && hasBox(i))
    .map(({ i }) => i)
  const closedIndices = shuffle(
    dealtStates
      .map((state, i) => ({ state, i }))
      .filter(({ state, i }) => state === 'closed' && hasBox(i))
      .map(({ i }) => i),
    random,
  )
  const litIndices = new Set([
    ...openIndices,
    ...closedIndices.slice(0, Math.max(0, STOREFRONT.litSignCount - openIndices.length)),
  ])

  const colors = signColors(litIndices.size)
  let colorCursor = 0

  return placements.map((placement, index) => {
    const state = dealtStates[index] as ShutterState
    const lit = litIndices.has(index)
    return {
      index,
      wall: placement.wall,
      z: placement.z,
      width: placement.width,
      state,
      variant: index % STOREFRONT.variants,
      doorSide: doorSides[index] as -1 | 1,
      signColor: lit ? ((colors[colorCursor++] ?? null) as ColorToken | null) : null,
      signBox: keepsSignBox[index] === true,
      awning: awnings.has(index),
    }
  })
}

export const STOREFRONT_UNITS: readonly StorefrontUnit[] = build()

/** Aperture width for a unit — the doorway takes one end, the shutter takes the rest. */
export function apertureWidth(unit: StorefrontUnit): number {
  const usable = unit.width - STOREFRONT.aperture.sideInset * 2
  return usable - STOREFRONT.doorway.width - STOREFRONT.doorGap
}

/** Centre of the doorway along the alley, at whichever end of the unit it took. */
export function doorwayZ(unit: StorefrontUnit): number {
  const usable = unit.width - STOREFRONT.aperture.sideInset * 2
  return unit.z + unit.doorSide * (usable / 2 - STOREFRONT.doorway.width / 2)
}

/** Centre of the shutter aperture — the remainder of the unit, opposite the doorway. */
export function apertureZ(unit: StorefrontUnit): number {
  const usable = unit.width - STOREFRONT.aperture.sideInset * 2
  return unit.z - unit.doorSide * (usable / 2 - apertureWidth(unit) / 2)
}

/** How far the shutter hangs below the aperture head, by state. */
export function shutterDrop(unit: StorefrontUnit): number {
  const full = STOREFRONT.aperture.headY - STOREFRONT.aperture.baseY
  if (unit.state === 'closed') return full
  if (unit.state === 'ajar') return full - STOREFRONT.ajarClearance
  return full - STOREFRONT.openClearance
}
