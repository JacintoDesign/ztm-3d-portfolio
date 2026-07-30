/**
 * §3.7 — where the street props are, and what each one is made of.
 *
 * Pure data, the same split as `lib/storefronts.ts`, `lib/signs.ts` and `lib/traffic.ts`:
 * this module answers *what stands where*, and `components/world/Props.tsx` answers *how
 * it is drawn*. Keeping them apart is what lets the alley be checked by reading a list
 * rather than by walking a render — which matters more here than anywhere else in the
 * world, because these are the first objects a visitor can bump into.
 *
 * Deterministic throughout. No `Math.random()`: §3.5's nine signs and §3.6's six vehicles
 * set the precedent that a short list is better authored than generated, and every
 * position below was placed against the §3.4 layout dumped from this same codebase.
 *
 * **Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against.
 *
 * ## The local frame
 *
 * Every part is authored in its prop's own frame: **+X along the prop's length, +Y up,
 * +Z out of the wall it stands against.** One frame for all of them, so a vending machine
 * on the west wall and one on the east are the same list of parts turned by their
 * placement — never the same list with two numbers swapped, which is how a prop ends up
 * mirrored on one side of an alley and nobody notices for a week.
 */

import type { Box } from './collision'
import { NEON_SIGN_LIST } from './signs'
import { SIGN_CLEARANCE, STOREFRONT_UNITS, doorwayZ } from './storefronts'
import { BOUNDS, LAYOUT, PROPS, STOREFRONT, type ColorToken } from './world'

/* ────────────────────────────────────────────────────────────────────────────
 * Shapes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The four geometries the whole prop set is drawn from.
 *
 * `cone` and `coneBand` are two tapers of the same cylinder: a band wrapped round a cone
 * has to share the cone's slope or it pokes through it, and §3.7 takes the band's radii
 * off the cone rather than authoring them.
 */
export type PrimitiveKey = 'box' | 'cylinder' | 'cone' | 'coneBand'

/**
 * The surfaces. Deliberately few — every one of these is a draw call (§15), so a colour
 * that earns its own material has to be doing work no existing one does.
 */
export type SurfaceKey =
  | 'concrete'
  | 'metalDark'
  | 'shutter'
  | 'void'
  | 'signWhite'
  | 'roadOrange'
  | 'crateKraft'
  | 'crateTimber'
  | 'binDrum'
  | 'vendingFront'
  | 'cartLamp'
  | 'lanternGlow'

export type Part = {
  primitive: PrimitiveKey
  surface: SurfaceKey
  /** Centre, in the prop's local frame. */
  position: readonly [number, number, number]
  /** Full extents for a box; for a cylinder, [diameter, height, diameter]. */
  scale: readonly [number, number, number]
  /** Local euler, XYZ order. Omitted where the part is square to its prop. */
  rotation?: readonly [number, number, number]
}

export type PropKind =
  | 'vendingMachine'
  | 'foodCart'
  | 'scooter'
  | 'crateStack'
  | 'cone'
  | 'barrier'
  | 'rubbishPoint'
  | 'standpipe'
  | 'utilityPole'
  | 'paperLantern'
  | 'guardrail'

export type Prop = {
  key: string
  kind: PropKind
  /**
   * The prop's origin on the ground, in world space.
   *
   * `y` is **the surface it stands on**, which is §3's kerb top for anything on the
   * pavement and 0 for anything in the carriageway — see `standingHeight`. It was 0 for
   * everything, which sank every wall prop 12 cm into the kerb it was meant to be
   * standing on.
   */
  position: readonly [number, number, number]
  /** About Y. Composed before the lean — see `lean`. */
  yaw: number
  /**
   * About the prop's own length axis, after the yaw. Scooters only.
   *
   * The distinction matters: rotating a scooter about its *length* tips it sideways onto
   * a side stand, which is the pose; rotating it about its width pulls a wheelie.
   */
  lean: number
  parts: readonly Part[]
  /** Local [alongLength, deep] on the ground, including any lean. */
  footprint: readonly [number, number]
  /** §12.4 — false for anything the visitor may walk through. */
  solid: boolean
  /** §7 — false for anything not standing on the ground. */
  decal: boolean
}

export type Side = 'west' | 'east'

/* ────────────────────────────────────────────────────────────────────────────
 * Placement helpers
 * ──────────────────────────────────────────────────────────────────────────── */

const WALL_X = LAYOUT.alley.x[1]
const { wallStandoff } = PROPS

/** Local +Z points out of the wall, so west faces +X and east faces −X. */
const yawFor = (side: Side): number => (side === 'west' ? Math.PI / 2 : -Math.PI / 2)

/**
 * World x for a prop of this depth standing `standoff` clear of the wall plane.
 *
 * The standoff is measured to the **back face**, not to the centre, which is the only
 * definition that keeps a deep prop and a shallow one both clear of the §3.4 plinth.
 */
function wallX(side: Side, depth: number, standoff: number = wallStandoff): number {
  const back = WALL_X - standoff
  return side === 'west' ? -back + depth / 2 : back - depth / 2
}

/** How far into the alley a wall prop of this depth reaches. Positive, a magnitude. */
export const reachX = (depth: number, standoff: number = wallStandoff): number =>
  WALL_X - standoff - depth

/**
 * §3 / §3.7 — which surface this prop stands on.
 *
 * **§3.7 sat every prop at `y = 0` while §3's kerb top is at 0.12**, so all twenty wall
 * props were sunk 12 cm into the pavement they were meant to be standing on. It was not
 * visible in any number: `y` was the ground and the ground was zero.
 *
 * The rule is stated once here and read by everything downstream, including §7's contact
 * decals — a decal at a flat 0.010 is 11 cm *under* a kerb. A prop is on the pavement if
 * its **whole** footprint is outboard of the kerb edge; anything straddling it is a fault
 * rather than a case to handle, and `audit()` says so.
 */
const KERB_INNER = LAYOUT.kerb.innerEdgeX

function standingHeight(x: number, yaw: number, footprint: readonly [number, number]): number {
  const inner = Math.abs(x) - halfExtents(yaw, footprint).halfX
  return inner >= KERB_INNER ? LAYOUT.kerb.height : 0
}

/**
 * The axis-aligned world footprint of a rotated rectangle.
 *
 * Local +X maps to (cos y, 0, −sin y) and local +Z to (sin y, 0, cos y), so each world
 * half-extent is the sum of both local half-extents projected onto it. For the ±90° wall
 * props this collapses to a swap; the cones and the barrier stand at their own angles and
 * need the general form.
 */
function halfExtents(
  yaw: number,
  footprint: readonly [number, number],
): { halfX: number; halfZ: number } {
  const halfLength = footprint[0] / 2
  const halfDepth = footprint[1] / 2
  const c = Math.abs(Math.cos(yaw))
  const s = Math.abs(Math.sin(yaw))

  return { halfX: halfLength * c + halfDepth * s, halfZ: halfLength * s + halfDepth * c }
}

function boxFor(prop: Prop): Box {
  const [x, , z] = prop.position
  const { halfX, halfZ } = halfExtents(prop.yaw, prop.footprint)

  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The parts of each object
 *
 * Built once at module load. Every list below is in the local frame described at the top
 * of this file, and none of them knows which wall it will end up on.
 * ──────────────────────────────────────────────────────────────────────────── */

const box = (
  surface: SurfaceKey,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation?: readonly [number, number, number],
): Part => ({ primitive: 'box', surface, position, scale, ...(rotation ? { rotation } : {}) })

const cyl = (
  surface: SurfaceKey,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation?: readonly [number, number, number],
): Part => ({ primitive: 'cylinder', surface, position, scale, ...(rotation ? { rotation } : {}) })

/**
 * §3.7 — §2.2's machine with the light off. See there for why that is the point.
 *
 * **Both front slabs stand proud of the body rather than flush with it**, and that is the
 * flicker fix. `face - proud / 2` put the panel's front face at exactly `depth / 2`, which
 * is exactly where the body's front face is: two coplanar surfaces, resolved differently
 * every frame as the camera moved past. `face + proud / 2` stands them in front instead —
 * §3.4's own trick for faking the shopfront recess, and this world never needs two faces
 * on one plane.
 */
function vendingMachineParts(): Part[] {
  const { size, kick, front, flap } = PROPS.vendingMachine
  const [length, depth, height] = size
  const face = depth / 2

  return [
    box('metalDark', [0, kick.height / 2, 0], [length, kick.height, depth]),
    box('shutter', [0, kick.height + (height - kick.height) / 2, 0], [length, height - kick.height, depth]),
    /* §2.2's lit panel, unlit — but painted. `vendingFront` carries §3.7's drinks rack in
       `map` only, at real plastic albedos: the machine was unreadable because this was
       `void` at 0.4% reflectance, which is §4.1's fault one object down. No emissive term
       anywhere on it; §2.2's machine is the one that glows and the one with a light. */
    box('vendingFront', [0, front.baseY + front.height / 2, face + front.proud / 2], [front.width, front.height, front.proud]),
    box('void', [0, flap.baseY + flap.height / 2, face + flap.proud / 2], [flap.width, flap.height, flap.proud]),
  ]
}

/** §3.7 — the one thing here that lights up, at §8.1's open-shutter rung. */
function foodCartParts(): Part[] {
  const { wheel, deck, worktop, post, canopy, lamp } = PROPS.foodCart

  const deckHeight = deck.y[1] - deck.y[0]
  const postHeight = post.y[1] - post.y[0]
  const postInsetX = canopy.length / 2 - 0.12
  const postInsetZ = canopy.depth / 2 - 0.12

  const parts: Part[] = [
    box('shutter', [0, deck.y[0] + deckHeight / 2, 0], [deck.length, deckHeight, deck.depth]),
    box('metalDark', [0, deck.y[1] + worktop.thickness / 2, 0], [worktop.length, worktop.thickness, worktop.depth]),
    box('shutter', [0, canopy.thickness / 2 + post.y[1], 0], [canopy.length, canopy.thickness, canopy.depth]),
    /* Faces down, under the canopy. §3.4's rule holds here too: the accent lives in the
       emissive term and the diffuse stays `void`, or the panel reads as orange paint. */
    box('cartLamp', [0, lamp.y, 0], [lamp.length, 0.02, lamp.depth]),
  ]

  for (const sx of [-1, 1] as const) {
    /* Rotated about **X**, not Z: a cylinder's axis is +Y, and X takes it to +Z — the
       cart's own width, which is where an axle goes. About Z it would lie along the
       cart's length instead, which is a roller, not a wheel. */
    parts.push(
      cyl('void', [sx * (deck.length / 2 - 0.28), wheel.radius, 0], [
        wheel.radius * 2,
        wheel.width,
        wheel.radius * 2,
      ], [Math.PI / 2, 0, 0]),
    )
    for (const sz of [-1, 1] as const) {
      parts.push(
        cyl('metalDark', [sx * postInsetX, post.y[0] + postHeight / 2, sz * postInsetZ], [
          post.radius * 2,
          postHeight,
          post.radius * 2,
        ]),
      )
    }
  }

  return parts
}

/**
 * A stack of 2 to 4, each crate turned a little off square and pushed a little off centre.
 *
 * The offsets are a fixed hand-authored run rather than a generator: four numbers used by
 * nine stacks reads as nine stacks that were put down by hand, and a seeded jitter reads
 * as noise. §3.3 and §11.4 make the same choice for the same reason.
 */
const CRATE_JITTER = [
  { x: 0.0, z: 0.0, yaw: 0.05 },
  { x: 0.06, z: -0.04, yaw: -0.09 },
  { x: -0.05, z: 0.03, yaw: 0.13 },
  { x: 0.03, z: 0.05, yaw: -0.04 },
] as const

/**
 * §4.2's four shades, cycling — and the *stack index* is part of the cycle key, so two
 * neighbouring stacks never come out the same way up.
 *
 * It was `i % 2` over two tokens that are 4.7% and 7.4% of the same blue-grey, which at
 * three metres through §5's fog is one colour with a rounding error. Four now: kraft,
 * timber, concrete, metal.
 */
const CRATE_SURFACES: readonly SurfaceKey[] = ['crateKraft', 'crateTimber', 'concrete', 'metalDark']

function crateStackParts(count: number, stack: number): Part[] {
  const [length, depth, height] = PROPS.crate.size
  const parts: Part[] = []

  for (let i = 0; i < count; i++) {
    const jitter = CRATE_JITTER[i % CRATE_JITTER.length] as (typeof CRATE_JITTER)[number]
    const surface = CRATE_SURFACES[(i + stack) % CRATE_SURFACES.length] as SurfaceKey
    parts.push(
      box(surface, [jitter.x, height / 2 + i * height, jitter.z], [length, height, depth], [0, jitter.yaw, 0]),
    )
  }

  return parts
}

/**
 * §3.7 — the cone, and the band's radii taken off the cone's own slope.
 *
 * A cone's taper is baked into its geometry and cannot be reached by a per-instance
 * scale, so the band is a **second geometry** rather than a squashed copy of the first.
 * Its two radii are read from the cone at the two heights the band sits between, plus
 * `proud` — which is the only way a collar around a slope cannot poke through it. Both
 * geometries are authored one unit tall and scaled in Y, so scaling never touches a
 * radius.
 */
const coneRadiusAt = (y: number): number => {
  const { baseRadius, topRadius, height } = PROPS.cone
  return baseRadius + (topRadius - baseRadius) * (y / height)
}

/** The two tapers `Props.tsx` builds its two cone geometries from. */
export const CONE_TAPERS = {
  cone: { top: PROPS.cone.topRadius, bottom: PROPS.cone.baseRadius },
  coneBand: {
    top: coneRadiusAt(PROPS.cone.band.y[1]) + PROPS.cone.band.proud,
    bottom: coneRadiusAt(PROPS.cone.band.y[0]) + PROPS.cone.band.proud,
  },
} as const

function coneParts(): Part[] {
  const { height, foot, band } = PROPS.cone
  const bandHeight = band.y[1] - band.y[0]

  return [
    box('shutter', [0, foot.thickness / 2, 0], [foot.size, foot.thickness, foot.size]),
    { primitive: 'cone', surface: 'roadOrange', position: [0, height / 2, 0], scale: [1, height, 1] },
    {
      primitive: 'coneBand',
      surface: 'signWhite',
      position: [0, band.y[0] + bandHeight / 2, 0],
      scale: [1, bandHeight, 1],
    },
  ]
}

function barrierParts(): Part[] {
  const { board, leg, footRail } = PROPS.barrier
  const splay = (leg.splayDeg * Math.PI) / 180
  const boardHeight = board.y[1] - board.y[0]

  return [
    box('roadOrange', [0, board.y[0] + boardHeight / 2, 0], [board.length, boardHeight, board.depth]),
    box('metalDark', [0, footRail.y, 0], [footRail.length, footRail.size, footRail.size]),
    ...([-1, 1] as const).map((s) =>
      box(
        'metalDark',
        [s * (board.length / 2 - 0.08), leg.height / 2, 0],
        [leg.size, leg.height, leg.size],
        [0, 0, s * splay],
      ),
    ),
  ]
}

/**
 * §3.7 — a galvanised drum, and it used to be a cylinder with a wider cylinder on top.
 *
 * **What identifies a rubbish drum is the hoops** — the rolled bands that stiffen the
 * sheet — plus a rim under the lid and something to lift it by. None of that is texture;
 * it is silhouette, which is why no amount of map on the old two cylinders would have
 * fixed it. Four cylinders go on, all in buckets this section already pays for, so the
 * whole identity costs **nothing**.
 *
 * The drum is the one part with a material of its own: `binDrum` is `metalDark` carrying
 * §3.4's grain at the `metal` class. `metalDark` is shared with thirty-nine other cylinders
 * in this alley, and a grain map on all of them would be §3.4's rule applied precisely
 * where §3.4 says not to apply it.
 */
function rubbishPointParts(): Part[] {
  const { drum, hoop, rim, lid, knob, sack } = PROPS.rubbishPoint
  const [sackLength, sackDepth, sackHeight] = sack.size
  const rimBase = drum.height

  return [
    cyl('binDrum', [0, drum.height / 2, 0], [drum.radius * 2, drum.height, drum.radius * 2]),
    ...hoop.at.map((fraction) =>
      cyl('concrete', [0, drum.height * fraction, 0], [hoop.radius * 2, hoop.height, hoop.radius * 2]),
    ),
    cyl('concrete', [0, rimBase + rim.height / 2, 0], [rim.radius * 2, rim.height, rim.radius * 2]),
    cyl('concrete', [0, rimBase + rim.height + lid.height / 2, 0], [lid.radius * 2, lid.height, lid.radius * 2]),
    cyl('metalDark', [0, rimBase + rim.height + lid.height + knob.height / 2, 0], [
      knob.radius * 2,
      knob.height,
      knob.radius * 2,
    ]),
    box('shutter', [drum.radius + sackLength / 2 - 0.02, sackHeight / 2, 0.03], [sackLength, sackHeight, sackDepth], [0, 0.12, 0]),
    box('shutter', [-(drum.radius + sackLength / 2 - 0.04), sackHeight / 2 - 0.04, -0.05], [sackLength * 0.86, sackHeight * 0.8, sackDepth * 0.9], [0, -0.2, 0]),
  ]
}

/**
 * §3.4's lit signs on one wall, as a z and a half-width.
 *
 * At module scope rather than inside `audit()`, because `build()` needs it too: a
 * standpipe's *length* is chosen against this list, so the placement and the check that
 * proves it are reading the same thing.
 */
export function litSignsOn(side: Side): { z: number; halfWidth: number; what: string }[] {
  return [
    ...STOREFRONT_UNITS.filter(
      (unit) => unit.wall === side && unit.signBox && unit.signColor !== null,
    ).map((unit) => ({
      z: doorwayZ(unit),
      halfWidth: STOREFRONT.signBox.width / 2,
      what: `unit ${unit.index}'s lit box`,
    })),
    ...NEON_SIGN_LIST.filter((sign) => sign.wall === side).map((sign) => ({
      z: sign.z,
      halfWidth: (sign.size[0] as number) / 2,
      what: `§3.5 sign ${sign.index}`,
    })),
  ]
}

/**
 * §3.7 — how tall this pipe may be, given what is on the wall beside it.
 *
 * **Thirteen of the twenty-two are derived from §3.4's joints, so they cannot be moved by
 * hand** — a seed change or a fifth unit width re-rolls every one of them. What they *can*
 * do is stop short. The tall run reaches 4.00 and a lit sign box occupies `y ∈ [2.85,
 * 3.55]`; the short run reaches 2.60 and therefore cannot cross one from any position at
 * all. So a pipe that would foul a sign takes the short length, and the alternation §3.7
 * asks for — *a wall of identical pipes is a fence, not a street* — carries on among the
 * rest.
 *
 * **Derived rather than dodged.** The alternative was moving five pipes, three of which are
 * generated and would come back the next time §3.4 re-rolls. This cannot come back: the
 * only way to foul a sign is to reach it.
 */
function standpipeTopY(side: Side, z: number, index: number): number {
  const alternating = PROPS.standpipe.topY[index % PROPS.standpipe.topY.length] as number
  if (alternating <= STOREFRONT.signBox.baseY) return alternating

  const clear = litSignsOn(side).every(
    (sign) =>
      Math.abs(sign.z - z) - sign.halfWidth - PROPS.standpipe.radius >= PROPS.signClearance,
  )
  return clear ? alternating : (PROPS.standpipe.topY[0] as number)
}

/** Two lengths alternating by index — a wall of identical pipes is a fence, not a street. */
function standpipeParts(topY: number): Part[] {
  const { radius, baseY, clamp } = PROPS.standpipe
  const height = topY - baseY

  return [
    cyl('metalDark', [0, baseY + height / 2, 0], [radius * 2, height, radius * 2]),
    ...[0.34, 0.72].map((fraction) =>
      box('metalDark', [0, baseY + height * fraction, -clamp.depth / 2 + radius], [
        clamp.size,
        clamp.thickness,
        clamp.depth,
      ]),
    ),
  ]
}

function utilityPoleParts(): Part[] {
  const { radius, height, crossarms } = PROPS.utilityPole

  return [
    cyl('concrete', [0, height / 2, 0], [radius * 2, height, radius * 2]),
    ...crossarms.map((arm) => box('concrete', [0, arm.y, 0], [arm.size, arm.size, arm.length])),
  ]
}

/**
 * §8.1's 1.30 rung, on a bracket off the wall.
 *
 * The arm sits at 3.70 rather than at head height, and that is not a look choice: §3.4's
 * sign boxes occupy `y ∈ [2.85, 3.55]` standing 0.14 proud, and an arm anywhere inside
 * that band drives straight through whichever ones it passes. 3.70 clears the tallest of
 * them by 0.15 and removes the constraint rather than dodging it fourteen times.
 */
function paperLanternParts(): Part[] {
  const { shade, arm, drop } = PROPS.paperLantern
  const armOut = arm.length / 2

  return [
    box('metalDark', [0, arm.y, armOut], [arm.size, arm.size, arm.length]),
    cyl('metalDark', [0, arm.y - drop.length / 2, arm.length], [drop.radius * 2, drop.length, drop.radius * 2]),
    cyl(
      'lanternGlow',
      [0, arm.y - drop.length - shade.height / 2, arm.length],
      [shade.radius * 2, shade.height, shade.radius * 2],
    ),
  ]
}

/**
 * §3.7 — across §3.1's opening, at the z §3's clamp and §12.4's radius agree on.
 *
 * Authored along local +X, so the placement below turns it across the alley like anything
 * else. Rails and posts are all one surface, which is what keeps the whole barrier inside
 * a bucket the rest of the alley already pays for.
 */
function guardrailParts(): Part[] {
  const { x, posts, post, rail } = PROPS.guardrail
  const run = x[1] - x[0]
  const parts: Part[] = []

  for (let i = 0; i < posts; i++) {
    const at = -run / 2 + (run * i) / (posts - 1)
    parts.push(box('metalDark', [at, post.height / 2, 0], [post.size, post.height, post.size]))
  }
  for (const y of rail.y) {
    parts.push(box('metalDark', [0, y, 0], [run, rail.height, rail.depth]))
  }

  return parts
}

/* ────────────────────────────────────────────────────────────────────────────
 * The placements
 *
 * Authored against the §3.4 layout this codebase generates, and checked by `audit()`
 * below rather than by eye. Uneven throughout — §3.7.
 * ──────────────────────────────────────────────────────────────────────────── */

type WallPlacement = { side: Side; z: number }

/**
 * §3.2 — four, all dark. Sides alternate so neither wall becomes the machine wall.
 *
 * **It was five, and the fifth stood at west `z = 20.3`.** That is 2.7 m from §3.1's bend,
 * and §2.1's screen is now 5.20 m of wall directly behind it: the machine and its neighbour's
 * awning were the two things standing between the visitor and the one content surface in the
 * world. Scenery in front of content loses — §2.4 gives the surroundings everything *except*
 * the three places content lives, and that has to include the air in front of them.
 */
const VENDING: readonly WallPlacement[] = [
  { side: 'east', z: -17.6 },
  { side: 'west', z: -13.6 },
  { side: 'east', z: 2.4 },
  { side: 'west', z: 7.4 },
]

/**
 * §3.7 — east wall at the far end, past §2.3's payphone.
 *
 * The last thing before the bend and the first warm thing in the alley that is not a
 * destination. §7's lantern light at `(−3.4, 3.4, +19)` lays its red pool directly
 * opposite, which is the contrast this placement is for.
 */
const CART: WallPlacement = { side: 'east', z: 19.0 }

/**
 * Lean sign: −1 tips the scooter toward the wall, +1 into the alley.
 *
 * **All four have their lamp on, and it was two.** A parked vehicle is scenery; a parked
 * vehicle with its light still on is somebody who has just stepped inside. The argument
 * for two was *a couple of them rather than a rule about scooters* — which is a good
 * sentence about **placement**, used to answer a question about **how many lamps are on**.
 * Four parked scooters in forty-four metres is already a rule about scooters; the lamps
 * were never what made it one. What two lit and two dark actually produced was two bikes
 * the eye finds and two it does not.
 *
 * *A car park* was the risk named at the time and it is real. The answer to it is the
 * **rung, not the count** — §8.1's `scooterHeadlamp` is 0.90 of §3.6's car lamp, because
 * four lamps at two metres is more light in the frame than two at the same value.
 */
const SCOOTERS: readonly (WallPlacement & { tip: -1 | 1 })[] = [
  { side: 'west', z: -18.3, tip: -1 },
  { side: 'east', z: -10.6, tip: 1 },
  { side: 'east', z: 8.4, tip: -1 },
  { side: 'west', z: 18.0, tip: 1 },
]

/**
 * §3.2's nine, in stacks of 2 to 4.
 *
 * Two of them carry a `standoff` of their own and stand well off the wall, which makes
 * them the only §3.2 line other than the cones that a visitor has to walk *around*. A
 * stack flat against the wall is inert against §3's clamp, exactly like §3.4's units.
 */
const CRATES: readonly (WallPlacement & { count: number; standoff?: number })[] = [
  { side: 'east', z: -20.4, count: 2 },
  { side: 'west', z: -15.3, count: 3 },
  { side: 'east', z: -7.3, count: 4, standoff: 0.6 },
  { side: 'east', z: -5.9, count: 2 },
  { side: 'west', z: 5.2, count: 3 },
  { side: 'west', z: 10.1, count: 2 },
  { side: 'east', z: 13.9, count: 3 },
  { side: 'east', z: 15.1, count: 2, standoff: 0.52 },
  { side: 'east', z: 16.2, count: 4 },
]

/**
 * §3.2's *traffic cone + barrier*, in open alley rather than against a wall.
 *
 * This cluster is the one place in the world where a solid object stands in the middle of
 * the walkable band with no clamp anywhere near it, which makes it the honest test of
 * §12.4's resolver — see §3.7.
 */
/**
 * §3.7 — **against the kerb, not down the middle of the road.**
 *
 * They were at `x = −1.30` and `−0.55`, which is the centre line of a 6.40 m carriageway:
 * roadworks cordoned off in the middle of a street with nothing in the middle of it. Real
 * cones stand where the thing being coned off is, and here that is the kerb. Each sits with
 * its outer edge `CONE_KERB_GAP` clear of the kerb face — **beside the pavement, never on
 * it**, which `audit()`'s `prop-straddles-kerb` rule also requires.
 *
 * They stay the honest test of §12.4's resolver that §3.7 wanted: `−2.97` puts a cone's
 * inner face at 2.79, well inside §3's ±3.60 clamp, so the eye is still stopped by the box
 * rather than by the clamp.
 */
const CONE_KERB_GAP = 0.05

/** Outer edge `CONE_KERB_GAP` clear of the kerb, given the prop's own half-width. */
const besideKerb = (halfX: number): number => -(KERB_INNER - CONE_KERB_GAP - halfX)

const CONES: readonly { x: number; z: number }[] = [
  { x: besideKerb(PROPS.cone.foot.size / 2), z: -8.1 },
  { x: besideKerb(PROPS.cone.foot.size / 2) + 0.24, z: -7.35 },
]

/* The barrier is turned 74°, so its half-width across the alley is neither its length nor
   its depth — `halfExtents` is the only thing that knows, and it is what the audit measures
   against too. */
const BARRIER_YAW_DEG = 74
const BARRIER = {
  x: besideKerb(
    halfExtents((BARRIER_YAW_DEG * Math.PI) / 180, [PROPS.barrier.board.length, 0.34]).halfX,
  ),
  z: -8.95,
  yawDeg: BARRIER_YAW_DEG,
}

/**
 * Two, and both moved by `audit()` rather than by eye.
 *
 * The east one started at −12.80 and stood across unit 8's doorway; the west one started
 * at +6.20, in a 3.76 m aperture that already held a crate stack and a vending machine
 * and could not take a third thing 1.44 m wide. Neither was visible in the numbers.
 */
const RUBBISH: readonly WallPlacement[] = [
  { side: 'east', z: -12.4 },
  /* §16 item 10 — −8.3 → −5.1. Closing §2.1's abandoned west reservation re-ran
     `placeWall`'s apportionment, and this drum landed across two doorways *and* on top of
     `standpipe:2`. Three findings from one deleted array entry, which is the blast radius
     §16 named written out as `audit()` output. */
  { side: 'west', z: -5.1 },
]

/**
 * §3.7's utility poles, on §3's gutter line. **Six became two, over four passes.**
 *
 * A pole is the only prop that reaches above 2.60, and a lit sign is the only thing on the
 * wall at that height — so where their `z` ranges meet, the pole runs down the middle of the
 * one thing on that wall anybody is looking at. `audit()` covered `pole-through-awning` from
 * the day this file was written and never covered this, because awnings *project* and sign
 * boxes are flush, so the two never looked like the same fault.
 *
 * What happened, in order, because the shape of it is the lesson:
 *
 * 1. Two poles were standing in front of §3.4 lit boxes. Found in a screenshot, not in a rule.
 * 2. Moving them put two under unit 12's awning — `pole-through-awning` fired twice on one
 *    edit, having never fired before, because excluding the bend from §3.4's awning draw had
 *    silently reshuffled which units got them.
 * 3. Moving *those* left the last east pole clearing §3.5's sign 1 by 0.72 m and passing every
 *    numeric check — and still visibly crossing it, because **a `z` gap is the wrong test**:
 *    the pole stands at `|x| = 3.72` and the sign projects to `|x| = 3.78`, so they share the
 *    same depth and the parallax crosses them from anywhere but square-on.
 * 4. The two positions that satisfied *that* landed on `rubbish:0` and `scooter:1`.
 *
 * **Four `audit()` failures on four consecutive edits is the wall saying it has no room**, and
 * the honest response is to take the count down rather than keep fitting. A prop shuffled five
 * times to satisfy rules it keeps breaking was never placed, only fitted.
 *
 * The lesson belongs to the audit rather than to the poles. `pole-through-sign-box` sat in this
 * comment as a full derivation for two passes while the fault it describes shipped twice; every
 * rule in `audit()` that is actually *code* has caught something nobody was looking for. **A
 * placement rule that only lives in a comment is a rule that has not been checked.** It is code
 * now — see `audit()` — and §3.7 carries the 1.30 m derivation.
 */
const POLES: readonly WallPlacement[] = [
  { side: 'west', z: -16.1 },
  { side: 'east', z: -9.05 },
]

/**
 * §3.2's eleven, above §3.4's sign boxes.
 *
 * Placed clear of the §3.5 signs that share their height band — signs 1, 2, 3 and 5 reach into
 * `y ∈ [3.000, 3.360]` where the shades actually hang — **and clear of §3.4's lit sign boxes**,
 * which sit at `y ∈ [2.85, 3.55]` and so contain the shade's whole height. `audit()` checks both.
 */
const LANTERNS: readonly WallPlacement[] = [
  { side: 'east', z: -19.6 },
  { side: 'west', z: -18.9 },
  /* §3.4 — −13.2 → −13.45. Unit 1's lit box moved 0.12 m when §3.4's doorway stopped being
     placed by its opening, and this lantern was standing 1.030 m from it against a required
     1.035. Five millimetres, and it is exactly the case §3.7 predicted when it wrote that
     §3.4's layout is *generated* and the next collision would arrive unannounced. It arrived
     unannounced and `audit()` announced it. */
  { side: 'west', z: -13.45 },
  { side: 'east', z: -11.9 },
  /* §16 item 10 — −7.4 → −6.0. Unit 2's lit box arrived at −7.43 when the west wall
     re-rolled, three centimetres from where this shade was hanging. */
  { side: 'west', z: -6.0 },
  { side: 'east', z: -2.2 },
  /* §3.7 — 2.6 → 0.85 and 12.6 → 10.75. At their old z these two hung 65 mm in front of a
     §3.4 lit sign box and dead centre on it vertically (shade centre y 3.18 against box centre
     3.20), so they blanked the middle of a painted face — nothing intersected, it was pure
     occlusion. 0.85 puts the first over the shutter aperture of the one OPEN shop in the alley,
     which is a better place for a paper lantern than in front of a sign anyway. The second had
     to go down rather than up: the gap between the box edge and §2.3's payphone slot is 0.105 m
     wide. Both off-round, per this section's "nothing is evenly spaced". */
  /* §16 item 10 — 0.85 → −0.25 and 10.75 → 9.5, for the same reason: the boxes moved. Both
     are *below* their new box rather than above it, and that is not a coin toss — the
     forbidden span either side of a lit box is 1.035 m, and above each of these there is a
     second box (3.37 and, at 11.73, §2.3's reserved slot) that closes the gap entirely. */
  { side: 'west', z: -0.25 },
  { side: 'east', z: 8.6 },
  { side: 'west', z: 9.5 },
  { side: 'east', z: 16.8 },
  { side: 'west', z: 18.2 },
]

/**
 * §3.2's twenty-two. Thirteen are **derived** from §3.4's joints — where a downpipe
 * between two buildings actually runs, and uneven for free because §3.4 generated them —
 * and nine are authored into unit faces to make up the count.
 */
const EXTRA_PIPES: readonly WallPlacement[] = [
  { side: 'west', z: -19.8 },
  { side: 'east', z: -19.1 },
  { side: 'west', z: -12.3 },
  { side: 'east', z: -12.0 },
  { side: 'west', z: 0.2 },
  { side: 'east', z: 3.6 },
  { side: 'east', z: 10.2 },
  { side: 'west', z: 12.1 },
  /* §3.4 — 16.4 → 15.35. Unit 6's doorway landed at 16.32 when the west wall re-rolled, so
     this pipe was running down the middle of a door: 0.08 m off its centre. `audit()` never
     had a word for it — `prop-blocks-doorway` tests the *footprint* against the jambs and a
     0.11 m pipe standing 0.06 m clear of the frame face genuinely does not block anything.
     It is an occlusion, like the lantern rule, and 15.35 puts it where a downpipe belongs
     anyway: in the 2.85 m joint between units 5 and 6, past the pier. */
  { side: 'west', z: 15.35 },
]

/** The §3.4 joints, per wall, excluding the three §2 slots no unit may enter. */
function jointAnchors(): WallPlacement[] {
  const out: WallPlacement[] = []

  for (const side of ['west', 'east'] as const) {
    const units = STOREFRONT_UNITS.filter((unit) => unit.wall === side).sort((a, b) => a.z - b.z)
    const reserved = STOREFRONT.reserved[side]
    let cursor: number = STOREFRONT.z[0]

    const consider = (from: number, to: number) => {
      if (to - from < 0.12) return
      const centre = (from + to) / 2
      // A joint that *is* a reserved slot belongs to §2, not to a downpipe.
      if (reserved.some(([lo, hi]) => centre > lo && centre < hi)) return
      out.push({ side, z: centre })
    }

    for (const unit of units) {
      consider(cursor, unit.z - unit.width / 2)
      cursor = unit.z + unit.width / 2
    }
    consider(cursor, STOREFRONT.z[1])
  }

  return out
}

/* ────────────────────────────────────────────────────────────────────────────
 * Assembly
 * ──────────────────────────────────────────────────────────────────────────── */

function build(): Prop[] {
  const props: Prop[] = []

  /**
   * Every call site below writes `position: [x, 0, z]`, and this is where the 0 becomes
   * the surface the prop is actually standing on.
   *
   * **Gated on `decal`, which is this file's existing name for *stands on the ground*.**
   * A lantern hangs off a wall at 3.46 m and a standpipe is clamped to one; raising either
   * by a kerb height would be raising something that is not on the kerb. The two sets are
   * the same set, so it is read here rather than duplicated as a second flag that could
   * disagree with the first.
   */
  const add = (prop: Omit<Prop, 'key'> & { key: string }) => {
    const [x, , z] = prop.position
    const y = prop.decal ? standingHeight(x, prop.yaw, prop.footprint) : 0
    props.push({ ...prop, position: [x, y, z] })
  }

  const vendingParts = vendingMachineParts()
  VENDING.forEach(({ side, z }, i) => {
    const [length, depth] = PROPS.vendingMachine.size
    add({
      key: `vending:${i}`,
      kind: 'vendingMachine',
      position: [wallX(side, depth), 0, z],
      yaw: yawFor(side),
      lean: 0,
      parts: vendingParts,
      footprint: [length, depth],
      solid: true,
      decal: true,
    })
  })

  {
    const [length, depth] = PROPS.foodCart.size
    add({
      key: 'foodCart',
      kind: 'foodCart',
      position: [wallX(CART.side, depth), 0, CART.z],
      yaw: yawFor(CART.side),
      lean: 0,
      parts: foodCartParts(),
      footprint: [length, depth],
      solid: true,
      decal: true,
    })
  }

  SCOOTERS.forEach(({ side, z, tip }, i) => {
    const [length, depth, height] = PROPS.scooter.size
    const lean = (PROPS.scooter.leanDeg * Math.PI) / 180
    add({
      key: `scooter:${i}`,
      kind: 'scooter',
      position: [wallX(side, depth), 0, z],
      yaw: yawFor(side),
      lean: tip * lean,
      /* §3.7 — **no parts, and that is the point.** The scooter is a glTF model now, and
         `Props.tsx` draws it from `PROPS.scooter.model` rather than from this list. What
         stays here is everything about *where it stands*, which is this file's job and is
         the same whether the mesh is five boxes or 1 665 triangles. */
      parts: [],
      // The lean lays the scooter over, so its footprint grows by the height it loses.
      footprint: [length, depth + height * Math.sin(lean)],
      solid: true,
      decal: true,
    })
  })

  CRATES.forEach(({ side, z, count, standoff }, i) => {
    const [length, depth] = PROPS.crate.size
    // The jitter above pushes crates off centre, so the footprint is not the crate.
    const footprint = [length + 0.12, depth + 0.1] as const
    add({
      key: `crate:${i}`,
      kind: 'crateStack',
      position: [wallX(side, footprint[1], standoff), 0, z],
      yaw: yawFor(side),
      lean: 0,
      parts: crateStackParts(count, i),
      footprint,
      solid: true,
      decal: true,
    })
  })

  const cone = coneParts()
  CONES.forEach(({ x, z }, i) => {
    const { foot } = PROPS.cone
    add({
      key: `cone:${i}`,
      kind: 'cone',
      position: [x, 0, z],
      yaw: 0,
      lean: 0,
      parts: cone,
      footprint: [foot.size, foot.size],
      solid: true,
      decal: true,
    })
  })

  add({
    key: 'barrier',
    kind: 'barrier',
    position: [BARRIER.x, 0, BARRIER.z],
    yaw: (BARRIER.yawDeg * Math.PI) / 180,
    lean: 0,
    parts: barrierParts(),
    footprint: [PROPS.barrier.board.length, 0.34],
    solid: true,
    decal: true,
  })

  const rubbish = rubbishPointParts()
  RUBBISH.forEach(({ side, z }, i) => {
    const { drum, sack } = PROPS.rubbishPoint
    add({
      key: `rubbish:${i}`,
      kind: 'rubbishPoint',
      position: [wallX(side, drum.radius * 2), 0, z],
      yaw: yawFor(side),
      lean: 0,
      parts: rubbish,
      footprint: [drum.radius * 2 + (sack.size[0] as number) * 2, drum.radius * 2],
      solid: true,
      decal: true,
    })
  })

  POLES.forEach(({ side, z }, i) => {
    const { x, radius } = PROPS.utilityPole
    add({
      key: `pole:${i}`,
      kind: 'utilityPole',
      position: [side === 'west' ? -x : x, 0, z],
      yaw: yawFor(side),
      lean: 0,
      parts: utilityPoleParts(),
      footprint: [radius * 2, radius * 2],
      solid: true,
      decal: true,
    })
  })

  const lantern = paperLanternParts()
  LANTERNS.forEach(({ side, z }, i) => {
    add({
      key: `lantern:${i}`,
      kind: 'paperLantern',
      // Mounted on §3.4's frame face, not on the wall behind it.
      position: [side === 'west' ? -(WALL_X - STOREFRONT.aperture.recess) : WALL_X - STOREFRONT.aperture.recess, 0, z],
      yaw: yawFor(side),
      lean: 0,
      parts: lantern,
      footprint: [PROPS.paperLantern.shade.radius * 2, PROPS.paperLantern.arm.length],
      // §3.2 — not solid, and nothing hangs low enough to want a decal.
      solid: false,
      decal: false,
    })
  })

  const pipes = [...jointAnchors(), ...EXTRA_PIPES]
  pipes.forEach(({ side, z }, i) => {
    const { x, radius, solidCount } = PROPS.standpipe
    add({
      key: `standpipe:${i}`,
      kind: 'standpipe',
      position: [side === 'west' ? -x : x, 0, z],
      yaw: yawFor(side),
      lean: 0,
      parts: standpipeParts(standpipeTopY(side, z, i)),
      /* The pipe only, not its clamps: the clamps reach back *toward* the wall, and a
         symmetric footprint that included them would grow the box toward the visitor
         instead — 0.10 m of blocking in the one direction the clamps do not occupy. */
      footprint: [radius * 2, radius * 2],
      /* §3.2 — 12 of 22. Every one of them is inert against §3's clamp, exactly like
         §3.4's units: a pipe at 4.09 puts its inner face at 4.035 and the eye has already
         stopped at 3.60. They go on because §12.4 asks for boxes as objects are placed. */
      solid: i < solidCount,
      decal: false,
    })
  })

  {
    const { z, x } = PROPS.guardrail
    add({
      key: 'guardrail',
      kind: 'guardrail',
      position: [(x[0] + x[1]) / 2, 0, z],
      // Local +X runs along the rail, which here runs across the alley.
      yaw: 0,
      lean: 0,
      parts: guardrailParts(),
      footprint: [x[1] - x[0], PROPS.guardrail.post.size],
      solid: true,
      decal: false,
    })
  }

  return props
}

export const STREET_PROPS: readonly Prop[] = build()

/** §12.4 — one box per solid prop, in the order the props were placed. */
export const PROP_BOXES: readonly Box[] = STREET_PROPS.filter((prop) => prop.solid).map(boxFor)

/* ────────────────────────────────────────────────────────────────────────────
 * The proof
 * ──────────────────────────────────────────────────────────────────────────── */

export type AuditFinding = { rule: string; detail: string }

/**
 * *"Make sure that there are no collisions"* — stated as a list of findings rather than
 * as a claim.
 *
 * Seven rules, each of which has a failure that is invisible in a diff and obvious once
 * you walk into it:
 *
 * 1. **No two props overlap.** Two AABBs sharing space is one prop growing out of another.
 * 2. **No prop stands in a doorway.** §3.4's doorways are the one part of the wall that
 *    has to stay clear, because a vending machine across one reads as a mistake.
 * 3. **No prop enters a §2 slot.** The three content surfaces own their stretches of wall
 *    and nothing may be parked in front of one.
 * 4. **No utility pole stands in front of an awning.** The poles are the only prop that
 *    reaches above 2.60, and the awnings are the only thing out there at that height.
 * 5. **Nothing tall stands within `signClearance` of a lit sign.** The same clash against
 *    the other thing up there — see §3.7, and see `POLES` for what it cost to leave this
 *    one as a comment for two passes, and `mast-through-sign-box` below for what it cost
 *    to write it about poles when the next thing to break it was a standpipe.
 * 6. **No lantern hangs in front of a §3.5 sign or a lit §3.4 box.** Occlusion rather
 *    than intersection: nothing touches and the shade blanks the middle of a painted face.
 * 7. **No prop straddles §3's kerb edge.** A prop stands on the pavement or in the road,
 *    at one height, and anything overhanging is standing on a surface that is not under
 *    half of it.
 *
 * Runs at module load in development. Empty is the pass.
 */
export function audit(): AuditFinding[] {
  const findings: AuditFinding[] = []
  const solid = STREET_PROPS.filter((prop) => prop.solid)
  const boxes = solid.map(boxFor)

  const overlaps = (a: Box, b: Box) =>
    a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ

  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = boxes[i] as Box
      const b = boxes[j] as Box
      if (!overlaps(a, b)) continue
      findings.push({
        rule: 'prop-overlaps-prop',
        detail: `${(solid[i] as Prop).key} overlaps ${(solid[j] as Prop).key}`,
      })
    }
  }

  /* A prop only fouls a doorway if it is deep enough to reach the jambs at 0.45 proud.
     Anything shallower stands clear of the recess and in front of a shut door, which is
     what a real alley looks like. */
  const doorClearance = STOREFRONT.doorway.width / 2 + 0.2
  for (const prop of STREET_PROPS) {
    if (!prop.solid || prop.kind === 'guardrail') continue
    const side: Side = prop.position[0] < 0 ? 'west' : 'east'
    const box = boxFor(prop)
    const wallGap = WALL_X - Math.max(Math.abs(box.minX), Math.abs(box.maxX))
    if (wallGap > STOREFRONT.doorway.recess) continue

    for (const unit of STOREFRONT_UNITS) {
      if (unit.wall !== side) continue
      const door = doorwayZ(unit)
      if (box.minZ < door + doorClearance && box.maxZ > door - doorClearance) {
        findings.push({
          rule: 'prop-blocks-doorway',
          detail: `${prop.key} at z ${prop.position[2]} blocks unit ${unit.index}'s door at ${door.toFixed(2)}`,
        })
      }
    }
  }

  for (const prop of STREET_PROPS) {
    if (prop.kind === 'guardrail') continue
    const side: Side = prop.position[0] < 0 ? 'west' : 'east'
    const box = boxFor(prop)
    for (const [lo, hi] of STOREFRONT.reserved[side]) {
      if (box.minZ < hi && box.maxZ > lo) {
        findings.push({
          rule: 'prop-in-reserved-slot',
          detail: `${prop.key} enters the §2 slot [${lo}, ${hi}] on the ${side} wall`,
        })
      }
    }
  }

  const awningReach = WALL_X - STOREFRONT.aperture.recess - STOREFRONT.awning.depth
  for (const prop of STREET_PROPS) {
    if (prop.kind !== 'utilityPole') continue
    const side: Side = prop.position[0] < 0 ? 'west' : 'east'
    if (Math.abs(prop.position[0]) - PROPS.utilityPole.radius > WALL_X - STOREFRONT.aperture.recess) continue
    if (Math.abs(prop.position[0]) + PROPS.utilityPole.radius < awningReach) continue

    for (const unit of STOREFRONT_UNITS) {
      if (!unit.awning || unit.wall !== side) continue
      const box = boxFor(prop)
      if (box.minZ < unit.z + unit.width / 2 && box.maxZ > unit.z - unit.width / 2) {
        findings.push({
          rule: 'pole-through-awning',
          detail: `${prop.key} at z ${prop.position[2]} passes through unit ${unit.index}'s awning`,
        })
      }
    }
  }

  /**
   * §3.7 — **nothing tall within `signClearance` of a lit sign's edge, on the same wall.**
   *
   * It is deliberately *not* an intersection test: a pole at `|x| = 3.72` and a §3.4 sign
   * box facing `|x| = 4.01` never touch, and from anywhere but square-on the 0.29 m between
   * them is nothing — the mast is simply drawn down the middle of the sign. §3.5's signs
   * are the harder case and would fail an intersection test *too*, since they project to
   * `|x| = 3.78`, inside a pole's own diameter.
   *
   * **This was `kind === 'utilityPole'` and that is why it shipped a fault it was written
   * to catch.** The thing crossing unit 6's `neonPink` box was a **standpipe** — `|x| =
   * 4.09`, which is 0.08 m in *front* of the sign face, closer than a pole ever gets — and
   * the rule never looked at it. Every number in the rule was right. **A rule scoped to the
   * example that produced it is a rule that catches that example**, so it now asks the two
   * questions that actually matter: does this prop reach into the sign's height band, and
   * does it stand near enough to the sign's own depth to be read against it.
   *
   * `mastReach` is the top of the prop's tallest part, taken from the part list rather than
   * from `kind`, so a new tall prop is covered the day it is added.
   *
   * **Lit signs only**, both here and in the brief: an unlit §3.4 box is `shutter` with no
   * emissive term, and a mast in front of a dark slab on a dark wall cannot be seen.
   */
  /** Top of this prop's tallest part, in world y. */
  const mastReach = (prop: Prop): number =>
    prop.parts.reduce(
      (top, part) => Math.max(top, prop.position[1] + part.position[1] + part.scale[1] / 2),
      0,
    )

  /**
   * How near a mast has to be to a sign's own depth before the two read as one object.
   *
   * A §3.4 box faces 4.01 and a §3.5 sign projects to 3.78; a pole stands at 3.72 and a
   * standpipe at 4.09. **All four are inside half a metre of each other**, which is the
   * point — at that separation nothing is behind anything, it is all one plane with a
   * stripe down it. Props further out than this are in the alley rather than on the wall
   * and pass in front of a sign the way a scooter does, which is depth, not a fault.
   */
  const MAST_DEPTH_BAND = 0.5

  for (const prop of STREET_PROPS) {
    /* Lanterns reach into the band and have a rule of their own two below — a shade hanging
       on an arm and blanking the middle of a painted face is occlusion, and it is measured
       against `SIGN_CLEARANCE` plus the shade's radius. This rule is about a vertical run
       drawn *down* a sign. Two rules with two clearances over one object would be one rule
       nobody could reason about. */
    if (prop.kind === 'paperLantern') continue

    const side: Side = prop.position[0] < 0 ? 'west' : 'east'
    if (mastReach(prop) <= STOREFRONT.signBox.baseY) continue

    const { halfX } = halfExtents(prop.yaw, prop.footprint)
    const centre = Math.abs(prop.position[0])
    if (Math.abs(centre - (WALL_X - STOREFRONT.aperture.recess - STOREFRONT.signBox.proud)) > MAST_DEPTH_BAND) {
      continue
    }

    for (const sign of litSignsOn(side)) {
      const gap = Math.abs(sign.z - prop.position[2]) - sign.halfWidth - halfX
      if (gap >= PROPS.signClearance) continue
      findings.push({
        rule: 'mast-through-sign-box',
        detail: `${prop.key} at z ${prop.position[2]} leaves ${gap.toFixed(2)} m of air beside ${sign.what} at ${sign.z.toFixed(2)} — wants ${PROPS.signClearance}`,
      })
    }
  }

  /**
   * §3 / §3.7 — **no prop straddles the kerb edge.**
   *
   * A prop is either on the pavement or in the road; `standingHeight` picks one height for
   * the whole thing, so anything overhanging the edge is standing on a surface that is not
   * under half of it. §3 derives the kerb's width from the deepest wall prop precisely so
   * this rule can hold, and this is what makes that derivation load-bearing rather than a
   * sentence: a future prop deeper than 1.00 fails here instead of quietly hanging over.
   *
   * **The guardrail is exempt and it is the only one.** §3.7 runs it across §3.1's opening
   * from `x = 0.90` to the east frame at 4.15, so it crosses the kerb by design — it is a
   * barrier spanning the mouth, not an object standing somewhere.
   */
  for (const prop of STREET_PROPS) {
    if (prop.kind === 'guardrail' || !prop.decal) continue
    const { halfX } = halfExtents(prop.yaw, prop.footprint)
    const inner = Math.abs(prop.position[0]) - halfX
    const outer = Math.abs(prop.position[0]) + halfX
    if (inner >= KERB_INNER || outer <= KERB_INNER) continue
    findings.push({
      rule: 'prop-straddles-kerb',
      detail: `${prop.key} spans |x| ${inner.toFixed(2)}–${outer.toFixed(2)} across the kerb edge at ${KERB_INNER.toFixed(2)}`,
    })
  }

  /* §3.5's signs share the lanterns' height band, and a shade inside one of their z spans
     is a lantern growing out of a neon sign. Not a collision the player can feel — one
     only a screenshot from the right angle would ever show. */
  const { shade, arm, drop } = PROPS.paperLantern
  const shadeTop = arm.y - drop.length
  const shadeBottom = shadeTop - shade.height
  for (const prop of STREET_PROPS) {
    if (prop.kind !== 'paperLantern') continue
    const side: Side = prop.position[0] < 0 ? 'west' : 'east'
    for (const sign of NEON_SIGN_LIST) {
      if (sign.wall !== side) continue
      const signTop = sign.y + (sign.size[1] as number) / 2
      const signBottom = sign.y - (sign.size[1] as number) / 2
      if (signBottom > shadeTop || signTop < shadeBottom) continue

      const halfZ = (sign.size[0] as number) / 2 + shade.radius + 0.1
      if (Math.abs(sign.z - prop.position[2]) < halfZ) {
        findings.push({
          rule: 'lantern-in-neon-sign',
          detail: `${prop.key} at z ${prop.position[2]} intersects sign ${sign.index} at ${sign.z.toFixed(2)}`,
        })
      }
    }
  }

  /* §3.7 — a lantern hanging in front of a §3.4 lit sign box. The fifth rule above catches a
     lantern inside a §3.5 sign; this is the same fault against the other thing at that height,
     and it matters more, because §3.4's layout is *generated*: a seed change or a fifth unit
     width silently re-rolls every box z and the next collision arrives unannounced. Two were
     found by eye rather than by this rule, which is exactly the gap §16.7 recorded when audit()
     moved three props before anything was drawn. */
  for (const prop of STREET_PROPS) {
    if (prop.kind !== 'paperLantern') continue
    const side: Side = prop.position[0] < 0 ? 'west' : 'east'
    for (const unit of STOREFRONT_UNITS) {
      if (unit.wall !== side) continue
      if (!unit.signBox || unit.signColor === null) continue

      const boxTop = STOREFRONT.signBox.baseY + STOREFRONT.signBox.height
      if (STOREFRONT.signBox.baseY > shadeTop || boxTop < shadeBottom) continue

      const halfZ = STOREFRONT.signBox.width / 2 + shade.radius + SIGN_CLEARANCE
      if (Math.abs(doorwayZ(unit) - prop.position[2]) < halfZ) {
        findings.push({
          rule: 'lantern-over-sign-box',
          detail: `${prop.key} at z ${prop.position[2]} occludes unit ${unit.index}'s lit box at ${doorwayZ(unit).toFixed(2)}`,
        })
      }
    }
  }

  return findings
}

/**
 * Which boxes can actually stop the visitor, and which are inert against §3's clamp.
 *
 * The companion to `audit()`: that one proves nothing intersects, this one answers the
 * question §3.4 left hanging. Every AABB in the world before §3.7 was inert by
 * construction — the clamp had already stopped the eye 0.13 m short of the deepest
 * storefront — and this is the list that shows that is no longer true.
 *
 * `fires` is one test on the whole box rather than one per axis, and it has to be: an
 * earlier version picked the axis by comparing the box's two extents, which for a square
 * footprint — every pole, every cone, every standpipe — is decided by float noise in
 * `cos(π/2)` and reported six poles as blocking on the wrong axis. **The resolver can
 * only ever move the eye if the box, grown by the radius, overlaps the region the eye is
 * allowed to occupy.** That is the condition, stated once, with no axis in it.
 */
export function clampReport(): {
  key: string
  /** How far into the alley the box reaches, as a magnitude in x. */
  reach: number
  /** Where the 0.32 radius would stop the eye approaching it head-on in x. */
  stopsAt: number
  fires: boolean
}[] {
  const r = BOUNDS.playerRadius

  return STREET_PROPS.filter((prop) => prop.solid).map((prop) => {
    const box = boxFor(prop)
    const inner = Math.min(Math.abs(box.minX), Math.abs(box.maxX))

    return {
      key: prop.key,
      reach: Number(inner.toFixed(3)),
      stopsAt: Number((inner - r).toFixed(3)),
      fires:
        box.minX - r < BOUNDS.x[1] &&
        box.maxX + r > BOUNDS.x[0] &&
        box.minZ - r < BOUNDS.z[1] &&
        box.maxZ + r > BOUNDS.z[0],
    }
  })
}

/** §4 — every token these props draw with, for checking the palette is not exceeded. */
export const PROP_TOKENS: Readonly<Record<SurfaceKey, ColorToken>> = {
  concrete: 'concrete',
  metalDark: 'metalDark',
  shutter: 'shutter',
  void: 'void',
  signWhite: 'signWhite',
  roadOrange: PROPS.cone.color,
  crateKraft: 'crateKraft',
  crateTimber: 'crateTimber',
  /* §3.7 — `metalDark` carrying §3.4's grain at the `metal` class. The colour is the same;
     the material is not, which is why it is a surface of its own. */
  binDrum: PROPS.rubbishPoint.drumColor,
  /* §3.7 — white, because the painted rack *is* the albedo. Every other surface here
     multiplies a §4 token by a map; this one has no token to multiply. */
  vendingFront: 'signWhite',
  cartLamp: PROPS.foodCart.lamp.color,
  lanternGlow: PROPS.paperLantern.color,
}
