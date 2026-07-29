/**
 * §3.6 — where the six vehicles are on the loop, and what each one is.
 *
 * Pure data, the same split as `lib/storefronts.ts` and `lib/signs.ts`: this decides the
 * lane, the variant, the starting offset and the underglow colour, and
 * `components/world/Traffic.tsx` turns that into geometry and moves it.
 *
 * **Nothing here is random.** Six vehicles is small enough to author, and the §3.3 and
 * §11.4 precedent is that a fixed list beats a seeded one whenever the list is short:
 * the street is identical on every load and can be checked against the brief by reading
 * it rather than by running it.
 *
 * **Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against,
 * and — §3.6 — nothing solid, because the whole street lies past §3's clamp.
 */

import { colorRun } from './signs'
import { TRAFFIC, type ColorToken, type VehicleVariant } from './world'

export type Lane = {
  index: number
  key: string
  centreZ: number
  /** +1 travels toward +X, −1 toward −X. */
  direction: 1 | -1
  speed: number
  /** Yaw applied to every vehicle in this lane, so its nose points the way it travels. */
  rotationY: number
}

export type Vehicle = {
  index: number
  lane: Lane
  /** Position within the lane, 0 being the car the hold position is anchored to. */
  slot: number
  variant: VehicleVariant
  /**
   * Distance along this lane's track at t = 0, measured from the track's start in the
   * lane's own direction of travel. Advancing it by `speed · t` and taking it modulo the
   * loop is the whole of the motion.
   */
  offset: number
  /** §3.6 — §4's ratio over six: 3 / 2 / 1 / 0. */
  glow: ColorToken
}

const { track, lanes, perLane, models } = TRAFFIC

const LANES: readonly Lane[] = lanes.map((lane, index) => ({
  index,
  key: lane.key,
  centreZ: lane.centreZ,
  direction: lane.direction as 1 | -1,
  speed: lane.speed,
  // A box's local +X is its nose; a −X-bound lane turns the whole vehicle round.
  rotationY: lane.direction === 1 ? 0 : Math.PI,
}))

/**
 * Track distance → world x.
 *
 * The two directions read the same track from opposite ends, which is what lets one
 * always-increasing distance drive both lanes without a sign scattered through the
 * frame loop.
 */
export function trackX(lane: Lane, distance: number): number {
  const wrapped = ((distance % track.loop) + track.loop) % track.loop
  return lane.direction === 1 ? track.x[0] + wrapped : track.x[1] - wrapped
}

/** The inverse, used once per lane to anchor §13's hold position. */
function distanceAtX(lane: Lane, x: number): number {
  return lane.direction === 1 ? x - track.x[0] : track.x[1] - x
}

function build(): Vehicle[] {
  const colors = colorRun(LANES.length * perLane)
  const vehicles: Vehicle[] = []

  /**
   * Interleaved by slot rather than filled lane by lane, so §4's ratio is spread across
   * both directions instead of handing one lane every magenta.
   */
  for (let slot = 0; slot < perLane; slot++) {
    for (const lane of LANES) {
      const source = lanes[lane.index] as (typeof lanes)[number]

      /* Car 0 sits at the lane's hold position; each car behind it is set back by the
         running sum of the gaps. The gaps sum to exactly the loop (§3.6), so the wrap
         between the last car and the first is a gap like any other — which is the whole
         reason no car can ever reach the one in front of it. */
      let back = 0
      for (let i = 0; i < slot; i++) back += source.gaps[i] as number

      const anchor = distanceAtX(lane, source.holdX)
      const offset = ((anchor - back) % track.loop + track.loop) % track.loop

      vehicles.push({
        index: vehicles.length,
        lane,
        slot,
        variant: source.variants[slot] as VehicleVariant,
        offset,
        glow: colors[vehicles.length] as ColorToken,
      })
    }
  }

  return vehicles
}

export const TRAFFIC_LANES = LANES
export const VEHICLES: readonly Vehicle[] = build()

/**
 * The no-overlap invariant, stated as a number rather than as a claim.
 *
 * Every gap in a lane, less the longest vehicle that lane carries — the clearance
 * between one car's tail and the next car's nose. Positive everywhere means no pair can
 * touch, at t = 0 or at any t after it, because within a lane every car moves at the
 * same speed and the gaps sum to the loop.
 *
 * Measured against `targetLength`, which is what §3.6 normalises every model to, so this
 * holds whatever the glTF files happen to contain.
 */
export function laneClearances(): { lane: string; clearances: number[] }[] {
  return lanes.map((lane) => {
    const longest = Math.max(
      ...lane.variants.map((key) => models[key as VehicleVariant].targetLength),
    )
    return {
      lane: lane.key,
      clearances: lane.gaps.map((gap) => Number((gap - longest).toFixed(3))),
    }
  })
}
