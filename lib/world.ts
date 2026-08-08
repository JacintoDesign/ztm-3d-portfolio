/**
 * lib/world.ts — the typed mirror of WORLD_BRIEF.md
 *
 * Every atmospheric, material, light, scale, layout and navigation value in the world
 * lives here and nowhere else. Components read from this file; they never carry a
 * number or a colour of their own. If a value is needed and it is not in the brief,
 * the brief gets updated first and this file follows it — this is never where a value
 * makes its first appearance.
 *
 * Section markers (§) point at WORLD_BRIEF.md. They are the audit trail: reading this
 * file beside the brief, section by section, is a defined check in the build.
 *
 * Conventions, from the brief's preamble:
 *   - Units are metres.
 *   - Angles are radians unless the brief printed a degree sign. Values the brief gave
 *     in degrees keep a `Deg` suffix here and are converted at the consumer, so nothing
 *     is silently lost in translation. `degToRad` below is the only conversion.
 *   - Colours are authored as sRGB hex strings and converted at load by whoever uses
 *     them. This file imports nothing — not even three — so it stays safe to read from
 *     any context and never drags the engine into a bundle that does not want it.
 *   - Y is up. The alley runs along +Z.
 */

export const degToRad = (deg: number): number => (deg * Math.PI) / 180

/**
 * Mutable copies of the readonly tuples below, for the many three.js props that want
 * `[number, number]` or `[number, number, number]` and will not accept a readonly one.
 */
export const v2 = (t: readonly [number, number]): [number, number] => [t[0], t[1]]
export const v3 = (t: readonly [number, number, number]): [number, number, number] => [
  t[0],
  t[1],
  t[2],
]

/**
 * §12.1 — the brief's yaw is not three's, and the difference is exactly π: yaw 0 faces
 * +Z, a three camera at `rotation.y = 0` looks down −Z. Every yaw in this file is in the
 * brief's convention; convert here, once, at the point a camera is posed.
 */
export const yawToThreeRotationY = (worldYawRad: number): number => worldYawRad + Math.PI

/**
 * A §4 token at a fraction of itself, in the sRGB channel values the palette is written
 * in rather than in linear light.
 *
 * Used wherever the brief says *a fraction of the token* — §3.5's banner ground, §3.6's
 * centre line at 0.22 of `signWhite` and its far-side panels at 0.55. One implementation,
 * because the same phrase meaning two different things in two files is the kind of drift
 * nobody finds by looking at either of them.
 */
export const dimHex = (hex: string, multiply: number): string => {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 255) * multiply)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

/* ────────────────────────────────────────────────────────────────────────────
 * §4 — Palette
 * Every colour in the world comes from this table. Nothing else.
 * ──────────────────────────────────────────────────────────────────────────── */

export const PALETTE = {
  void: '#04060B', // scene background, deepest shadow
  asphalt: '#0A0E15', // dry road base
  asphaltWet: '#070A11', // wet road base
  facade: '#1C2333', // building walls
  facadeWarm: '#251E2C', // west facade, faintly warmer
  shutter: '#272F3F', // roller shutters
  concrete: '#2E3646', // kerbs, plinths, poles
  metalDark: '#353F51', // brackets, condensers, railings
  /**
   * §4.2 — §3.7's scooter bodywork, and **the only pale surface in the surroundings**.
   *
   * 18.3% linear, against `metalDark` at 7.4% and `facade` at 3.1%. The glTF authors its
   * body at 0.80 linear — a near-white scooter — and §3.7 folded that onto `shutter` at
   * 4.7% because `shutter` was the darkest non-hole the palette had. That is §4.1's fault
   * exactly, one object down: a black shape with a headlamp on it, two metres from a
   * visitor who walks past four of them.
   *
   * A sixth of the model's own figure rather than all of it, because this scene has almost
   * no light in it and the model was authored for one that does.
   */
  scooterPaint: '#6E7789',
  /** §4.2 — the crates. Two browns beside the two greys they used to alternate with. */
  crateKraft: '#4A3B2A', // 4.7% — cardboard, the same reflectance as `shutter`
  crateTimber: '#5C4630', // 6.6% — timber, between `concrete` and `metalDark`
  neonMagenta: '#FF2E6A', // primary neon, the alley's signature
  neonPink: '#FF6FA5', // secondary neon, softer signs
  neonCyan: '#3BD9FF', // counter-accent, awning underside
  neonBlue: '#2A6BFF', // rare, distance signs only
  sodium: '#FFA23D', // street lamp, convenience-store spill
  sodiumDeep: '#FF7A1A', // sodium at range, through fog
  lantern: '#E8283F', // paper lanterns
  vendGlow: '#FFD9A0', // vending machine front panel
  phoneGreen: '#2FE08A', // payphone lamp
  signWhite: '#FFF0F5', // lightbox surround, station plate
  rain: '#9FB4D6', // rain streaks
  fogColor: '#0A0F1A', // fog
  uiInk: '#E8ECF4', // 2D overlay text
  uiDim: '#7C879B', // 2D overlay secondary text
} as const

export type ColorToken = keyof typeof PALETTE

/**
 * The neon ratio across the alley. Not a value to read at runtime — a constraint to
 * hold when placing signs in the surroundings step. It is what makes the alley read as
 * Tokyo rather than as generic cyberpunk: warm outnumbers cool, and cyan is a spice.
 */
export const NEON_RATIO = {
  magentaPink: 0.55,
  sodiumLantern: 0.3,
  cyan: 0.12,
  blue: 0.03,
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §8.1 — Emissive intensity ladder
 *
 * Out of section order, and deliberately: this is the single source for every emissive
 * value in the world, and fifteen of its consumers are declared further down this file.
 * A `const` referenced before its initialiser throws at module load, so the table has to
 * come first.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * §9's bloom threshold, named here because §8.1's whole structure is defined against it
 * and the raise below has to know where it is.
 */
export const BLOOM_KNEE = 0.9

/**
 * §8.1 — raise a rung by scaling its **distance from the knee**, not its value.
 *
 * §8.1 is not a list of brightnesses; it is a set of decisions about which side of 0.90
 * each thing sits on and by how much — "just", "edge", "deliberately". Multiplying the
 * values would move the station plate from 1.06× the knee to 2.3× it, turning a rung whose
 * entire annotation is *"edge, deliberately"* into one that plainly blooms: every number
 * larger and the ladder's meaning gone. Anchoring at the knee raises the top and leaves the
 * bottom exactly where it was authored.
 *
 * Sub-knee rungs are returned untouched, and that is load-bearing rather than incidental.
 * They are under 0.90 *because* they are lit rather than glowing — fourteen storefront sign
 * boxes crossing it would bloom the whole lower facade, and §2.1's screenshot must never
 * bloom at all. The knee is a design boundary; a raise moves things further in the
 * direction they were already going and nothing across it.
 */
const EMISSIVE_RAISE = 2.2
const raise = (authored: number): number =>
  authored <= BLOOM_KNEE ? authored : BLOOM_KNEE + (authored - BLOOM_KNEE) * EMISSIVE_RAISE

/**
 * §8.1 — the emissive intensity ladder.
 *
 * Each rung was previously written out again inside `NEON_SIGNS`, `STOREFRONT`, `OVERHEAD`,
 * `PROPS`, `SHOPFRONT`, `VENDING`, `PAYPHONE`, `FACADE_WINDOWS` and §3.6's vehicle table —
 * fifteen literals for fourteen rungs, with nothing keeping them equal to this table.
 * Raising the ladder is one edit or it is not a ladder. Those constants now read from here.
 *
 * The authored figure is kept beside each rung, because §16.9 refers to them and because
 * the raise is only legible next to what it was applied to.
 */
export const EMISSIVE = {
  neonTubes: raise(3.2), //             3.20 → 5.96
  vehicleHeadlight: raise(2.6), //      2.60 → 4.64
  /**
   * §8.1 / §3.7 — the parked scooters' headlamps. **0.90 × the rung above, held as a
   * fraction of it rather than as a number of its own**, so the two can never drift.
   *
   * §3.7 put its lenses on `vehicleHeadlight` on the argument that it is the same object
   * doing the same job, which is right. What changed is the count and the distance: four
   * are lit now instead of two, and three of the four stand about two metres from a
   * visitor who walks past them, where §3.6's cars are forty metres away through fog.
   * Same job, closer, and more of them — so it steps down one notch. Well above the knee
   * either way; this is a decision about how bright a lamp is, not about whether it is one.
   */
  scooterHeadlamp: raise(2.6) * 0.9, // 4.64 × 0.90 = 4.18
  verticalSigns: raise(2.4), //         2.40 → 4.20
  /* §2.3 — six 0.05 m cubes, one per channel. Was `payphoneLamp` at the same value: a small
     bright point on the contact station, which is what it still is. Renamed rather than
     re-derived, because the rung is a decision about *that job at that size* and the job
     survived the object. */
  mailboxFlag: raise(1.9), //           1.90 → 3.10
  /* §2.2 — every lit face on the cart: sign band, canopy panels, stats board. Was
     `vendingFrontPanel`, and the same argument applies: the lit face of the bio station,
     read at two metres, is one rung whatever the station is made of. The canvas decides
     what is bright — a dark board with pale type stays a dark board with pale type. */
  bioStationPanel: raise(1.6), //       1.60 → 2.44
  /* §2.3 — the six label plates. Above §2.1's `projectTitleSign` at 1.23 because these are
     a third the size and have to carry at a glance from 1.60 m, and below the bio station's
     2.44 because six of them side by side is six times the area of one sign band. */
  mailboxLabel: raise(1.35), //         1.35 → 1.89
  vehicleTailLamp: raise(1.55), //      1.55 → 2.33
  /* Authored 1.30 → 1.50 → 1.75. Eleven of these are the warm spine of the alley. The
     first raise was because they read as dull red shapes rather than as lit paper; this
     one is because §4.1 lifted every surface around them, and a rung that was chosen
     against near-black walls is a rung chosen against a different picture. §3.7. */
  paperLanterns: raise(1.75), //        1.75 → 2.77
  apertureSurroundStrip: raise(1.4), // 1.40 → 2.00
  /* Authored 0.95 → 1.30, and it no longer shares a rung with the station plate. The
     old match was about *material* — both are read-through cloth, not tube — which put
     the three largest lit surfaces above eye level one hundredth of a step over the
     bloom knee. A banner is read from forty metres and a plate from four. §8.1. */
  overheadBanner: raise(1.3), //        1.30 → 1.78
  taxiRoofSign: raise(1.2), //          1.20 → 1.56
  /**
   * §2.1 / §3.6 — the two lightbox signs: the project name and the studio's own.
   *
   * They were on `verticalSigns` at 4.20, which is the **neon tube** rung, and a lightbox is
   * not a tube: a white-lit face at 4.20 is over the knee on all three channels at once, so
   * ACES flattens it to white and the colour the box is supposed to *be* disappears. 1.20
   * authored puts them just over the knee — lit, saturated, and blooming softly at the edges,
   * which is what a lit acrylic panel does.
   */
  lightboxSign: raise(1.2), //          1.20 → 1.56
  /**
   * §2.1 — the project title's own rung, split off `lightboxSign` at **1.05 → 1.23**.
   *
   * The two lightboxes in this world are read from different distances and that is the whole
   * of it: §3.6's brand sign is 52 m down the alley through §5's fog at 0.14 transmittance,
   * and this one is **four metres** from a visitor standing in front of it. One rung cannot
   * serve both — at 1.56 the near one was a white slab with a magenta pool on the wall under
   * it, and dropping the shared value to fix that would have taken the far one below what
   * fog leaves of it.
   */
  projectTitleSign: raise(1.05), //     1.05 → 1.23
  openShutterSpill: raise(1.1), //      1.10 → 1.34
  /* Stays at 0.95. §3.1 calls it a *dark* backlit plate and §17's beat is that you
     notice it only when you turn round — barely-there is the specification. */
  stationPlate: raise(0.95), //         0.95 → 1.01, still edge, deliberately
  /* Held under the knee. Not candidates for the raise — see `raise` above. */
  storefrontSignBox: 0.85,
  /* §2.1's painted board face — title, blurb, tags, dots, legends and glyphs on one
     canvas. Under the knee because it is a lit sign to be read, not a light. */
  /**
   * §2.1 / §8.1 — the screenshot, and **the one rung that can never cross the knee**.
   *
   * It was 0. That did not merely stop it blooming, it stopped it being *lit*. A screen that
   * is switched on belongs on the same side of 0.90 as fourteen sign boxes at 0.85 and a
   * hundred and fifty facade windows at 0.55 — a surface can be lit and sub-knee at once.
   *
   * **0.78 → 0.45, and the reason is that this rung is applied to an image nobody authored.**
   * Every other value on this ladder lights a surface whose colour §4 chose; this one lights
   * whatever `CONTENT.md` points at, and two of the four projects are **white web pages**.
   * A near-white texel at 0.78 emissive, on a 5.20 × 2.76 m panel four metres from the
   * visitor, is 14 m² at the top of the range: measured, it lit the bend, the road under it
   * and the wall either side, and the road reflection of it was the brightest thing in the
   * alley. 0.45 keeps a dark UI legibly lit and stops a light one taking the frame.
   *
   * **This is the rung that has to survive a project it has never seen**, which is §17's
   * *added to `CONTENT.md` with no component edited* pointed at brightness instead of layout.
   */
  projectScreenshot: 0.45,
  boardFace: 0.7,
  facadeWindowBay: 0.55,
  /* §8 — the tube's 0.03 halo shell. Held at 0.6 although the tube it surrounds nearly
     doubled: its job is the soft gradient at the tube's edge, and it is under the knee so
     that the tube blooms and the halo does not. Scaled with the tube it would cross 0.90
     and put a second bloom source around all nine signs. */
  neonTubeHalo: 0.6,
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §3 — Layout
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * §3 — the kerb width, derived rather than authored, and declared out here because
 * `LAYOUT` cannot reference itself while it is being built.
 *
 * `wallStandoff 0.20 + deepest wall prop 1.00 + 0.10 clearance`. The deepest wall prop is
 * §3.7's food cart; the vending machines want 1.02 and the scooters 0.95, so the cart is
 * what sets it. **Sized to the thing that has to fit**, so a prop deeper than 1.00 either
 * moves the kerb or trips `audit()`'s `prop-straddles-kerb` rule instead of silently
 * hanging half of itself over the edge, which is what all twenty of them were doing at
 * the old 0.60.
 *
 * The two figures it is built from live in `PROPS` eight hundred lines below, so they are
 * restated rather than referenced — and `PROPS.foodCart.size[1]` is checked against this
 * by `lib/props.ts`'s audit, which is the only place both are in scope at once.
 */
const KERB_WIDTH = 0.2 + 1.0 + 0.1
const KERB_INNER_EDGE_X = 4.5 - KERB_WIDTH
const GUTTER_WIDTH = 0.22

export const LAYOUT = {
  alley: {
    length: 46.0,
    z: [-23.0, 23.0],
    width: 9.0,
    x: [-4.5, 4.5],
  },
  facadeHeight: {
    /** Asymmetric on purpose — equal heights read as a corridor. */
    west: 14.0,
    east: 12.5,
  },
  /** §3 — set by the 0.55 shopfront recess in §2.1. Outer faces are never seen. */
  wallThickness: 1.0,
  ground: {
    y: 0,
    /**
     * Single plane. The overscan past the alley is hidden by fog, or by a wall.
     *
     * 70, not §3's original 60: §3.6 puts a road past the bend and the opening shows
     * floor out to the far pavement at z = 32.90, which a 60 × 60 plane centred on the
     * alley stops 3 m short of. The extra 5 m at every other edge is behind a wall.
     */
    size: 70.0,
  },
  kerb: {
    height: 0.12,
    /** §3 — 0.60 → 1.30, and derived. See `KERB_WIDTH` above. */
    width: KERB_WIDTH,
    /** Inner edge at 3.20; outer edge meets the wall at x = ±4.5. */
    innerEdgeX: KERB_INNER_EDGE_X,
  },
  gutter: {
    width: GUTTER_WIDTH,
    /**
     * §3 — the centre line, both sides, **derived off the kerb face**: `innerEdgeX −
     * width/2 − 0.07`. That formula returns the old 3.72 from the old 0.60 kerb exactly,
     * which is how it was checked — it was a free-standing literal for four sections and
     * only looked right because nothing had moved. §6.2's puddle bias reads this.
     */
    x: KERB_INNER_EDGE_X - GUTTER_WIDTH / 2 - 0.07,
    depth: 0.03,
    /** Standing water — the one place roughness is this low outside the puddles. */
    roughness: 0.06,
  },
  ends: {
    /** §3.1 — the station ticket gate, shutter down. Behind you at spawn. */
    north: { z: -23.0, plateY: 4.2 },
    /**
     * §3.1 — the alley bends left. A 6 m return wall angled off the axis so no
     * vanishing point is ever visible. Its modelled form is still open (§16.2);
     * the shell builds it as a bare box at this angle.
     */
    south: { z: 23.0, returnLength: 6.0, angleDeg: 20, fogTransmittance: 0.24 },
  },
  /** §3.1 — no sky dome, no HDRI. The overhead cable mat lives in this band. */
  overhead: { y: [6.5, 9.0], crossAlleyBannerWires: 3 },
} as const

/**
 * §3.1 — the bend's face frame, derived once.
 *
 * `Alley.tsx` worked these out privately to place the return wall. §2.1's board now mounts
 * on that same wall, and a second private derivation is the fault §7.1 spent a section on:
 * change `angleDeg` or `returnLength` and the board slides off the wall it is bolted to,
 * silently, with nothing in the diff wrong. So the derivation lives here and both read it.
 *
 * Everything below comes from `LAYOUT` — no value here is authored, and none may be.
 *
 * The frame:
 *   - `centre` is the wall *box* centre, which is what a mesh wants.
 *   - `faceCentre` is the centre of its alley-facing face, half a thickness inboard along
 *     the box's own local +Z. That is the surface anything mounted on the wall sits on.
 *   - `along` runs the length of the face, and `inward` points from the face into the
 *     alley — the direction a visitor stands in.
 *   - `visibleT` is the span of `t` (metres along `along`, from `faceCentre`) that can
 *     actually be seen: the west end of this wall runs past `alley.x[0]` and is buried
 *     inside the west facade box, so 0.183 m of face never renders.
 */
const BEND_ANGLE_RAD = degToRad(LAYOUT.ends.south.angleDeg)
const BEND_CENTRE_X =
  LAYOUT.alley.x[0] + (LAYOUT.ends.south.returnLength / 2) * Math.cos(BEND_ANGLE_RAD)
const BEND_CENTRE_Z = LAYOUT.ends.south.z + LAYOUT.wallThickness / 2

export const BEND = {
  /** The brief's yaw convention: a visitor facing the board looks along +ψ. */
  yawDeg: LAYOUT.ends.south.angleDeg,
  angleRad: BEND_ANGLE_RAD,
  centre: [BEND_CENTRE_X, BEND_CENTRE_Z] as const,
  faceCentre: [
    BEND_CENTRE_X - (LAYOUT.wallThickness / 2) * Math.sin(BEND_ANGLE_RAD),
    BEND_CENTRE_Z - (LAYOUT.wallThickness / 2) * Math.cos(BEND_ANGLE_RAD),
  ] as const,
  /** Local +X of the wall box, in world XZ. `t` is measured along this from `faceCentre`. */
  along: [Math.cos(BEND_ANGLE_RAD), -Math.sin(BEND_ANGLE_RAD)] as const,
  /** Face normal pointing into the alley — the direction the board looks. */
  inward: [-Math.sin(BEND_ANGLE_RAD), -Math.cos(BEND_ANGLE_RAD)] as const,
  length: LAYOUT.ends.south.returnLength,
} as const

/**
 * The `t` range of the face that is not buried in the west facade. Solved rather than
 * measured: the face's x at parameter t is `faceCentre.x + t·along.x`, and everything at
 * `x < alley.x[0]` is inside the west wall box.
 */
export const BEND_VISIBLE_T = [
  (LAYOUT.alley.x[0] - BEND.faceCentre[0]) / BEND.along[0],
  BEND.length / 2,
] as const

/** A point on the bend face, `t` along it and `y` up. The one place this maths happens. */
export const bendFacePoint = (t: number, y: number): [number, number, number] => [
  BEND.faceCentre[0] + t * BEND.along[0],
  y,
  BEND.faceCentre[1] + t * BEND.along[1],
]

/**
 * Perpendicular distance from a ground point to the bend face, positive on the alley side.
 * §2.1's standoff and §12.5's radius are both checked against this.
 */
export const bendStandoff = (x: number, z: number): number =>
  (x - BEND.faceCentre[0]) * BEND.inward[0] + (z - BEND.faceCentre[1]) * BEND.inward[1]

/**
 * §3 — the hard walkable clamp, in addition to per-object AABBs.
 * Bounding boxes leak at corners; a clamp cannot.
 *
 * The clamp acts on the eye position and `playerRadius` is NOT subtracted from it: ±3.60
 * already stands 0.90 m inside the walls at ±4.5, so taking the radius off again would
 * stop the visitor at ±3.28 for no reason the brief gives. The radius is the §12.4 box
 * resolution's business — the distance a capsule keeps from a solid object.
 */
export const BOUNDS = {
  x: [-3.6, 3.6],
  z: [-21.0, 21.4],
  playerRadius: 0.32,
} as const

/**
 * §3.2 — the surroundings inventory. Atmosphere only; carries no content.
 * Counts are mirrored here so the surroundings step has nothing left to invent.
 * `solid` drives collision AABBs as objects are placed.
 */
export const SURROUNDINGS_INVENTORY = [
  { item: 'shutteredStorefronts', count: 14, solid: true, variants: 3 },
  /* Was 5. The fifth stood at west z = 20.3, 2.7 m from the bend and directly in front of
     §2.1's screen — see `lib/props.ts` and §16.12. */
  { item: 'deadVendingMachines', count: 4, solid: true },
  { item: 'paperLanterns', count: 11, solid: false },
  { item: 'decorativeNeonSigns', count: 9, solid: false },
  { item: 'airConCondensers', count: 16, solid: false },
  { item: 'standpipes', count: 22, solid: true, solidCount: 12 },
  /* §3.2 — scooters, not bicycles, and now a glTF model rather than five boxes. The
     box version reads as one object at 20 m and as a stack of crates at 2 m, which is
     where three of the four stand. See §3.7 and §16.13. */
  { item: 'scooters', count: 4, solid: true },
  { item: 'crates', count: 9, solid: true },
  { item: 'conesAndBarriers', count: 3, solid: true },
  { item: 'steamVentGrates', count: 3, solid: false },
  { item: 'overheadCableSpans', count: 34, solid: false },
  /* Was 6, over three passes. Neither wall has a slot free that clears §3.4's awnings and
     lit sign boxes, §3.5's signs, a rubbish point and a scooter — see `lib/props.ts` and
     §3.7's `poleSignClearance`. */
  { item: 'utilityPoles', count: 2, solid: true },
  { item: 'puddleDecals', count: 18, solid: false },
  { item: 'rippleEmitters', count: 12, solid: false },
  { item: 'crossStreetVehicles', count: 6, solid: false },
  /* §3.7 added these three. The guardrail is the one worth noticing: it is the first
     object in this world built to explain a rule rather than to decorate one. */
  { item: 'foodCart', count: 1, solid: true },
  { item: 'rubbishPoints', count: 2, solid: true },
  { item: 'mouthGuardrail', count: 1, solid: true },
] as const

/**
 * §3.3 — the upper facade window bays.
 *
 * The grid is worked out from each wall's real height rather than listed per wall:
 * `floors = floor((facadeHeight − bandBaseY) / floorHeight)`, which gives 3 west and 2
 * east and leaves whatever does not divide as parapet. Both walls share one texture set;
 * the two-floor wall samples the bottom two thirds of the same image, so the height
 * classes cost geometry and not memory.
 *
 * Nothing here is solid. The bays lie flush on walls at x = ±4.5 and §3's clamp already
 * stops the eye at ±3.60 — see BOUNDS above.
 */
export const FACADE_WINDOWS = {
  /** Top of the §2.1 shopfront recess: the tallest ground-floor feature the brief gives. */
  bandBaseY: 4.6,
  floorHeight: 2.85,
  /** 6 bays per wall over the §3.1 facade extent of 48.0. */
  bay: { width: 8.0, count: 6 },
  /** 5 windows per floor per bay, at 1.60 pitch in a 1.60 × 2.85 cell. */
  window: { pitch: 1.6, width: 0.95, height: 1.35 },
  /** Mostly dark. It is 3am. */
  litFraction: 0.16,
  /**
   * Cool by constraint, not by taste. §17 keeps three things lit warmer than everything
   * else, and they are the three you can touch; a hundred and fifty warm windows break
   * that. `rain` is the only cool unsaturated token in §4 not already spoken for.
   */
  litColor: 'rain',
  /** Darker than the wall it sits in. */
  unlitColor: 'void',
  baseColor: 'facade',
  /** §8.1 — under the 0.90 bloom threshold, between infoPanelBacklight 0.70 and 0. */
  emissiveIntensity: EMISSIVE.facadeWindowBay,
  /** §11.4's precedent: assigned by index, never randomised. Six bays cycle A B C A B C. */
  variants: 3,
  /**
   * §15 — 384 across 8.00 m is 48 px/m. The §11.1 painter scale is a signage figure; at
   * 4 px/cm this bay would want 3200 px and spend the entire texture budget on one wall.
   *
   * **512 → 384, one of the three levers §15 named against its own breach.** Three cached
   * variants at 512² are 4.19 MB; at 384² they are 2.36. What is painted here is a grid of
   * flat rectangles with hairline reveals — no glyphs, no gradients, nothing that a third
   * fewer texels along each axis can blur into something else. The wall is also never seen
   * closer than 4.60 m up and mostly from thirty, which is the other half of why this is the
   * cheapest 1.83 MB in the world.
   */
  canvas: { desktop: 384, mobile: 192 },
  /** §6.1's depth arithmetic, unchanged — 1 mm z-fights at the far end, 4 mm does not. */
  offset: 0.004,

  /**
   * §3.3 — the window recess, as geometry: §3.4's *fake the recess by standing everything
   * else proud*, one band higher. A painted grid on a flat quad is a decal of a building
   * and read as one; nothing on either upper facade ever caught a highlight or turned a
   * corner.
   *
   * **`spandrelDepth` is 0.03 short of `pierDepth` and that 0.03 is the whole thing.**
   * Piers run the full band height and spandrels the full bay width, so all thirty
   * crossings have two boxes meeting — and at equal depth their front faces are
   * *coplanar*, which is z-fighting across an entire facade at exactly the distance
   * where it flickers worst. Offsetting them makes the piers win every crossing, so
   * they read as continuous verticals with the spandrels infilling: a concrete-frame
   * facade, which is what these buildings are. The alternative is segmenting the piers
   * per floor — 342 instances instead of 114 to avoid what one number solves.
   *
   * No shadow map is involved (§15 has them off) and none is needed. A reveal is a
   * *surface facing sideways*: the jamb and head faces take §7's grazing light at a
   * different angle from the wall in front of them. **Depth here is normals, not
   * shadows** — the same reason §3.4's shopfronts work at all.
   */
  reveal: {
    pierDepth: 0.12,
    spandrelDepth: 0.09,
  },
} as const satisfies {
  litColor: ColorToken
  unlitColor: ColorToken
  baseColor: ColorToken
  [key: string]: unknown
}

/**
 * §3.4 — the storefronts, the lower 4.00 m of both facades. The §3.2 inventory line
 * built out: 14 units, 7 per wall, 3 shutter variants, solid.
 *
 * Boxes and cylinders throughout. The one thing that is *not* a box is the shutter
 * corrugation, and it is not a normal map either — see `slatPitch`.
 */
export const STOREFRONT = {
  /** §3.3's window band starts at 4.60, so 0.60 of bare spandrel sits between. */
  bandHeight: 4.0,
  perWall: 7,
  variants: 3,
  /** Five sizes, so a run of them never reads as one shape repeated. */
  widths: [3.6, 4.2, 4.8, 5.4, 6.2],
  plinth: { height: 0.1, depth: 0.2 },
  /** Inset from each edge of the unit, so a pier of fascia stands between neighbours. */
  aperture: { sideInset: 0.3, baseY: 0.1, headY: 2.55, recess: 0.35 },
  /**
   * §3.4 — geometry, not §8's `normalRepeat`. Unit widths run 3.60 to 6.20 and a
   * material's repeat is shared by every instance using it, so one repeat across five
   * widths puts the rib pitch between 0.15 and 0.26 m — a corrugation that coarsens as
   * you walk past. A fixed world pitch cannot do that.
   */
  slatPitch: 0.09,
  slatDepth: 0.035,
  /**
   * The **empty** drum. What a shutter is wound onto with nothing on it.
   *
   * §3.4 gave every roll this radius regardless of state, so a shut unit and a fully-open
   * one had identical drums — and the open one had 1.55 m of steel that existed nowhere.
   * `storefrontRollRadius()` below adds it back: a shutter rolled up is *thicker at the
   * head*, and that is most of what says "this one is open" before you look inside it.
   */
  rollRadius: 0.16,
  /**
   * §2.1 gives the shopfront door 2.05; this is the ordinary version of that door.
   *
   * **`jambWidth` was a literal inside `Storefronts.tsx` and that is why the doorway cut
   * through the pier beside it on all fourteen units.** The doorway was placed by its
   * *opening* — hard against the pier's inner edge, leaving nothing for the frame — and
   * then the component put 0.12 m of jamb **outside** that, either side. A jamb stands
   * 0.45 proud against a pier's 0.35, so it did not merely overhang the pier, it passed
   * through the front of it. The lintel, sized `width + 0.24`, did the same.
   *
   * A number that lives in one file and is depended on by another is a number with no
   * owner. It is a §3.4 value; it lives here now, and `DOORWAY_SURROUND` below is what the
   * layout is actually placed by.
   *
   * The jambs stay **flush to the opening** rather than standing off it. A reveal was
   * considered and is wrong here: the door panel is a 0.02 slab on the wall and the jamb is
   * 0.45 proud, so a gap between them shows a sliver of bare facade down the middle of the
   * doorway. A frame surrounds an opening; it does not hover beside it.
   */
  doorway: { width: 0.9, height: 2.05, recess: 0.45, jambWidth: 0.12 },
  /** Centred over the doorway, not over the unit — a shop sign hangs above its entrance. */
  signBox: { width: 1.3, height: 0.7, baseY: 2.85, proud: 0.14 },
  /** The doorway takes one end of the unit; the shutter aperture takes the rest. */
  doorGap: 0.15,
  /** Underside clears the 2.55 aperture head and stops below the 2.85 sign box. */
  /**
   * §3.4 — five awnings, dealt at random to units, **except within `clearOfBendZ` of the
   * bend**. An awning stands 1.25 m off the wall at 2.60 m, which is the one piece of
   * storefront geometry that reaches out into the alley at eye level; on the last unit before
   * §3.1's bend it hangs across §2.1's screen from every approach. §2.4 gives the surroundings
   * everything except where content lives, and the air in front of content is part of that.
   */
  awning: {
    count: 5,
    depth: 1.25,
    undersideY: 2.6,
    barRadius: 0.05,
    thickness: 0.07,
    clearOfBendZ: 17.0,
  },
  serviceGap: 1.8,
  /**
   * §3.4 — **eleven shut, three ajar, and no `open` state at all.** §1: nobody else is here.
   *
   * It was 9 / 3 / 2, and the two open units were a mistake this section made twice. An open
   * shutter shows you *the shop*, and this world has no shop interiors: §3.4's vocabulary is
   * boxes and cylinders, so what stood behind a raised shutter was a `void` slab with a
   * `sodium` band at its foot — a 2.55 × 2.30 hole beside neighbours carrying twenty-seven
   * slats each. Raising the curtain to ten slats made it a smaller hole.
   *
   * **The state was writing a cheque the world cannot cash**, and the honest move is to stop
   * writing it rather than to keep tuning how much of the hole shows. `ajar` already carries
   * the whole beat `open` was for — §3.4's own sentence is *light under it is the whole
   * point* — at 0.62 m of opening, which is a strip of lit floor rather than a room that
   * isn't there. Nothing is lost in light: the spill is on every non-closed unit either way,
   * and three of them still have it.
   *
   * It comes back the day this world has interiors, by adding one number.
   */
  states: { closed: 11, ajar: 3 },
  /** How far the shutter still hangs when ajar — light under it is the whole point. */
  ajarClearance: 0.62,
  /** §3.4 — 7 → 8. See `litSignCount` in §16.16: the west wall's re-roll unlit a box. */
  litSignCount: 8,
  /** §8.1 — 1.10 is over the knee, 0.85 is under it. Both placed against §17. */
  spillEmissive: EMISSIVE.openShutterSpill,
  signEmissive: EMISSIVE.storefrontSignBox,
  /**
   * §3.4 — the spill is a band on the shop floor, not the whole opening. An open shutter
   * showing 2.30 m of lit panel is a 2.55 × 2.30 billboard of flat `sodium`, and it beat
   * every content surface in the alley before any of them existed.
   */
  spillBandHeight: 0.55,
  spillColor: 'sodium',
  unlitSignColor: 'shutter',
  /**
   * §4's neon ratio over 14 units: 8 / 4 / 2 / 0. Blue rounds away, which is right for
   * fourteen signs in one alley when §4 calls it rare and for distance only. Within a
   * bucket the two tokens alternate.
   */
  signPalette: [
    ['neonMagenta', 'neonPink'],
    ['sodium', 'lantern'],
    ['neonCyan'],
  ],
  /**
   * No unit may enter these — §2.3 west; §2.2 east.
   *
   * **The west slot at `[−6.60, −1.40]` is gone, and it is §16 item 10 closed.** It was
   * reserved for §2.1's showcase from the shell onward; §2.1 then moved to §3.1's bend and
   * the reservation stayed, leaving **5.20 m of bare west wall** — no shutter, no doorway,
   * no sign — in the middle of the alley. Measured at eye height from mid-alley it came out
   * at 8.5 of 255 against 37.7 on the lit wall beside it, and it read exactly as what it
   * was: the one stretch of this street nobody had built.
   *
   * §16 recorded it as *deliberately not part of §2.1's build* and named the blast radius
   * rather than the work, which was right at the time: removing a slot re-runs
   * `placeWall`'s largest-remainder apportionment, so **every unit width, joint, doorway and
   * sign box on this wall moves**, which moves §3.5's sign `z` values, which re-seats §7.1's
   * five dynamic lights, which re-runs all seven of §3.7's `audit()` rules. That is a full
   * re-verification of four sections — and this pass had already done one, for §3.4's
   * doorway surround, which moves the same chain. **The second one is nearly free once the
   * first has been paid for**, which is the only reason it is here rather than in §16.
   */
  reserved: {
    west: [[12.9, 15.1]],
    east: [[5.1, 6.9]],
  },
  /**
   * **Which reserved slots still hold a content surface**, as opposed to being a hole the
   * wall was generated around.
   *
   * The east slot was reserved for §2.2's vending machine. §2.2 has since moved the bio
   * station to §3.7's food cart, so nothing is going in it — but **removing the reservation
   * is not the cheap fix it looks like**: it re-runs `placeWall`'s largest-remainder
   * apportionment, which moves every unit width, joint, doorway and sign box on the east
   * wall, which moves §3.5's sign `z` values, which re-seats §7.1's lights. §16 item 10
   * priced that chain exactly once and it was worth paying because a doorway change was
   * moving the same wall anyway. Nothing is moving this wall now.
   *
   * So the slot stays and one of §3.7's vending machines fills it, and this list is what
   * lets `audit()` tell the two cases apart: `prop-in-reserved-slot` exists to keep scenery
   * out of the air in front of a **content surface**, and there is no longer a content
   * surface behind the east slot to protect.
   */
  contentSlots: {
    west: [[12.9, 15.1]],
    east: [],
  },
  /** The run stays inside the alley proper, not the facade's full extent. */
  z: [-22.0, 22.0],
} as const satisfies {
  spillColor: ColorToken
  unlitSignColor: ColorToken
  signPalette: readonly (readonly ColorToken[])[]
  [key: string]: unknown
}

/**
 * §3.4 — how much of a unit the doorway occupies, which is not the same as how wide the
 * hole in it is. **1.14**, from `width + 2 × jambWidth`.
 *
 * `lib/storefronts.ts` places the doorway and sizes the shutter aperture from this rather
 * than from `doorway.width`, so the whole assembly — panel, both jambs, lintel — ends flush
 * on the pier's inner edge with nothing outside it. Placing by the opening put 0.12 m of
 * jamb through the front of every pier in the alley, twenty-eight times.
 *
 * It is also the lintel's width, which is where the fault was visible in the old code
 * without being legible: the lintel was authored as `doorway.width + 0.24`, the correct
 * total, sitting on a doorway placed as if the total were `doorway.width`.
 *
 * The narrowest unit still works: usable 3.00, surround 1.14, `doorGap` 0.15, aperture 1.71.
 */
export const DOORWAY_SURROUND = STOREFRONT.doorway.width + 2 * STOREFRONT.doorway.jambWidth

/**
 * §3 / §3.1 — **the pavement turns the corner.**
 *
 * §3's kerbs run down both side walls and stopped dead at `z = ±23`, so the bend — the one
 * wall a visitor stands and looks at — had no pavement at all. Everything else in the alley
 * stands on one: §3.4's fourteen plinths, §3.7's twenty props, both facades.
 *
 * **It is also what closes §6.1's gap, and it is the third attempt at that.** A planar
 * mirror at grazing incidence reflects things behind the wall (§6.1), so the reflective
 * floor has to stop short of it. Stopping it left bare base plane, which came out *brighter*
 * than the mirror — a lit sliver reading as a slot. Filling that with a 0.40 m plinth fixed
 * it close up and left a bright band at middle distance, because a 0.40 m strip at the foot
 * of a 14 m wall is not a pavement, it is a seam.
 *
 * **A kerb at §3's own width is not a seam; it is the pavement, and the eye already knows
 * what it is** from forty metres of it down both sides. `depth` is `LAYOUT.kerb.width`, so
 * the two cannot be different numbers, and §6.1's cut reads this — the mirror stops where
 * the pavement starts, which is where it stops on the side walls too.
 *
 * **The 2 mm.** The bend kerb overlaps the side kerbs where they meet, and two boxes with
 * tops at exactly the same height z-fight along the whole join. Two millimetres of drop puts
 * the side kerb on top: below the ~1 mm depth precision this world has at range, and four
 * hundred times smaller than the step it is part of.
 */
export const BEND_KERB = {
  depth: LAYOUT.kerb.width,
  height: LAYOUT.kerb.height - 0.002,
} as const

/**
 * §3.1 — the bend wall's plinth, standing on `BEND_KERB` exactly as §3.4's fourteen stand
 * on §3's side kerbs. Same depth, same height, same base: the step runs round the alley at
 * one level rather than the bend having a skirting of its own.
 */
export const BEND_PLINTH = {
  depth: STOREFRONT.plinth.depth,
  height: STOREFRONT.plinth.height,
  baseY: LAYOUT.kerb.height,
} as const

/**
 * §3.5 — the decorative neon signs. Nine of them, projecting into the alley at 90° on
 * brackets and read from both directions. A flush panel is a poster; a projecting
 * double-sided box is signage, and that is the whole difference between a wall with
 * decals on it and a street.
 *
 * Not solid (§3.2), and the lowest face is at 2.90 against a 1.68 eye — no boxes.
 */
export const NEON_SIGNS = {
  count: 9,
  vertical: 6,
  /** Per character, plus padding, in the direction the text runs. */
  verticalSize: { width: 0.44, perChar: 0.34, pad: 0.22 },
  horizontalSize: { height: 0.52, perChar: 0.4, pad: 0.28 },
  thickness: 0.09,
  /**
   * §3.5 — the near face must clear §3.4's shopfront frame, which stands 0.35 proud, and
   * the sign box on it, which stands 0.14 further at 0.49. A sign starting at 0.30 hangs
   * inside the fascia it is supposed to be mounted on.
   */
  /*
   * The floor of 0.55 is derived and cannot move. The *top* closed from 1.15: a 0.05 bar
   * cantilevered more than a metre off a wall to hold a lit box is not how signage is
   * mounted, and it reads as a panel floating near a building rather than fixed to it.
   * Shortening compresses the range down onto its derived floor, never below it.
   */
  projection: [0.55, 0.72],
  bracket: 0.05,
  /**
   * §3.5 — two brackets on a vertical sign, one on a horizontal, and the load is why.
   *
   * A horizontal panel is 0.52 high and a single central bar spans most of it. A vertical
   * panel runs up to 2.26 on a 0.44 width, and one bar at its centre leaves a metre
   * unsupported above and below — it looks like a sign about to rotate. ±0.28 keeps both
   * fixings inside the panel's own height at every one of the six verticals, the shortest
   * included.
   */
  bracketOffsetY: 0.28,
  mountY: [2.9, 5.2],
  /** §8 — the tube. `meshBasicMaterial`, colour at full, standing 0.03 proud all round. */
  rim: 0.03,
  /** §8.1 — vertical signs. */
  faceEmissive: EMISSIVE.verticalSigns,
  /** §11.4 — signs take strings 0 through 8, by index. Banners continue from 9. */
  stringOffset: 0,
  canvas: { desktop: [128, 512], mobile: [64, 256] },
} as const

/**
 * §3.5 / §3.1 — the overhead mat. 34 spans between 6.50 and 9.00, three of them
 * carrying a banner. Three straight segments per span approximate the catenary; at that
 * height through §5's fog nobody can tell them from thirty.
 */
export const OVERHEAD = {
  spans: 34,
  y: [6.5, 9.0],
  radius: 0.018,
  sag: [0.35, 0.9],
  segmentsPerSpan: 3,
  /** Most cross at an angle rather than square — the z offset between the two anchors. */
  skew: 3.4,
  color: 'metalDark',
  banner: {
    count: 3,
    width: 3.2,
    height: 0.62,
    /** Hangs this far under its wire. */
    drop: 0.5,
    wireY: 6.9,
    z: [-12.0, 2.0, 16.0],
    /** §8.1 — the station plate's rung. Read-through cloth, not tube. */
    emissive: EMISSIVE.overheadBanner,
    /** §11.4 — the signs took 0..8. */
    stringOffset: 9,
    canvas: { desktop: [512, 128], mobile: [256, 64] },
  },
} as const satisfies { color: ColorToken; [key: string]: unknown }

/**
 * §3.6 — the cross street the bend opens onto.
 *
 * §3.1's return wall crosses the end at 20° and lands at x = 1.14, leaving a 3.36 m gap
 * between it and the east facade. This is what stands on the other side of it: a road,
 * two pavements, and a building tall enough that §1's *no horizon* survives the opening.
 *
 * **Carries nothing and reaches nothing** (§2.4). Everything here lies past z = 24.60
 * against §3's clamp at z ≤ 21.40, so §12.4's registry gets nothing — unlike §3.4's
 * storefronts there is not even a boundary for a box to be inert against.
 */
export const CROSS_STREET = {
  /** Starts past §6.1's reflector edge at z = 26, so no material seam lands under a light. */
  carriageway: { z: [26.2, 31.6], width: 5.4 },
  /**
   * Japan drives on the left, so the +X-bound lane is the near one. From the alley,
   * facing +Z, +X is to the left: near-lane cars cross the opening right to left.
   */
  lane: { width: 2.7, centreZ: [27.55, 30.25] },
  pavement: {
    /** §3's kerb height, the same 0.12. */
    height: 0.12,
    /**
     * The break between the two near spans is the alley mouth — a dropped kerb, so the
     * alley floor runs unbroken into the carriageway. A step there would read as a wall
     * the alley had grown rather than as the place two roads meet.
     */
    near: {
      z: [24.6, 26.2],
      spans: [
        [-40.0, 1.2],
        [4.6, 40.0],
      ],
    },
    far: { z: [31.6, 32.9], x: [-40.0, 40.0] },
  },
  /**
   * Painted, not lit — `meshBasicMaterial` at a fifth of `signWhite`, the same trick as
   * §8's neon tube. A standard material out here is lit by a 0.35 hemisphere and nothing
   * else, so a correctly-lit road marking is an invisible one. It sits above the road
   * glow at 0.024, because drawn under the headlight pools it would vanish exactly when
   * a real marking lights up.
   */
  centreLine: {
    z: 28.9,
    dash: 2.0,
    gap: 3.0,
    width: 0.12,
    y: 0.024,
    color: 'signWhite',
    paint: 0.22,
    x: [-40.0, 40.0],
  },
  /**
   * §3.1's end-wall rule — a cap never opens a strip of sky, so it takes the taller of
   * the two facades. It carries §3.3's window bays because nothing in §7 reaches z = 32.8
   * and an unlit wall out there is a wall nobody can see: §3.5's banner problem, at
   * building scale. The bays cost no texture memory — same three cached canvases.
   */
  farBuilding: {
    faceZ: 32.8,
    thickness: 1.0,
    height: 14.0,
    x: [-40.0, 40.0],
    color: 'facade',
    /** §3.3's band base, held to the same line. */
    groundBand: { height: 4.6, proud: 0.1, color: 'shutter' },
    /** 80.0 ÷ §3.3's 8.00 bay. */
    bays: 10,
    /**
     * §3.6 — a run of tall lit boards along the far side, at **full token colour** on a
     * `meshBasicMaterial`: §8's neon tube, flush.
     *
     * Full, and §5's fog is what makes that safe rather than reckless. §17 keeps three
     * things lit warmer than everything else, and nothing here can join them: the closest
     * a visitor gets to this wall is about 12 m for 0.88 transmittance, and from the
     * middle of the alley it is 0.14. A board at full `neonMagenta` arrives dimmer there
     * than a §3.5 sign at 2.40 does from five metres. Painted at a fraction on top of
     * that, the far side was invisible from everywhere except the last two metres of the
     * alley — and an invisible backdrop is the one thing this wall cannot be, because
     * the vehicles are dark and they are read as silhouettes against it.
     *
     * Flush rather than projecting, which is the opposite of §3.5's rule and right for
     * the same reason it is wrong there: nobody ever walks along this wall, and it is
     * only ever seen face-on across a road.
     */
    panels: {
      /**
       * §3.6 — 22, and the count is set by the sightline rather than by taste.
       *
       * The opening shows only about **4.2 m of this wall** from the middle of the alley,
       * and which 4.2 m depends on where the visitor is standing. Boards every 5 m looked
       * like a street from the clamp and showed the visitor bare wall from everywhere
       * else — the far side was built, lit, and statistically never in frame. No gap here
       * exceeds **2.90 m**, so whatever the slot lands on, it lands on a sign.
       */
      count: 20,
      /**
       * Three size classes cycling by index — §3.3's and §3.4's precedent, and here it
       * is what stops the run reading as a picket fence. Twenty-two identical rectangles
       * at an even stride is not signage; it is a colour chart mounted on a wall.
       */
      classes: [
        { width: 1.1, height: 2.6, baseY: 1.1 },
        { width: 0.8, height: 1.6, baseY: 1.9 },
        { width: 1.3, height: 3.2, baseY: 0.95 },
      ],
      proud: 0.02,
      /**
       * §8.1 — 1.25, and it is a **linear gain on `instanceColor`**, not a fraction of
       * the token.
       *
       * A `meshBasicMaterial` at colour tops out at white, and §5's fog is a mix toward
       * `fogColor`: at 0.14 transmittance the brightest possible board arrives at 0.14 of
       * itself and grey is the best it can do. That is why the far side kept vanishing
       * from mid-alley however the fraction was tuned — the ceiling, not the setting, was
       * the problem. §3.5's own signs survive the same distance because they are emissive
       * *above* 1.0, and this is that, reached through `instanceColor` so twenty-two
       * boards in twenty-two colours stay one draw call.
       *
       * **1.25 is a fit between two viewing distances, and it cannot satisfy both.** The
       * board is seen at 0.88 transmittance from the clamp and 0.14 from mid-alley — a
       * six-fold range that no single value covers. Tuned for the far view at 1.80 the
       * boards arrive at the clamp as pastel: ACES flattens them and they lose the colour
       * that made them worth painting. 1.25 keeps them saturated close up and still lands
       * a legible patch at forty metres. **Re-check when §9's bloom exists**, since a
       * surface over the 0.90 knee behaves differently once there is a pass that blooms
       * it, and this is a look currently judged without one.
       *
       * **This is also the one place §3.6 leans on §17 rather than simply obeying it.**
       * Six of the twenty-two are warm. They are 30 m away, behind a 14 m wall, past §3's
       * clamp, and cannot be walked to — §17's sentence is that the three warm things are
       * the three you can *touch*, and nothing here can be. Re-check that too when §2.1,
       * §2.2 and §2.3 are lit, since none of the three exists yet to compare against.
       */
      gain: 1.25,
      x: [
        -28.35, -25.45, -22.55, -20.7, -17.8, -14.9, -13.05, -10.15, -7.25, -5.4, -2.5,
        /* 2.25 and 5.15 came out: §3.6's brand sign stands in the gap they leave, and it is
           wider than both of them together, so no bare wall is exposed. */
        0.4, 8.05, 9.9, 12.8, 15.7, 17.55, 20.45, 23.35, 25.2,
      ],
    },

    /**
     * §2.4 / §3.6 — the studio's name, once, on the far building.
     *
     * **§2.4's one named exception.** Its rule is that the surroundings carry nothing, and it
     * still holds for every *project* name; this is the piece being signed, which is the same
     * allowance §3.1 makes for `終電` — the one other place the world names itself. It is not a
     * §11.4 string, because that list is explicitly *"never project-related"*.
     *
     * **`x = 3.70` is the only load-bearing number.** §3.1 shows this wall through a 3.36 m slot
     * and the visible window moves with the visitor: `[1.42, 5.40]` from spawn, `[1.66, 6.13]`
     * from mid-alley, and the intersection across that whole half of the walk is just
     * **`[3.29, 4.67]`**. Centred anywhere else the name vanishes for part of the approach.
     *
     * It is a glimmer from spawn (0.086 transmittance at 52.2 m) and sharp from the bend (0.892).
     * §5's density was derived twice and settled; §3.6 already says the far side reads properly
     * only from the last twelve metres, and this is that sentence applied to the one named thing.
     */
    brandSign: {
      /**
       * **Katakana, and that is what makes it a sign in this street rather than a logo
       * dropped into it.** Every other lit string in the world is Japanese — §11.4's thirty,
       * §3.1's `終電`, §3.4's seven sign boxes — so a Latin wordmark on the one wall nobody
       * can walk to was at once the least legible thing out there and the thing that gave
       * the set away. Transliterated, not translated: it is what the studio would be
       * *called* here, which is the move the world already makes with its own title.
       *
       * **The Latin name did not disappear; it moved to §12.7's corner**, and neither half
       * works alone. Katakana by itself loses the name to a visitor who cannot read it; a
       * corner wordmark by itself leaves the far wall speaking English.
       *
       * `ジャシント` rather than `ハシント` is a choice, not a rule — Spanish `Jacinto` is
       * /xaˈsinto/ and would take ハ. The studio is an English-speaking one and this is the
       * reading a visitor who knows the name would hear. Noted because it otherwise looks
       * like a typo to whoever reads it next.
       */
      rows: ['ジャシント', 'デザイン'],
      /**
       * **The script, because one constant in the painter depends on it.** §3.4's lightbox
       * rows have carried the same field since the storefront build; this is one script for
       * both rows, so it sits on the sign rather than on each of them.
       */
      face: 'japanese',
      /**
       * §4's signature over §4's spice — the pairing that reads as branding, not as a shopfront.
       *
       * **Not a lightbox, and that is the point.** It was tried as one, in a single colour with
       * the type cut out in black, on the argument that every other sign in this alley is one.
       * That argument is what makes it wrong: a lightbox is a *shop's* object, and this is the
       * only surface in the world that is not a shop. Individual letters bolted to the facade
       * are the one signage idiom nothing else here uses, which is exactly what a signature
       * should be. §2.1's project sign keeps the lightbox, so the two never read alike.
       */
      rowColors: ['neonMagenta', 'neonCyan'],
      width: 3.4,
      height: 1.6,
      x: 3.7,
      centreY: 2.6,
      proud: 0.03,
      /**
       * 512 across 3.40 m is 151 px/m — coarse for this world and correct here. §11.1's 4 px/cm
       * asks 1360, pads to 2048, and costs 16 MB with mipmaps against 1.06 MB of headroom. The
       * sign is never seen closer than 11 m and always through 0.11 to 0.91 of fog.
       */
      canvas: { desktop: [512, 256], mobile: [256, 128] },
    },
  },
} as const satisfies {
  centreLine: { color: ColorToken; [key: string]: unknown }
  farBuilding: {
    color: ColorToken
    groundBand: { color: ColorToken; [key: string]: unknown }
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * §3.6 — the traffic on it. Six vehicles, three per lane, on a 240 m loop.
 *
 * **Uneven gaps, equal speed within a lane, and the second half is what makes the first
 * half safe.** The gaps sum to exactly the loop, so the wrap point is a gap like any
 * other and no car can lap the one ahead. Varying speed inside a lane looks livelier for
 * about a minute and then produces an overtake, which on a single-lane track is an
 * overlap. The variety comes from the two lanes running at different speeds instead.
 *
 * The loop is 240 m against a widest sightline through the opening of about 32 m, so
 * every car appears and disappears well outside anything the visitor can see.
 */
export const TRAFFIC = {
  perLane: 3,
  track: { x: [-120.0, 120.0], loop: 240.0 },
  lanes: [
    {
      key: 'near',
      centreZ: 27.55,
      /** +1 travels toward +X. */
      direction: 1,
      speed: 11.0,
      gaps: [72.0, 95.0, 73.0],
      /** §13 — where car 0 holds under reduced motion: inside the sightline from spawn. */
      holdX: 2.6,
      variants: ['rx7', 'ae86', 'rangeRover'],
    },
    {
      key: 'far',
      centreZ: 30.25,
      direction: -1,
      speed: 9.0,
      gaps: [88.0, 66.0, 86.0],
      holdX: 3.4,
      variants: ['rangeRover', 'rx7', 'ae86'],
    },
  ],
  /**
   * §3.6 — the three vehicles are **glTF models from `public/`**, not boxes.
   *
   * Only two things about a car are authored here: which file it is, and how long it is
   * in world metres. Width, height, wheelbase, ride height and every proportion come from
   * the model itself, measured at load — authoring them a second time is how a number in
   * this document ends up quietly disagreeing with the mesh it claims to describe.
   *
   * `targetLength` is a **normalisation**, not a preference. A glTF carries whatever unit
   * its author exported in, and §3.6's lane widths, gaps and clearances are all metres; a
   * model that arrives at 100× turns a 2.70 m lane into a car park. Scaling to a stated
   * length puts every model on the same footing whatever it was exported in, and these
   * three lengths are the real cars'.
   *
   * `yawOffset` is which way the model faces before it is turned to drive. A glTF has no
   * convention for a car's nose, so this is measured once per model by looking at it and
   * then written down — there is nothing in the file that can be read to derive it.
   */
  models: {
    ae86: {
      file: '/Toyota AE86 by IvOfficial - ZEFWmOPSgh.glb',
      targetLength: 4.18,
      yawOffset: Math.PI / 2,
    },
    rx7: {
      file: '/Mazda RX-7 by IvOfficial - SnIoWlh7S2.glb',
      targetLength: 4.3,
      yawOffset: Math.PI / 2,
    },
    rangeRover: {
      file: '/Range Rover by IvOfficial - 8zk4o6nALW.glb',
      targetLength: 4.97,
      yawOffset: Math.PI / 2,
    },
  },
  /**
   * Where the lamps sit on a model whose dimensions are not known until it loads: as
   * fractions of its own measured box, rather than as the absolute heights a box-built
   * car could state. A hatchback and a Range Rover do not carry their lights at the same
   * height off the road, and this is the only formulation that gets both right.
   */
  lampPlacement: { headlightYFraction: 0.45, tailLampYFraction: 0.5 },
  /**
   * §8.1 — 2.60, under the neon tubes at 3.20. `signWhite`, not `sodium`, and §17 decides
   * it: three things are lit warmer than everything else and they are the only three you
   * can touch. Six pairs of warm headlights would be the fourth, fifth and sixth.
   */
  headlight: {
    lateral: 0.26,
    height: 0.14,
    /**
     * §3.6 — the lamps wrap the corner, and this is the number that decides whether
     * there are any lights on this street at all. A lamp inset from the centreline and
     * 0.10 deep is a lamp buried inside its own bodywork: only the sliver past the nose
     * escapes, and from the alley — which sees this street broadside and never from in
     * front — that sliver is edge-on and invisible. 0.26 of depth against a face held
     * just proud of the body side puts a lit patch on the corner that reads from either
     * direction, which is what a real lamp cluster is.
     */
    depth: 0.2,
    /**
     * Barely proud — 1 cm, enough to clear the bodywork without z-fighting it. Against a
     * modelled car anything more is a white brick glued to the bumper, and the numbers
     * that mattered when the body was a box do not survive the body being a Mazda.
     */
    sideProud: 0.01,
    noseProud: 0.01,
    color: 'signWhite',
    emissive: EMISSIVE.vehicleHeadlight,
  },
  /** §8.1 — 1.55, over the knee but soft. Dimmer than the headlights, as they are. */
  tailLamp: {
    lateral: 0.22,
    height: 0.12,
    depth: 0.16,
    sideProud: 0.01,
    noseProud: 0.01,
    color: 'lantern',
    emissive: EMISSIVE.vehicleTailLamp,
  },
  /**
   * §8.1 — 1.20. **Nothing carries this rung now.** It belonged to the box-built taxi's
   * 行灯, and none of the three models in `public/` is a taxi. Kept because the rung costs
   * nothing to leave on the ladder and inventing a roof light for a Range Rover would.
   */
  roofSign: { depth: 0.2, lateral: 0.46, height: 0.18, color: 'sodium', emissive: EMISSIVE.taxiRoofSign },
  /**
   * §3.6 — the light on the road is painted, not lit. §7's cap is ten dynamic lights and
   * all ten are spent inside the alley; six vehicles would want eighteen more.
   *
   * **Alpha-blended, never additive.** Additive is the obvious blend for a glow and it
   * breaks under `FogExp2`: three mixes the fragment toward `fogColor` before blending,
   * so at this distance an additive quad adds most of `#0A0F1A` across its whole
   * rectangle and the glow arrives inside a visible dark-blue box. Alpha blending fogs
   * the colour and leaves the alpha alone, so the quad has no edges.
   */
  glow: {
    under: { lengthScale: 1.45, width: 2.3, y: 0.018, opacity: 0.7 },
    headlightPool: { length: 6.2, width: 2.6, y: 0.016, opacity: 0.58, color: 'signWhite' },
    tailSmear: { length: 2.4, width: 2.0, y: 0.014, opacity: 0.38, color: 'lantern' },
    canvas: { desktop: 128, mobile: 64 },
  },
} as const satisfies {
  headlight: { color: ColorToken; [key: string]: unknown }
  tailLamp: { color: ColorToken; [key: string]: unknown }
  roofSign: { color: ColorToken; [key: string]: unknown }
  glow: {
    headlightPool: { color: ColorToken; [key: string]: unknown }
    tailSmear: { color: ColorToken; [key: string]: unknown }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type VehicleVariant = keyof typeof TRAFFIC.models

/**
 * §3.7 — the street props. The rest of the §3.2 inventory that stands on the ground,
 * plus the food cart, the two rubbish points and the alley-mouth guardrail.
 *
 * Everything is boxes and cylinders — §3.4's vocabulary, for §3.4's reason. Sizes are
 * given as **[alongAlley, deep, high]** throughout, which is the frame the brief's own
 * table uses; a prop rotated to face the other wall is turned by the placement, never by
 * swapping two numbers here.
 *
 * Carries nothing (§2.4). *Where* each one goes lives in `lib/props.ts` — this block is
 * the brief's table and nothing more, the same split §3.5's signs already use.
 */
export const PROPS = {
  /**
   * §3.7 — back face 0.20 from the wall plane, which is exactly the §3.4 plinth depth.
   * Wall props therefore stand in front of the storefront rather than inside it.
   */
  wallStandoff: 0.2,

  /**
   * §3.7 — how far along the wall anything tall has to stand from a **lit** sign's edge.
   *
   * **Moved up from `utilityPole`, and that move is the whole point of this pass's audit
   * work.** It was a property of the pole because a pole was the prop that had failed it;
   * the thing crossing the pink 立呑 box turned out to be a *standpipe*, which runs at
   * `|x| = 4.09` — 0.08 m in **front** of a sign box's 4.01 face, closer than a pole ever
   * gets — and the rule never looked at it because it tested `kind === 'utilityPole'`.
   * **A rule scoped to the example that produced it is a rule that catches that example.**
   *
   * **Derived, and the derivation is in §3.7.** The silhouette lands not on the mast's own
   * z but at `z_mast + (M − 1)(z_mast − z_eye)`, with `M = 4.01 ÷ 3.72 = 1.078`. Over the
   * whole alley that term swings ±3.3 m, which excludes every position on both walls — a
   * fact about a 44 m corridor rather than about masts. Scoped to where a sign is legible
   * and dominant, ±8 m: `(0.65 + 0.11 × 1.078 + 0.078 × 8) ÷ 1.078 = 1.29`. A screenshot
   * had already given 1.2. **A derivation that agrees with a measurement is worth more
   * than either.**
   *
   * **Held as clear air between the two edges, not as centre-to-centre**, so it means the
   * same thing for a 0.70 m §3.5 sign as for a 1.30 m §3.4 box. `0.55 + 0.65 + 0.11` comes
   * back to the 1.31 the derivation asked for on a box.
   *
   * Lit signs only. An unlit box is `shutter` with no emissive term — a dark slab on a dark
   * wall — and a mast in front of one cannot be seen from any angle.
   */
  signClearance: 0.55,

  /**
   * §3.7 — §2.2's body, unlit. Four more of the bio station's own object is what makes
   * the lit one mean something: it is the only lit drinks machine in the alley and it is
   * the one you can open. **There is no emissive term anywhere on these**, and that rule
   * is unreversed.
   *
   * **What changed is the albedo, not the light.** The front was a `void` slab: §4's
   * reference black at 0.4% reflectance, which is not *an unlit drinks machine*, it is a
   * hole cut in a machine. §4.1 found this exact fault at wall scale and named it — a hex
   * in §4 is an albedo, not a pixel — and the panel now carries a painted drinks rack in
   * `map` at real plastic albedos. The distinction from §2.2 becomes **lit versus
   * legible**, which is stronger than *dark versus lit*: §2.2's carries the same canvas at
   * `vendingFrontPanel`'s 2.44, over the bloom knee, plus §7's light 4. One of the five
   * throws light on the alley and no amount of paint imitates that.
   *
   * **`proud` is now a standoff, not an inset, and that is the flicker fix.** The panel's
   * front face used to sit at `depth/2` — *exactly* where the body's front face is — so two
   * coplanar surfaces resolved differently every frame as the camera moved. Both now stand
   * in front of the body, which is §3.4's own trick for faking the shopfront recess: this
   * world puts things in front of other things and never needs two faces on one plane.
   */
  vendingMachine: {
    size: [1.12, 0.82, 1.94],
    kick: { height: 0.08 },
    front: { width: 0.96, height: 1.42, baseY: 0.44, proud: 0.03 },
    flap: { width: 0.7, height: 0.2, baseY: 0.16, proud: 0.04 },
    /** §11.1 — the painted rack. Portrait, because the panel is 0.96 × 1.42. */
    frontCanvas: { desktop: [256, 512], mobile: [128, 256] },
    bodyColor: 'shutter',
    panelColor: 'void',
    kickColor: 'metalDark',
  },

  /**
   * §3.7 — the one thing here that lights up. §8.1's open-shutter rung reused rather
   * than extended: warm light falling out of a place with nobody in it is the same
   * phenomenon at both ends of the alley.
   *
   * No dynamic light. §7's ten are spent, and an emissive material illuminates nothing
   * but itself — which is precisely why §17 survives this (see §3.7).
   */
  foodCart: {
    size: [2.1, 1.0, 2.1],
    wheel: { radius: 0.2, width: 0.07 },
    deck: { length: 1.9, depth: 0.78, y: [0.3, 1.1] },
    worktop: { length: 1.98, depth: 0.86, thickness: 0.06 },
    post: { radius: 0.03, y: [1.16, 2.02] },
    canopy: { length: 2.1, depth: 1.0, thickness: 0.08 },
    /**
     * The canopy lamps' colour and rung. **`length`/`depth`/`y` are §3.7's and are no longer
     * read** — §2.2 replaced the single slab with `BIO_STATION.canopyPanels`, which sizes and
     * places five of them; only `color` and `emissive` are still live, through `Props.tsx`'s
     * `cartLamp` material family.
     *
     * **1.34 → 2.44.** `openShutterSpill` was the right rung for a lamp over an empty counter
     * in the surroundings. §2.2 made this a content surface, and §7 has always held that the
     * three content surfaces are the warmest things in the alley — at 1.34 the cart sat below
     * eleven paper lanterns at 2.77, which is the wrong way round now that it is a station.
     */
    lamp: { length: 1.7, depth: 0.7, y: 1.98, color: 'sodium', emissive: EMISSIVE.bioStationPanel },
    bodyColor: 'shutter',
    metalColor: 'metalDark',
    wheelColor: 'void',
  },

  /**
   * §3.7 — a glTF model, and the second one this world has bought.
   *
   * §3.2 argued that five primitives read as one object at 20 m. That is true and it is
   * beside the point: three of the four stand on the walkable band beside a wall the
   * visitor walks along, at about **2 m**, where a floorboard, a cowl, a leg shield, a
   * seat and two discs read as a stack of crates. **The vocabulary rule was never "boxes
   * and cylinders"; it was "nothing at a fidelity nothing around it shares"** — and §3.6
   * already spent that argument in the other direction for the cross-street cars.
   *
   * `lib/carModels.ts` prepares it: node transforms baked into the vertices, merged by
   * material, scaled to `targetLength` with the nose turned to `+X`, then *measured*.
   * That file was written for §3.6 with one caller and took this one with no changes.
   */
  scooter: {
    /** Vespa by Jasmine Roberts, CC-BY 3.0, via poly.pizza (poly.pizza/m/blGLclvvdEM) — a different source and licence from §3.6's cars. */
    model: { file: '/vespa.glb', targetLength: 1.75, yawOffset: Math.PI / 2 },
    /**
     * **Measured off the model after scaling, and authored here anyway**, because
     * `lib/props.ts` builds §12.4's collision boxes at module load and no glTF has
     * loaded by then. `Props.tsx` compares the two on mount and complains in dev if
     * they have drifted — the alternative is a footprint that silently stops
     * describing the mesh it is standing in for.
     */
    size: [1.75, 0.66, 1.28],
    leanDeg: 8,
    /**
     * §3.7 — **some of them are left switched on**, which is the one thing a parked
     * vehicle can do to stop reading as scenery.
     *
     * The model's `Material.004` is 8 triangles at `x ∈ [−0.15, 0.15]`, `y ∈ [1.30, 1.47]`
     * and the forward end of `z` — narrow, high and at the nose, which is a headlamp lens
     * and nothing else. It was folded into `metalColor` when the model landed because it
     * was too small to earn a draw call; switched on it earns one.
     *
     * **`signWhite`, not a warm token, and §17 decides that** exactly as it decided §3.6's
     * car headlights: *three things are lit warmer than everything else and they are the
     * only three you can touch.* A warm headlamp two metres from the visitor would be the
     * fourth. Same rung as those cars, too — this is the same object doing the same job.
     */
    lamp: {
      material: 'Material.004',
      color: 'signWhite',
      emissive: EMISSIVE.scooterHeadlamp,
    },
    /**
     * Its five authored materials fold onto these three. The model ships a light body, a
     * near-black, a dark grey, an 8-triangle gold and a 12-triangle chrome. The gold is
     * the headlamp lens and has a rung of its own now; **the chrome goes to the body
     * rather than to the frame**, because on a pale scooter the mirror stalks are what
     * make the silhouette read, and on a black one they were correctly invisible.
     *
     * **`bodyColor` was `shutter` and that was §4.1's fault one object down.** The mapping
     * originally landed on the exact three tokens this object had declared since it was
     * five boxes, which read as confirmation and was a coincidence: `shutter` was picked
     * because it was the darkest non-hole in the palette, not because a scooter is a
     * roller shutter. §4.2 gives it 18.3% against the model's own 80%.
     */
    bodyColor: 'scooterPaint',
    metalColor: 'metalDark',
    darkColor: 'void',
  },

  /**
   * Stacks of 2 to 4, each stack offset and turned a little off square.
   *
   * **Four shades, and it was two tokens that were one colour.** `shutter` and `metalDark`
   * are 4.7% and 7.4% of the same blue-grey — half a stop apart in hue-identical tokens,
   * which at three metres through §5's fog is not a distinction. §4.2 adds two browns; the
   * run cycles kraft, timber, concrete, metal so no stack is one material and no two
   * neighbouring crates match.
   */
  crate: {
    size: [0.52, 0.36, 0.31],
    colors: ['crateKraft', 'crateTimber', 'concrete', 'metalDark'],
  },

  /**
   * §3.7 — the band's radii come off the cone's own taper rather than being authored,
   * so a straight collar can never poke through the slope it is wrapped around.
   */
  cone: {
    baseRadius: 0.17,
    topRadius: 0.035,
    height: 0.56,
    foot: { size: 0.36, thickness: 0.04 },
    band: { y: [0.28, 0.38], proud: 0.004 },
    color: 'sodiumDeep',
    bandColor: 'signWhite',
    footColor: 'shutter',
  },

  barrier: {
    board: { length: 1.2, depth: 0.05, y: [0.56, 0.76] },
    leg: { size: 0.06, height: 0.92, splayDeg: 10 },
    footRail: { length: 1.2, size: 0.05, y: 0.1 },
    boardColor: 'sodiumDeep',
    metalColor: 'metalDark',
  },

  /**
   * §3.7 — a galvanised drum, and it used to be a cylinder with a slightly wider cylinder
   * on top of it.
   *
   * **What identifies a rubbish drum is the hoops**, the rolled bands that stiffen the
   * sheet, plus a rim under the lid — and none of that is texture, it is silhouette. Two
   * hoops, a rim and a lid knob go on, all of them cylinders in a bucket this section
   * already pays for, so the whole silhouette costs **nothing**.
   *
   * The drum then takes §3.4's grain at the `metal` class for the galvanised speckle, and
   * that is the one part which earns a material of its own: `metalDark` is shared with
   * thirty-nine other cylinders in this alley and a grain map on all of them would be
   * §3.4's rule applied exactly where §3.4 says not to apply it.
   */
  rubbishPoint: {
    drum: { radius: 0.3, height: 0.74 },
    /** Two rolled bands round the body, as a fraction of its height. */
    hoop: { radius: 0.313, height: 0.035, at: [0.3, 0.68] },
    /** The lip the lid sits on. */
    rim: { radius: 0.318, height: 0.045 },
    lid: { radius: 0.32, height: 0.05 },
    /** What you lift it by. */
    knob: { radius: 0.055, height: 0.05 },
    sack: { size: [0.42, 0.36, 0.34] },
    drumColor: 'metalDark',
    hoopColor: 'concrete',
    lidColor: 'concrete',
    sackColor: 'shutter',
  },

  /**
   * §3.7 — 4.09 is §3.4's fascia face at 4.15 less the pipe radius. Anywhere behind it
   * and three quarters of the pipe is inside the bulkhead. z comes off §3.4's generated
   * joints, which is where a downpipe between two buildings goes.
   */
  standpipe: {
    x: 4.09,
    radius: 0.055,
    baseY: 0.1,
    /** Two lengths, alternating by index — a wall of identical pipes is a fence. */
    topY: [2.6, 4.0],
    clamp: { size: 0.15, depth: 0.2, thickness: 0.05 },
    solidCount: 12,
    color: 'metalDark',
  },

  /**
   * §3.7 — on the pavement, not against the wall: §3.4's fascia projects 0.35 across
   * every unit above 2.55, so a pole behind 4.15 is buried for most of its height.
   *
   * **The coordinate has not moved since it was chosen — what moved was the ground under
   * it.** 3.72 used to be §3's gutter centre, which put a pole 0.11 m inside the walkable
   * band; the kerb now reaches to 3.20, so the same number stands a pole half a metre back
   * from the edge of a 1.30 m pavement, which is where a utility pole actually goes. It is
   * still 0.11 m outside §3's clamp, so it stays inert against the visitor.
   *
   * No pole may share a z span with an awninged unit, and nothing tall may stand within
   * `PROPS.signClearance` of a lit sign — see there for why that constant is not here.
   */
  utilityPole: {
    x: 3.72,
    radius: 0.11,
    height: 8.4,
    crossarms: [
      { length: 1.5, size: 0.1, y: 6.4 },
      { length: 1.1, size: 0.09, y: 7.1 },
    ],
    color: 'concrete',
  },

  /** §8.1 — 1.30, already on the ladder. §8 gives the material `side: DoubleSide`. */
  paperLantern: {
    shade: { radius: 0.135, height: 0.36 },
    arm: { length: 0.34, size: 0.045, y: 3.46 },
    drop: { radius: 0.008, length: 0.1 },
    color: 'lantern',
    emissive: EMISSIVE.paperLanterns,
    armColor: 'metalDark',
  },

  /**
   * §3.7 — across §3.1's opening. `z` is not free: the near face at 21.72 less §12.4's
   * 0.32 radius resolves the eye to 21.40, which is §3's clamp exactly. Whichever of the
   * two fires, the visitor stops at the rail.
   *
   * Railings and not a panel — §3.6 spent its whole budget on the 3.36 m slot this
   * spans, and a hoarding would delete every bit of it.
   */
  guardrail: {
    /**
     * Not a round number, and not free: 21.755 less half a 0.07 post puts the near face
     * at **21.72**, and 21.72 less §12.4's 0.32 radius is **21.40** — §3's clamp exactly.
     * The clamp is what fires, and the rail is exactly where it fires.
     */
    z: 21.755,
    /** Stops at 4.15, not 4.50: §3.4's frame stands 0.35 proud and the rail meets it. */
    x: [0.9, 4.15],
    posts: 5,
    post: { size: 0.07, height: 0.88 },
    rail: { height: 0.05, depth: 0.045, y: [0.52, 0.84] },
    color: 'metalDark',
  },

  /**
   * §7's decal, finally built. Only the height is §3.7's: 0.010 sits above §6.1's strip
   * at 0.004 and below §3.6's road glow at 0.014. **Colour, opacity and size stay in
   * `CONTACT_AO_DECAL` below**, which is where §7 put them — restating them here would
   * be two copies of one value in one file, which is the drift this module exists to
   * prevent. The texture is §3.6's painted radial pool alpha, already in memory, so
   * §15's budget does not move.
   */
  contactDecal: {
    /**
     * **Above the surface the prop stands on, not above `y = 0`.** For anything on §3's
     * kerb that used to put the decal 11 cm *underneath* it. `lib/props.ts` adds this to
     * each prop's own `baseY`, which is the same rule stated once instead of a constant
     * that happened to be right while every prop was in the road.
     */
    y: 0.01,
    /**
     * §7 gives one decal size, 1.4 × 1.4, and the props are not one size — a 1.4 m smear
     * under a 0.36 m traffic cone is a stain, not a contact shadow. Each decal is its
     * prop's own footprint at this multiplier, which lands a vending machine near §7's
     * figure and scales everything else off it.
     */
    spread: 1.55,
  },
} as const satisfies {
  vendingMachine: { bodyColor: ColorToken; panelColor: ColorToken; kickColor: ColorToken; [key: string]: unknown }
  foodCart: {
    lamp: { color: ColorToken; [key: string]: unknown }
    bodyColor: ColorToken
    metalColor: ColorToken
    wheelColor: ColorToken
    [key: string]: unknown
  }
  scooter: { bodyColor: ColorToken; metalColor: ColorToken; darkColor: ColorToken; [key: string]: unknown }
  crate: { colors: readonly ColorToken[]; [key: string]: unknown }
  cone: { color: ColorToken; bandColor: ColorToken; footColor: ColorToken; [key: string]: unknown }
  barrier: { boardColor: ColorToken; metalColor: ColorToken; [key: string]: unknown }
  rubbishPoint: {
    drumColor: ColorToken
    hoopColor: ColorToken
    lidColor: ColorToken
    sackColor: ColorToken
    [key: string]: unknown
  }
  standpipe: { color: ColorToken; [key: string]: unknown }
  utilityPole: { color: ColorToken; [key: string]: unknown }
  paperLantern: { color: ColorToken; armColor: ColorToken; [key: string]: unknown }
  guardrail: { color: ColorToken; [key: string]: unknown }
  [key: string]: unknown
}

/**
 * §3.3 — how many whole floors of window fit on a wall of this height. Whatever does
 * not divide is left as parapet, which is why the two walls come out at 3 and 2 from
 * one rule rather than from two listed numbers.
 */
export const facadeWindowFloors = (facadeHeight: number): number =>
  Math.floor((facadeHeight - FACADE_WINDOWS.bandBaseY) / FACADE_WINDOWS.floorHeight)

/* ────────────────────────────────────────────────────────────────────────────
 * §2 — The three content surfaces
 * The objects are defined here; what they carry comes from CONTENT.md, never from
 * this file and never hardcoded into a component.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * §2.1 — the board on the bend. One project at a time, everything generated from CONTENT.md.
 *
 * **Every position here is in the bend's own local frame, and none may become a world
 * coordinate.** `t` runs along §3.1's `BEND.along` from its face centre; the local plane has
 * `+X` to the visitor's right and `+Y` up, which is what a group rotated through
 * `yawToThreeRotationY(BEND.angleRad)` gives. Write a world coordinate beside these and it
 * drifts silently the moment `LAYOUT.ends.south.angleDeg` changes — §7.1's fault, applied to
 * geometry instead of to lights.
 *
 * This replaced a west-wall shopfront at `z = -4.0`, resolving §16 item 8. The recess and the
 * noren went with it; see §16.12.
 *
 * §2.1 — the showcase, as **four separate objects on the wall** rather than one panel.
 *
 * It was a single carcass with everything painted on its face, and at the size the screen
 * needs that stopped being a board and became a wall covered in one texture. The screen, the
 * title sign, the info panel and the door are each their own container now, each standing
 * proud of §3.1's bend face by its own depth — which is also how every other lit object in
 * this alley is built.
 *
 * **The assembly is sized to the wall.** §3.1's visible face is `t ∈ [-2.8175, +3.000]`, so
 * 5.82 m; the screen takes 4.40 of it and everything else lines up under it. A screen that is
 * almost the width of the wall it is on is the whole point of putting it there.
 *
 * Positions are `x` in §3.1's `t` and `baseY` in world metres, because the door has to reach
 * the ground and everything else is stacked off it.
 */
/**
 * §2.1 — a **billboard bolted to the wall, and a lightbox sign under it.** Two objects.
 *
 * It was four (screen, title, info panel, door) and before that one painted board. The text
 * went to §2.1.2's overlay, where it is screen-space and legible at any distance, and the
 * door went with it — a door on a wall you cannot walk through was a metaphor, and the
 * overlay's *open* is the real thing. What is left in the world is the work and its name.
 */
const SCREEN_WIDTH = 5.2
/** 16:8.5, so the screenshots are not cropped. Height follows width; never authored. */
const SCREEN_HEIGHT = (SCREEN_WIDTH * 8.5) / 16

export const SHOWCASE = {
  /**
   * §3.1's `t`. The visible face is `[-2.8175, +3.000]`, so its centre is `+0.09` — and with
   * the screen at 5.20 plus a 0.10 frame there is only 0.21 m of slack left either side.
   * The assembly is centred on what can be *seen*, not on the wall's geometric middle.
   */
  t: 0.24,
  /** Every piece stands off the bend face by its own depth, from this datum. */
  faceOffset: 0.02,

  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    /** World `y` of the bottom edge. */
    baseY: 2.7,
    /** The frame. `metalDark` and bolted, not a glowing bezel — it is a billboard. */
    frame: 0.1,
    depth: 0.22,
  },

  /**
   * §2.1 — the project name, as a §3.4 lightbox: a lit coloured face with the type **cut out
   * of it in black**. That is what every shop sign in this alley already is, and it is what
   * the neon-tube treatment was not — white glyphs at §8.1's 4.20 rung blew all three
   * channels and read as a hole in the world rather than as a sign.
   */
  titleSign: {
    width: 2.6,
    height: 0.62,
    depth: 0.16,
    x: 0.0,
    baseY: 1.83,
    /** §4 — distinct from §3.6's brand sign, which is the other lightbox in the world. */
    color: 'neonCyan',
  },

  /**
   * §2.1 — the screenshot **glows and still never blooms**, and those are not in tension.
   * It was `emissive: 0` on a basic material, which does not merely stop it blooming, it
   * stops it being lit — a dark rectangle of interface on a dark wall at 3am reads as a
   * photograph of a screen rather than as a screen. `EMISSIVE.projectScreenshot` is 0.78,
   * under §9's 0.90 knee, so the ceiling that protects the scene is untouched.
   */
  screenshot: {
    /**
     * §8's darkening multiply, `#A6B2C6` → **`#8792A6`**, 65% → 53% reflectance.
     *
     * This and `EMISSIVE.projectScreenshot` are the two terms that decide how bright a
     * project reads, and both had been set against the dark UI of two of the four projects.
     * The other two are white web pages, and a white page is what this pair has to survive.
     */
    tint: '#8792A6',
    multiply: 0.74,
    toneMapped: true,
    /**
     * **Tier-split, and the mobile figure is compensating for a texture rather than a light.**
     *
     * Measured on §2.1's darkest project from §2.1.1's locked pose, the screenshot's peak came
     * out at **235 on desktop against 184 on mobile** — with the same rung, the same tint and
     * the same material on both. The difference is `screenshotSize`: at 512 × 272 against
     * 1024 × 544, every bright detail in a dark interface is averaged with the dark pixels
     * beside it, and mobile's bloom is weaker on top of that. **A half-size texture is not a
     * softer picture, it is a flatter one**, and the projects it flattens most are exactly the
     * ones with the least light in them to begin with.
     *
     * Raising the rung is the cheap half of the fix — the honest one is a full-size texture,
     * and §15's mobile budget is 9 MB with the screenshots already the largest thing in it.
     * **0.86 takes the dark project's peak from 184 to 212 and still leaves the white one
     * with zero clipped pixels** — measured across all three of §2.1's distinct interfaces,
     * not just the extremes — so *peak luminance lands below the bloom threshold* still holds,
     * which is the rule this rung exists to obey. It does not reach desktop's 235 and it
     * cannot: what is missing is resolution, and no amount of emissive puts detail back.
     *
     * **It is 0.86 against desktop's 0.45, which looks alarming and is not.** The two are not
     * comparable numbers: one multiplies a full-size image and the other a half-size one whose
     * highlights have already been averaged away. The rung is a means; the *measured peak* is
     * the thing §8.1 actually governs, and those now agree to within a tenth.
     */
    emissive: { desktop: EMISSIVE.projectScreenshot, mobile: 0.86 },
  },

  /**
   * §15 / §16.6 — downscaled at runtime from the source JPEGs; no build step. Three
   * resident, never all of them: an all-resident cache is O(N) in the project count and
   * §17 requires a fifth project to change nothing but CONTENT.md.
   */
  screenshotSize: { desktop: [1024, 544], mobile: [512, 272] },
  residentScreenshots: 3,
  signCanvas: { desktop: [1024, 256], mobile: [512, 128] },
  /** Resting state when a screenshot fails to load. No spinner, no error, no white. */
  restingColor: '#0E121A',
  transitionMs: { toBlack: 140, hold: 90, fadeUp: 260 },
  /** §2.1 — wraps at the end; the first manual page stops it for the session. */
  autoAdvanceMs: 10_000,
} as const

/**
 * §2.2 — the bio station: **§3.7's food cart**, promoted from scenery.
 *
 * **There is no geometry in here and that is the point.** The cart's size, position, yaw
 * and collision box live in `lib/props.ts` where §3.7 put them four sections ago; this
 * object carries only what being a *station* adds. §7.1's rule — a coordinate written twice
 * beside the thing it describes drifts silently — is the whole reason the `x`/`z` fields
 * that used to sit here are gone rather than updated.
 *
 * The lit faces are new and they are §3.7's parts, so they are added to `foodCartParts()`
 * rather than built here: §3.7's merge-by-material bake then carries them at **no extra draw
 * call**, which is what makes a detail pass on this object affordable at all.
 */
export const BIO_STATION = {
  /** Which §3.7 prop this station *is*. Position and footprint are read from it. */
  propKey: 'foodCart',
  /**
   * The lit plate that says what this is — **on the front of the bar, not up on the canopy.**
   *
   * It spent a version at `y = 2.02` on the canopy fascia, which is where a shop's fascia
   * sign goes and not where a yatai's does: a stall's plate hangs on the counter you stand
   * at, under the lamps rather than above them. Up there it also read as floating behind the
   * corner posts. On the bar front it is the first thing at eye level and the posts are
   * nowhere near it.
   *
   * Narrower with it — 1.05 against a 1.90 m counter rather than 1.60 spanning a whole
   * canopy — because a plate that runs the full width of the thing it is bolted to is a
   * fascia again.
   */
  signBand: { width: 1.05, height: 0.3, y: 0.72 },
  /** Five lit panels across the canopy underside, replacing §3.7's single lamp slab. */
  canopyPanels: { count: 5, width: 0.3, depth: 0.34, y: 1.98 },
  /** One rung for every lit face; the canvas decides what is bright. */
  emissiveIntensity: EMISSIVE.bioStationPanel,
  /**
   * §2.2 / §2.3 — the shared label atlas, sized here because this station holds the widest
   * surface on it: the 1.60 m sign band read at §12.6's 1.90 m stop wants about 1350 device
   * pixels across, so 1024 is already a compromise and 512 would be visibly soft.
   *
   * **One atlas for fourteen surfaces on two stations** — see `lib/textures/stationLabels.ts`
   * for why they share, which is §15's draw-call budget rather than memory.
   */
  labelCanvas: { desktop: 1024, mobile: 512 },
  urn: { radius: 0.16, height: 0.26 },
  /**
   * **2.20 → 3.20 → 4.00, twice for the same reason.** At 1.90 m the cart filled the frame and
   * the canopy's sign band sat behind §12.7's nav bar; at 2.90 it still read as zoomed in, on
   * a portrait phone especially, where a 2.1 m object at that distance overflows the width. A
   * station's radius has to contain its own stop (§12.5), so widening the framing widens this
   * — twice now, which is what a radius derived from a framing decision does. The board at
   * 9.50 is still by far the widest, which is the ordering §12.5 has always had.
   */
  interactRadius: 4.0,
  idle: { breatheHz: 0.5, breatheAmplitude: 0.004 },
} as const

/**
 * §2.3 — the contact station: **a bank of mailboxes on the west wall**, one per channel.
 *
 * **`columns × rows` is a shape, not a count.** How many boxes there are is
 * `CONTENT.md`'s business — §2.1's rule, applied here — so the grid is filled in reading
 * order and a seventh channel starts a third row rather than requiring a component edit.
 * `boxesPerRow` is what the geometry needs; the row count falls out of the channel list.
 */
export const CONTACT_STATION = {
  wall: 'west',
  /** The wall face. Boxes project from it into the alley. */
  wallX: -4.5,
  z: 14.0,
  facing: '+X',
  /**
   * The plate the boxes are bolted to. **A real plate with real fixings**, because it is what
   * makes six boxes read as one installed thing rather than six boxes stuck to a wall — the
   * same argument §3.5 made for the sign brackets and §2.1 for the board's bolted letters.
   */
  backPlate: {
    /**
     * **The plate is sized from the grid, not authored** — because authored, it was wrong.
     *
     * It was a 2.00 × 1.00 slab standing on §3.4's plinth line, which put its top at
     * `y = 1.22` while the top row of boxes sits at `1.29–1.55`: **the row the plate is
     * supposed to carry was floating above it**, with bare wall behind. A fixed height cannot
     * survive a row count that comes out of `CONTENT.md`, and a seventh channel would have
     * put two rows in the air instead of one.
     *
     * `margin` is the border around the block of boxes. At 0.16 it reproduces the authored
     * 2.00 width exactly — `2 × 0.62 + 0.44 + 0.32` — so nothing about the look changed;
     * what changed is that the height now follows the rows and the bolts stay in the corners.
     */
    margin: 0.16,
    proud: 0.04,
    /** One in each corner, inset from the edge. */
    bolt: { radius: 0.028, depth: 0.03, inset: 0.08 },
  },
  box: { width: 0.44, depth: 0.3, height: 0.26 },
  boxesPerRow: 3,
  columnPitch: 0.62,
  rowPitch: 0.4,
  /** Bottom row centre. Rows stack upward from here. */
  firstRowY: 1.02,
  label: { width: 0.34, height: 0.1, proud: 0.012, emissiveIntensity: EMISSIVE.mailboxLabel },
  flag: { size: 0.05, emissiveIntensity: EMISSIVE.mailboxFlag },
  /**
   * One §4 neon token per channel, cycled. Six tokens for six channels today, and it wraps
   * rather than running out — the list is a palette, not a per-channel assignment, because
   * a per-channel assignment would be a component edit waiting to happen.
   */
  flagColors: ['neonPink', 'neonCyan', 'phoneGreen', 'sodium', 'neonMagenta', 'lantern'],
  /**
   * **2.00 → 3.80, and it needed §12.5's facing rule before it could move.**
   *
   * Framing six boxes on a portrait phone takes a 3.34 m standoff — measured, not guessed:
   * h-FOV there is 35.8°, so at the old 1.60 m only **1.03 m** of a 2.00 m bank was visible.
   * A station's radius has to contain its own stop, so the radius had to follow. But 2.32 m
   * is all there was: past that the bank became the *nearest* station at §2.1.1's locked pose,
   * two metres behind a visitor reading the board.
   *
   * Distance alone could not separate them. §12.5 now picks the nearest station **in front of
   * the visitor**, and behind-the-head stops being a case at all.
   */
  interactRadius: 3.8,
} as const

/** §2.3 — the box faces, which is where the station registers and what §12.6's stop aims at. */
export const CONTACT_STATION_X = CONTACT_STATION.wallX + CONTACT_STATION.box.depth

/* ────────────────────────────────────────────────────────────────────────────
 * §5 — Atmosphere
 * ──────────────────────────────────────────────────────────────────────────── */

export const ATMOSPHERE = {
  fog: {
    /**
     * FogExp2. §5 — corrected from 0.032 once the check below was actually run:
     * three's fog is `exp(-(density·depth)²)`, which put 0.032 at 0.582 / 0.194 rather
     * than the 0.62 / 0.24 the brief asks for. Both check figures independently imply
     * 0.0300.
     */
    density: 0.03,
    /**
     * The check that decides whether the density is right: legible at 23 m, never
     * resolving at 40 m. exp(-(d·z)²).
     */
    transmittanceCheck: { at23m: 0.62, at40m: 0.24 },
  },
  /** Flat colour. No skybox, no HDRI file anywhere in the world. */
  background: 'void',
  toneMapping: 'ACESFilmic',
  toneMappingExposure: 1.05,
  outputColorSpace: 'srgb',
  colorManagement: true,
  /**
   * Built from Lightformers only. Baked once at mount — never re-rendered per frame.
   *
   * `fill` is §5.1's uniform environment: the flat colour the cube map returns in every
   * direction that no lightformer covers. **It is what the four removed formers were
   * really doing**, minus their ability to form a shape.
   *
   * The hue is §7 light 1's `skyColor` `#121A2B` — this document's own statement of what
   * is overhead — restated here rather than referenced because `LIGHTS` is declared two
   * hundred lines below this and a reference would be a temporal dead zone.
   *
   * **The level was solved twice.** Matching the frame's mean luminance to what §5.1's
   * four removed formers were producing gave `#4D649A`, and it was the wrong target: the
   * old mean was concentrated in three saturated patches, and spreading the same total
   * evenly put most of it on the floor. A wet road mirrors the sky at grazing incidence,
   * so a uniformly bright sky is a uniformly bright road — §6's dark mirror came back as
   * a pale sheet. `#33445F` is set against the road instead of against the mean: it
   * halves the reflected sky and leaves the alley legible. §5.1.
   */
  environment: { resolution: 128, frames: 1, fill: '#33445F' },
} as const

/**
 * §5.1 — environment lightformers.
 * These exist to feed the wet-ground reflections and the metal, not to light the scene
 * directly. Positions are [x, y, z].
 *
 * **One of the original five.** The other four were `neonMagenta`, `sodium`, `neonCyan`
 * rectangles outside the walls and a `lantern` ring past the bend, and §7.1 removed them:
 * an `<Environment>` bakes from the origin and is sampled by *direction*, so everything
 * in it sits at infinity, and its reflection in a 0.18-roughness floor is positioned by
 * the camera rather than by the world. They slid across the ground as the visitor walked
 * — a saturated red disc and two coloured slabs with nothing above any of them, and
 * nothing that could ever be put above them.
 *
 * Number 4 stays because it is not a colour: `void` across the top of the alley is the
 * dark ceiling this street actually has, it gives the metal a gradient to be shiny
 * against, and it casts no shape because it contains none. The light those four were
 * faking is now §7.1's five point lights, on signs that exist.
 */
export const LIGHTFORMERS = [
  { form: 'rect', scale: [12, 2], position: [0, 11, 0], color: 'void', intensity: 0.4 },
] as const satisfies readonly {
  form: 'rect' | 'ring'
  scale: readonly [number, number]
  position: readonly [number, number, number]
  color: ColorToken
  intensity: number
}[]

/* ────────────────────────────────────────────────────────────────────────────
 * §6 — Wetness and reflection
 * The ground is the picture. Budgeted first, cut last.
 * ──────────────────────────────────────────────────────────────────────────── */

export type Tier = 'desktop' | 'mobile'

/**
 * sRGB hex → linear luminance, which is the space three's shaders work in.
 *
 * Needed for exactly one thing (`REFLECTION_MIX_STRENGTH` below) and deliberately not
 * exported: this file's job is to state the brief's values, not to become a colour library.
 */
function linearLuminance(hex: string): number {
  const int = parseInt(hex.replace('#', ''), 16)
  const channel = (byte: number): number => {
    const s = byte / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return (
    0.2126 * channel((int >> 16) & 0xff) +
    0.7152 * channel((int >> 8) & 0xff) +
    0.0722 * channel(int & 0xff)
  )
}

/**
 * §6.0 — the reflection gain, and why `mixStrength` is derived from it rather than authored.
 *
 * drei's reflector does not add the planar reflection, it *multiplies it into the albedo*:
 *
 *   diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength)
 *
 * `diffuseColor` is `asphaltWet`, whose linear luminance is 0.00303 — so `mixStrength` is
 * not a fraction of the reflection, it is a fraction *divided by the road's albedo*. At the
 * brief's original 8.0 the reflection reached the screen at 1.7% and the road showed nothing
 * but the sky, measured flat to 0.37 of 255 across the whole alley width.
 *
 * The meaningful quantity is the product, so the product is what §6 states. **The derivation
 * is load-bearing**: `mixStrength` is `1/albedo` in disguise, so a future change to
 * `asphaltWet` would otherwise rescale every reflection in the world by the same factor it
 * changed the road's colour — silently, and looking like a lighting bug.
 */
export const REFLECTION_GAIN = 1.35

/**
 * §6 — 1.35 ÷ 0.00303 ≈ 446. Unity gain would be 330.
 *
 * Read from `PALETTE.asphaltWet` and not from a repeated literal, since the whole reason
 * this is derived is so that the two cannot come apart.
 */
export const REFLECTION_MIX_STRENGTH = REFLECTION_GAIN / linearLuminance(PALETTE.asphaltWet)

export const REFLECTOR = {
  desktop: {
    resolution: 1024,
    blur: [420, 100],
    /* §6.0 — `blurFactor = mixBlur × roughness × roughnessMap.g`, so this is divided by the
       roughness twice before it reaches the blur. The brief's original 0.85 gave 0.9% blur
       in the puddles and 8.4% on the dry patches, which left §6.2's mask effectively absent
       from the reflection. 4.0 puts the dry patches near 40% and keeps the puddles sharp. */
    mixBlur: 4.0,
    mixStrength: REFLECTION_MIX_STRENGTH,
    /* §6.0 — `newMerge = (merge − 0.5) × mixContrast + 0.5` is a recentre about 0.5. This
       alley's reflection lives at 0.01–0.10, entirely on the low side of that pivot, so
       anything above 1.0 subtracts a constant that `mixStrength` then multiplies by 446.
       At the brief's original 1.20 the road's mean at 9 m collapsed from 24.1 to 8.3 while
       the highlights stayed. 1.0 makes `newMerge = merge`, which is the only setting under
       which the gain above means what it says. */
    mixContrast: 1.0,
    depthScale: 1.1,
    minDepthThreshold: 0.4,
    maxDepthThreshold: 1.25,
    depthToBlurRatioBias: 0.28,
    distortion: 0.28,
    mirror: 0.0,
    reflectorOffset: 0.0,
    roughness: 0.18,
    metalness: 0.0,
  },
  mobile: {
    resolution: 512,
    blur: [240, 60],
    mixBlur: 4.5,
    /* §6 — the same gain on both tiers. §6.2's turn-down ladder is resolution, then blur,
       then distortion; `mixStrength` was never in it, and this is the dial that decides
       whether the road carries the alley at all. Mobile gives up sharpness, not the picture. */
    mixStrength: REFLECTION_MIX_STRENGTH,
    mixContrast: 1.0,
    depthScale: 1.1,
    minDepthThreshold: 0.4,
    maxDepthThreshold: 1.25,
    depthToBlurRatioBias: 0.28,
    distortion: 0.18,
    mirror: 0.0,
    reflectorOffset: 0.0,
    roughness: 0.22,
    metalness: 0.0,
  },
} as const

/**
 * §6.1 — the ground is two surfaces, not one.
 *
 * The 4 mm lift is depth-buffer arithmetic, not a look choice: at the §12.1 near/far
 * of 0.10 / 90.0, depth precision at the far end of the alley is around a millimetre,
 * so the conventional 1 mm separation z-fights at 40 m — exactly where nobody thinks
 * to look for it. 4 mm clears it and stays an order of magnitude under the gutter's
 * own 0.03 depth, so nothing about it is visible.
 *
 * Neither seam is ever in frame: the walls at x = ±4.5 stand 1.5 m inside the x-edge,
 * and the z-edge sits 3 m behind the north wall.
 *
 * **The far edge went 26.0 → 33.0, to take in §3.6's carriageway.** The strip used to stop
 * at 26.0 and the road started at 26.2 — deliberately, so no material seam landed under a
 * light — and the consequence was that the one stretch of ground the visitor cannot walk on
 * was also the only stretch that was not wet. Through the alley mouth you saw forty metres
 * of mirror end in a flat dark band exactly where the traffic is, which reads as the road
 * being a different substance rather than as a boundary anybody chose.
 *
 * **It costs no extra render pass**, which is the reason it is the answer rather than a
 * second reflector: `MeshReflectorMaterial` renders the scene once from a mirrored camera
 * into a fixed-size target, and that target does not grow with the plane. What it costs is
 * **resolution spread** — the same texels now cover 13% more length, so every reflection in
 * the world is 13% coarser. A second reflector would have kept the alley sharp and doubled
 * §15's most expensive pass to do it, on a road seen through a 3.36 m slot at 30 m through
 * §5's fog. That is the wrong trade and it is worth naming, because *add another one* is
 * always the first idea.
 *
 * §6.2's puddle mask maps 1:1 onto this strip, so it stretches with it — 11% along z, on
 * irregular blobs, which is not a thing anyone can see. Anchoring the puddles instead would
 * mean leaving the extension at one uniform roughness, which is the flat dark band again.
 */
export const REFLECTOR_STRIP = {
  x: [-6.0, 6.0],
  z: [-26.0, 33.0],
  width: 12.0,
  length: 59.0,
  /** Centre, since the strip is no longer symmetric about the origin. */
  centreZ: 3.5,
  y: 0.004,
  /**
   * §3.1's mouth slot: the band of `x` that is actually reachable — and visible — through
   * the bend's opening. West edge just past the bend wall's east corner at `x = 1.309`, so
   * nothing keyed to this region ever lands in the wall's shadow. §6.2's second coverage
   * region and §10's carriageway ripple region both read it, so a ring can never fall on
   * ground the mask left dry.
   *
   * **It used to be the west edge of an L-shaped reflector's arm, and it is not that any
   * more.** For two sections the strip was notched in front of §3.1's bend wall — a planar
   * mirror at grazing incidence looks *along* itself, so the last stretch of floor before
   * that wall was reflecting §3.6's cross street under its foot, and it read as a slot.
   * **§3.1's kerb covers that floor now**, opaquely, which is a better answer than a hole
   * for the reason the hole itself proved: the notch's diagonal ran on past the wall's east
   * corner into this very slot, where there is neither wall nor kerb, and put a wedge of
   * bare base plane on the carriageway. The lever was never the shape of the mirror; it was
   * whether reflective floor is *visible*, and a pavement settles that without a cut.
   */
  mouthX: [1.35, 6.0],
} as const

/** §6.2 — the puddle mask. Drives both roughnessMap and distortionMap. */
export const PUDDLE_MASK = {
  roughnessWet: 0.06,
  roughnessDry: 0.55,
  /**
   * Maps 1:1 onto the reflector strip — no UV repeat — so puddles are anchored to world
   * positions. The blur scales with the canvas: 14 px is a value in the desktop map's
   * pixel space, and held at 14 on a half-size map it would double the physical softness
   * of every puddle edge. Both land the transition at about a third of a metre.
   */
  size: {
    desktop: { width: 512, height: 2048, boundaryBlurPx: 14 },
    mobile: { width: 256, height: 1024, boundaryBlurPx: 7 },
  },
  /** Water is the ground; the dry patches are broken islands within it. */
  coverage: 0.6,
  /**
   * **Where the 60% is measured, and it is two regions rather than one rectangle.**
   *
   * It was `x ∈ [−4.5, 4.5]` across every row of the canvas, which was right when this was
   * written because the strip *was* the alley. §3.6 ran it out to `z = 33`, and a single
   * global average then let the generator satisfy itself on the alley alone: measured, the
   * carriageway came out **5.8% wet against the alley's 59.8%** — 44 m² of road with traffic
   * on it, a §6.0 reflection of the traffic in it, §10's rain visibly falling into it, and no
   * water. A single average over two regions is a number that describes neither.
   *
   * The generator now fills whichever region is furthest behind and stops when **both** are
   * met. The x bounds are what the visitor can see: the alley's walls, and §3.1's mouth slot
   * for the cross street — the 1.5 m of strip past each wall is hidden geometry, and a puddle
   * out there is one nobody can look at, counted into an average that then dries the floor
   * they can.
   */
  coverageRegions: [
    { id: 'alley', x: [-4.5, 4.5], z: [-23.0, 23.0] },
    { id: 'crossStreet', x: REFLECTOR_STRIP.mouthX, z: [26.2, 31.6] },
  ],
  blob: { ellipsesPerBlob: [3, 6], majorAxis: [0.8, 4.5] },
  /**
   * Water pools where it drains — centre of the alley, and the gutter lines. The
   * baseline is load-bearing: without it the weight falls to nothing between the bumps
   * and concentrates water into saturated bands instead of biasing a floor that is wet
   * throughout.
   *
   * **`gutterX` reads §3 rather than restating it.** It was a literal 3.72 while §3's
   * gutter was also a literal 3.72, which is two copies of one number in one file — the
   * drift this module exists to prevent, sitting inside it.
   *
   * **`beyondWallsToZ` scopes the `|x| > 4.5` penalty to the alley.** That penalty exists
   * to stop the generator spending puddles on the 1.5 m of strip hidden behind each side
   * wall, which is a fact about the alley's walls. Past the bend there are none: §3.6's
   * carriageway is 5.4 m of open road crossing the strip, and a quarter weight out there
   * was drying the one stretch of ground in the world with traffic on it — and a §6.0
   * reflection of the traffic in it.
   */
  bias: {
    baseline: 0.38,
    centre: true,
    gutterX: LAYOUT.gutter.x,
    thinsAtKerb: true,
    beyondWallsToZ: 24.0,
    /**
     * **Past the bend the weight is flat, and 0.59 is the alley's own mean.**
     *
     * The whole weight function is a model of *the alley's* drainage: a crown at `x = 0` and
     * gutters at `|x| = 3.02`, both of which run **along** the alley. §3.6's carriageway runs
     * across it, so its crown and its gutters are perpendicular to everything modelled here —
     * applying the alley's profile to it makes the far road dry wherever the alley happens to
     * be dry, for no reason that exists in the world. Measured: **5.8% wet against the alley's
     * 59.8%**, on the one stretch of ground with traffic on it and a §6.0 reflection of the
     * traffic in it.
     *
     * A flat weight is the honest answer — the cross street's own drainage is not modelled and
     * inventing a second profile for a road seen through a 3.36 m slot at 30 m would be
     * detail nobody can see. **0.59 is derived rather than picked**: it is this function's own
     * mean over the alley, `0.38 + 0.152 + 0.055`, so the far road gets the same expected blob
     * density as the near one without pretending to know which line it drains to.
     */
    crossStreet: 0.59,
  },
} as const

/** §6.2 — the resting ripple texture. The §10 emitters own the expanding rings. */
export const RIPPLE_NORMAL = {
  /**
   * §6.2 — tier-split, and it was the only painter in the world that was not. It shipped
   * at 512 on both tiers from the ground build onward and nothing asked; found while
   * budgeting §2.1's board, where mobile had no room. 256 returns 1.05 MB there — more
   * than the board's whole painted face costs — and §6's turn-down ladder already read
   * 1024 → 512 → 256. A size identical on both tiers is a decision that was skipped.
   */
  size: { desktop: 512, mobile: 256 },
  normalScale: [0.15, 0.15],
  uvRepeat: 8,
  /** Frozen under reduced motion; the map itself stays. */
  scrollUPerSec: 0.012,
  dimples: { count: 140, radiusPx: [6, 22] },
  /**
   * The map's own strength, before `normalScale` scales it. At the grazing angles a
   * 1.68 m eye height gives across a 46 m alley, a small normal perturbation swings the
   * reflected ray a long way — at 2.4 this shredded every reflection edge into torn
   * slivers. 1.1 holds the break-up at the scale of rain on a film of water.
   */
  slope: 1.1,
} as const

/**
 * §6 — turn-down order under budget pressure. Never delete the puddles.
 */
export const REFLECTOR_TURNDOWN = [
  'resolution 1024 → 512 → 256',
  'blur halves',
  'distortion → 0',
  'plain rough material with the env map',
] as const

/* ────────────────────────────────────────────────────────────────────────────
 * §7 — Lights
 * There is no sun at 3am. No directionalLight anywhere, shadow maps off. Grounding
 * comes from the reflections and from painted contact-AO decals.
 * ──────────────────────────────────────────────────────────────────────────── */

/*
 * `LIGHT_CAP = 10` and `MOBILE_LIGHT_CAP = 7` used to sit here and **nothing read either of
 * them.** The caps `lib/lights.ts` actually enforces are `BUDGET.desktop.dynamicLights` and
 * `BUDGET.mobile.dynamicLights`, which had already moved to 11 and stayed at 7 — so the pair
 * here was a second, silently wrong copy of §7's most consequential number.
 *
 * Found by editing one of them to fix a measured darkness and watching the scene not change.
 * **Two constants for one rule is the drift `lib/world.ts` exists to prevent**, and the fix
 * is deletion rather than synchronisation: §15's budget is where a budget belongs.
 */

export const CONTACT_AO_DECAL = {
  color: 'void',
  opacity: 0.55,
  size: [1.4, 1.4],
} as const satisfies { color: ColorToken; opacity: number; size: readonly [number, number] }

/**
 * The ten dynamic lights. Everything else in the world is emissive material feeding
 * bloom and the env map.
 *
 * `mobile` mirrors §7's closing rule: lights 8, 9 and 10 drop entirely, and 6 and 7
 * halve. Their contribution is carried by the emissive materials and the env map.
 */
export const LIGHTS = [
  {
    id: 1,
    type: 'hemisphere',
    skyColor: '#121A2B',
    groundColor: '#060A10',
    /**
     * 0.35 → 0.70. **This is the city's skyglow and there is no such thing as an urban
     * 3am with none of it** — a hemisphere is the only term in §7 that reaches a prop
     * standing between two sign pools, and at 0.35 that prop was lit by nothing at all.
     * It is a fill, not a fix: §4.1's albedo correction is what actually made the
     * surroundings visible, and this only stops the gaps between §7.1's five going black.
     */
    intensity: 0.7,
    mobile: 'keep',
  },
  /**
   * §7 — the board's lightbox. **The size is not authored: it *is* §2.1's aperture**, for
   * §7.1's reason — a lightbox light that is not the size of its lightbox has drifted off
   * its emitter. Position comes from §2.1 too, so there is no coordinate here at all.
   *
   * **8 cd/m², and it was 70 — because the derivation used the wrong area.** §7.1's ×44
   * applies to candela; a `rectAreaLight`'s intensity is luminance, so the comparable
   * quantity is luminance × area. That much was right. The area was written as **1.7213 m²**
   * and the screen is **5.20 × 2.7625 = 14.365 m²** — eight times larger — so 70 nits was
   * putting roughly 1 000 cd on a wall where §7.1's brightest sign light is 150. Mounted, it
   * washed the whole bend white.
   *
   * `120 ÷ 14.365 = 8.35`, taken as **8**, which lands the equivalent between §7.1's light 9
   * at 115 and light 7 at 130 — where the original derivation meant to put it. **The method
   * was right and the number it was applied to was not**, which is the failure mode this
   * whole file exists to make visible: `size` is read from `SHOWCASE`, so the area can now
   * only be got wrong by changing the screen.
   *
   * **Desktop only.** `rectAreaLight` is the most expensive light three.js has — two 64²
   * float LTC tables, a shader permutation, and no `distance`/`decay` at all, so its reach
   * is unbounded. §7's dash in that column is a property of the type, not a missing value.
   * It also needs `RectAreaLightUniformsLib.init()`: without it the light contributes
   * exactly zero, with no warning and no error.
   */
  {
    id: 2,
    type: 'rectArea',
    size: [SHOWCASE.screen.width, SHOWCASE.screen.height],
    color: 'signWhite',
    /**
     * **8 → 1.2, and the luminance × area derivation is not what set it.**
     *
     * Measured across 0 → 5 nits from the locked pose, the ground in front of the board goes
     * **116 → 130 → 131**: this light saturates at about 1.2 and everything above that lands
     * in one place — a **specular slab on the wet road** twenty metres down the alley, where
     * 0 → 5 takes the reflection from 45 to 139 of 255 and clips it. The wall around the
     * board does not move at all across the whole range, which is obvious once seen: the
     * light faces *out* of the wall it is mounted on.
     *
     * **A `rectAreaLight` on §6's 0.06-roughness mirror is mostly a mirror of itself.** Its
     * diffuse contribution is a few units of 255 and its specular contribution is a
     * rectangle. That is exactly the reflection §6 exists to produce — it just has to be a
     * reflection rather than a hole in the road, and 1.2 is where it stops clipping.
     *
     * The luminance × area arithmetic is kept above because it is how the *first* figure was
     * got wrong, and because it still bounds the sane range. **It is not what chose 1.2**;
     * a sweep against the surface the light actually reaches is.
     */
    intensity: 1.2,
    mountedOn: 'showcaseScreen',
    /**
     * **`drop` → `keep`, and the reason is that this light cannot be substituted.**
     *
     * §7 dropped it on mobile for its *type* — a `rectAreaLight` is the most expensive three
     * has. §2.2's light 4 was dropped on the same ground and got a `pointLight` stand-in,
     * which works because what light 4 does is throw a warm pool on a counter.
     *
     * **This one's entire job is the specular rectangle it makes in §6's mirror.** The note
     * above is explicit: its diffuse contribution is a few units of 255 and its contribution
     * *is* the reflection — that bright slab of board on the wet road twenty metres down the
     * alley, which is the first thing anyone looks at from spawn. A point light's specular in
     * a mirror is a hot dot, not a rectangle: the stand-in that worked for the cart produces
     * the wrong image here, not a dimmer one.
     *
     * So it is kept on both tiers, and §15's mobile light cap absorbs it. **The alternative
     * was a phone that never sees the reflection the whole §6 exists for.**
     */
    mobile: 'keep',
  },
  /**
   * §7 — on §2.1's title lightbox.
   *
   * **150 at 0.90 m, and it was 264 at 0.12.** The 264 came from applying §7.1's ×44 to an
   * authored 6.0, which was the right instinct — *apply the recorded correction rather than
   * pick a number that looks right* — and it was calibrated against a palette §4.1 has since
   * lifted ×3.83 in linear. Mounted at that value it did not read as a bright sign; it read
   * as a blown white blob with a sign somewhere inside it.
   *
   * **The standoff mattered more than the intensity.** §3.1's gate light already recorded
   * this exact fault: a point light a few centimetres off a flat panel is inverse-square
   * squared into a hotspot the size of the panel, which is a blob rather than a lit sign.
   * 0.90 m throws the same light across the sign, its case and the wall behind — physically
   * the *spill* from a lit box rather than the tube inside it, which is the thing that
   * actually lights a shopfront.
   *
   * 150 puts it level with §7.1's brightest alley light rather than at 1.76× it. §17 wants
   * the content surfaces dominant and they are — this one has **two** lights on it and every
   * §3.5 sign has at most one.
   */
  {
    id: 3,
    type: 'point',
    color: 'neonMagenta',
    /**
     * **150 → 95.** 150 put it level with §7.1's brightest alley light, which was the right
     * comparison for a sign and the wrong one for *this* sign: every §3.5 sign is read from
     * along the alley, and this one is read from four metres away by a visitor standing
     * still. What it produced was a magenta pool on the wall brighter than the sign in it.
     * 95 matches §7.1's light 8 — a mid-range alley light — and the surface is still the
     * most-lit in the world, because it is the only one with two lights on it.
     */
    intensity: 95,
    mountedOn: 'showcaseSign',
    /** Clear air between the sign's face and the light. §3.1's gate light, verbatim. */
    standoff: 0.9,
    distance: 9.0,
    decay: 2,
    mobile: 'keep',
  },
  /**
   * §7 #4 — **§2.2's food cart**, re-seated from the vending machine it was authored for.
   *
   * Retiring it with the machine was the tidy move and it would have broken §7's own
   * argument: *what makes the three content surfaces dominant is that each throws light.*
   * An emissive material illuminates nothing but itself, so two of the three would have
   * stopped touching the alley around them. Moving it keeps the count at eleven and
   * `LIGHT_SURRENDER_ORDER` unrevised.
   *
   * **The size is the lit canopy face, not a number.** §16.15 recorded what happens when a
   * `rectAreaLight`'s area is written down beside the emitter rather than read off it —
   * light 2 was authored at 70 against an area a factor of eight out and washed the bend
   * white. 6.0 cd/m² over 1.8 m² is about 0.6 × the board's total emission, which is the
   * intent; the figure that ships is what a pixel reading at §12.6's stop says it is.
   */
  {
    id: 4,
    type: 'rectArea',
    size: [2.0, 0.9],
    color: 'vendGlow',
    /**
     * **28, measured, not the 6.0 that was derived.** §16.15 said to set a `rectAreaLight`
     * from a pixel reading rather than from an area calculation, and the sweep at §12.6's
     * about-stop is why: the counter reads 41.5 unlit, 54.8 at 6, 92.6 at 30 and 162 at 90.
     * §3.7 measured its drinks rack at 100.8 and called it the brightest thing on that
     * stretch; 28 puts the counter just under that and **keeps `vendGlow`'s warmth** — by 40
     * the highlight has gone white, which is a warm light that has stopped reading as one.
     */
    intensity: 28,
    /**
     * **Under the canopy facing down, not on the cart's face facing out** — and the first
     * version was measured contributing exactly nothing. A `rectAreaLight` emits from one
     * side of its plane, and the plane was at `x = 3.30`, which is the cart's own front face:
     * every part of the cart was *behind* it. Deck, posts and canopy all read identically at
     * 0 and at 45.
     *
     * Here it is the five canopy panels it stands for: a 2.0 × 0.9 emitter at the canopy
     * underside throwing down onto the counter, the stools and the ground in front, which is
     * both what a yatai does and what §7 means by a content surface throwing light.
     */
    position: [3.62, 1.94, 19.0],
    facing: '-Y',
    /**
     * **`drop` on mobile — of the `rectAreaLight`, not of the light.** It is the most
     * expensive type three has (two 64² LTC tables and a shader permutation) and §7 drops
     * light 2 on exactly that ground.
     *
     * Dropping it outright was measured and it was wrong: the mean frame at §12.6's about
     * stop came out at **14.4 on mobile against 51.6 on desktop — 28%** — because the cart is
     * a content surface with nothing but emissive on it. §7's own rule is that each of the
     * three throws light, and a tier where two of them do not is not a cheaper version of
     * this world, it is a different one.
     *
     * So mobile substitutes a `pointLight` in the same place. It is a loop iteration in a
     * forward renderer rather than a pair of texture lookups per fragment, and `intensity`
     * changes units with the type — cd/m² over 1.8 m² against candela — so the figure is
     * measured on the tier that uses it.
     */
    mobile: 'drop',
    mobileFallback: { type: 'point', intensity: 26, distance: 5.0, decay: 1.45 },
  },
  /**
   * §7 #5 — **§2.3's mailbox bank**, re-seated from the payphone.
   *
   * `signWhite` rather than the payphone's `phoneGreen`: this is the surface §17 needs a
   * stranger to find in ten seconds, and a green wash reads as one more neon in an alley
   * full of them. Decay 1.45 rather than 2 puts it on §7.1's corrected footing with the
   * five sign lights instead of the inverse-square the rest of that pass moved off.
   */
  {
    id: 5,
    type: 'point',
    color: 'signWhite',
    intensity: 18,
    position: [-3.0, 1.55, 14.0],
    distance: 6.0,
    decay: 1.45,
    mobile: 'keep',
  },
] as const

/**
 * §7 light 11 — the station gate, and the only cool light in the alley.
 *
 * **It lights the wall you turn round to see.** §17's first line is *you turn round and the
 * shutter is down; you understand what happened without being told*, which cannot happen on
 * an unlit wall. It is seated on §3.1's `終電` plate rather than authored as a coordinate,
 * for §7.1's reason: a light two metres from its emitter still looks like a light, so the
 * drift is silent. `lib/lights.ts` resolves the position from `STATION_PLATE_PANEL`.
 *
 * **`signWhite` is deliberate.** §17 reserves warmth for the three things you can touch and
 * §4 makes cyan a spice; a ticket gate is fluorescent, municipal and unwelcoming, which is
 * the note this end of the street plays against forty metres of neon. At 70 cd over 9 m it
 * washes the gate and the dead machines and reaches nothing else — the nearest sign light is
 * 2.5 m away at z = −20.65.
 *
 * Not a member of `LIGHTS` because that array is §7's authored table and this is seated on
 * an object, the same separation `ALLEY_LIGHTS` already makes for 6 to 10.
 */
export const GATE_LIGHT = {
  id: 11,
  color: 'signWhite',
  intensity: 70,
  /* §7 — the same area-emitter correction as `ALLEY_LIGHTS`, and for the same reason:
     this stands in for a backlit plate, not for a filament. See the note there. */
  distance: 13.5,
  decay: 1.45,
  mobile: 'keep',
} as const satisfies {
  id: number
  color: ColorToken
  intensity: number
  distance: number
  decay: number
  mobile: 'keep' | 'halve'
}

/**
 * §7.1 — lights 6 to 10, the alley's own.
 *
 * **Neither a position nor a colour, and that is the point.** Each of these sits on one
 * of §3.5's nine neon signs, and §3.5's signs are *generated* — wall, `z`, mount height
 * and projection are all resolved at load. A light written as a coordinate drifts the
 * moment that generator moves, and drifts silently, because a light two metres from its
 * sign still looks like a light. Written as a sign index it cannot drift at all: the
 * light lands on that sign's panel centre, at that sign's own emissive colour, through
 * the same function `NeonSigns.tsx` uses to place the panel.
 *
 * §7's old colour column was a palette plan for an empty alley, and two of its five
 * named light that no surface within nine metres could have emitted.
 *
 * `lib/lights.ts` resolves these against `NEON_SIGN_LIST`. The spread — signs 0, 1, 4,
 * 6 and 8 — runs the pools continuously from z ≈ −28.6 to +29 with no gap, and puts one
 * 1.15 m from §12.1's spawn.
 *
 * **The intensities are ×44 of what §7 first authored, and §7.1 called it before it was
 * measured:** *"a pool on the ground would want an order of magnitude more, and that number
 * should not be picked before §9's bloom exists."* It exists, so it was picked. The ratio
 * between the five was a real decision about which signs are the bright ones and is held to
 * within 3%; only the scale was wrong. At 3.4 cd, 97% of the west facade sat below a
 * luminance of 3 out of 255 — those walls were not dim, they were absent. These are candela,
 * and 150 for a square metre of neon is still well under what real signage radiates.
 */
/**
 * §7 — `decay` is **1.45**, not 2, on every one of these, and it is a modelling correction
 * rather than a cheat.
 *
 * Physical inverse-square is what a `pointLight` gives you and it is the wrong law here:
 * **each of these stands in for an area emitter** — a square metre of neon, a lit acrylic
 * panel, a backlit plate — and an area source only falls off as `1/d²` in the far field.
 * Close to a panel the falloff is nearer linear, and *close* means anywhere inside a few
 * multiples of the panel's own size, which in a 9 m alley is everywhere the visitor can
 * stand. At decay 2 almost the whole output lands within a metre of a sign nobody can
 * reach, and nothing arrives at knee height six metres away.
 *
 * Measured: a prop at knee height on the west wall at `z = 14` received **3.4 lux** from
 * light 8 and 1.9 from light 9 — against a shutter returning 1.2% of it, before §4.1.
 * At 1.45 the same light delivers **8.0 lux** there and holds it across the stretch.
 * Nothing about the source changed: same position, same colour, same candela.
 *
 * **`distance` went up by half with it, and for a different reason.** It is not a reach,
 * it is a *windowing cutoff* that forces the falloff to zero at the boundary — so a prop
 * 8.7 m from a light with `distance: 10` was being crushed toward black by the window
 * rather than by the physics, at exactly the range where §7.1's pools were supposed to
 * overlap. They were continuous on paper and dark in the middle. **A light's falloff and
 * a light's cutoff are two different numbers and only one of them is physical.**
 */
export const ALLEY_LIGHTS = [
  { id: 6, sign: 1, intensity: 150, distance: 18.0, decay: 1.45, mobile: 'halve' },
  { id: 7, sign: 4, intensity: 130, distance: 16.5, decay: 1.45, mobile: 'halve' },
  { id: 8, sign: 6, intensity: 95, distance: 15.0, decay: 1.45, mobile: 'keep' },
  { id: 9, sign: 8, intensity: 115, distance: 13.5, decay: 1.45, mobile: 'keep' },
  { id: 10, sign: 0, intensity: 80, distance: 12.0, decay: 1.45, mobile: 'keep' },
] as const satisfies readonly {
  id: number
  sign: number
  intensity: number
  distance: number
  decay: number
  mobile: 'keep' | 'halve'
}[]

/**
 * §7 — the order lights are surrendered in when the mobile cap bites, highest id first.
 *
 * `mobile: 'drop'` used to live on lights 8, 9 and 10 as a flag. It was arithmetic
 * mistaken for a preference: dropping three of ten is how §7 reached §15's seven, and
 * applied to a world with six built lights it dropped half of them and left a phone with
 * two lit points in forty-four metres of alley. The cap is the rule; this is only the
 * order it is applied in.
 */
/**
 * §7 — which lights a phone gives up, in order, when the count exceeds `MOBILE_LIGHT_CAP`.
 *
 * **This was `[10, 9, 8]` and it was wrong, silently, since §16.10 added the gate light.**
 * §7 described mobile as holding *"six lights in the world"*; it has held seven since then,
 * so it has been exactly full rather than comfortable, and the order was one build away
 * from firing without ever having been re-read. §2.1's light 3 makes it fire.
 *
 * Highest-id-first was a proxy for importance that stopped tracking it. Under the old order
 * a phone would lose **light 10 — the one the visitor spawns 1.15 m from**, by §7.1's own
 * measurement — in order to keep a light on a sign at the far end of the alley.
 *
 * Light 9 now goes first because §2.1's board arrives on the wall it lights and makes it the
 * one genuinely redundant source in the alley; after that the order works back down it.
 * **10 and 11 are not in this list**: one is the light the visitor spawns inside and the
 * other is §17's opening beat, and a surrender order that can reach either is not a budget.
 */
export const LIGHT_SURRENDER_ORDER = [9, 8, 7, 6] as const

/**
 * Light #1. Named because it is the only one of the ten that belongs to the atmosphere
 * rather than to an object — the other nine arrive with the things they light.
 */
export const HEMISPHERE_LIGHT = LIGHTS[0]

/**
 * Resolve a light's intensity for a tier. §7 halves 6 and 7 on mobile; nothing else
 * changes with the tier. Whether a light is mounted at all is the cap's business, not
 * this function's — see `lib/lights.ts`.
 */
export const lightIntensityFor = (
  light: { intensity: number; mobile: 'keep' | 'halve' },
  tier: Tier,
): number => {
  const base = light.intensity * STREET_LIGHT_TRIM
  if (tier === 'desktop') return base
  return light.mobile === 'halve' ? base / 2 : base
}

/**
 * §7 — **one factor on everything that lights the street, and it is applied here rather
 * than to the eight authored numbers.**
 *
 * §7.1's 150/130/95/115/80 is a real decision about which signs are the bright ones, and
 * §5's hemisphere is the skyglow between them; a 10% trim is a decision about the *whole*
 * street's exposure and about nothing else. Editing eight values to express one intent is
 * how a ratio drifts — §4.1 made the same argument about scaling five palette tokens by a
 * single factor rather than re-picking them, and this is that in the other direction.
 *
 * **It deliberately does not reach §2.1's lights 2 and 3.** Those are the content surface,
 * they are set against a viewer standing four metres away rather than against the alley,
 * and they are trimmed separately and by different amounts. A factor named for the street
 * that quietly moved the board too would be the drift this file exists to prevent.
 */
export const STREET_LIGHT_TRIM = 0.9

/* ────────────────────────────────────────────────────────────────────────────
 * §8 — Materials
 * ──────────────────────────────────────────────────────────────────────────── */

export const MATERIALS = {
  /**
   * Reflector material — see §6.
   *
   * **`envMapIntensity` is stated here because its absence was a value.** Every other
   * row of §8 gives one; this row said only *"see §6"*, and §6 gives roughness and the
   * reflector settings but never this. So the ground took three's default of **1.0** —
   * the highest environment response of any surface in the world, on the surface §4
   * paints darkest, and 2.5× the facade beside it.
   *
   * With §5.1's old shaped formers that produced three bright patches. With §5.1's
   * uniform fill it produced an evenly lit pale road — snow, not wet asphalt. **The
   * ground is meant to be dark and to be a mirror**, and those are not in tension: at
   * 0.10 the environment contributes a sheen instead of a wash, and what is left to see
   * on the road is what the road is reflecting. §6 says the ground is the picture; this
   * is what decides whether the picture is the alley or the sky.
   */
  wetAsphalt: { metalness: 0.0 },
  concrete: { roughness: 0.72, metalness: 0.0, envMapIntensity: 0.6 },
  facade: { roughness: 0.85, metalness: 0.0, envMapIntensity: 0.4 },
  rollerShutter: { roughness: 0.55, metalness: 0.35, normalRepeat: [24, 1] },
  paintedMetal: { roughness: 0.62, metalness: 0.55, envMapIntensity: 1.0 },
  /**
   * §8 / §2.1 — the board's case and its sign's case. **Not `paintedMetal`, and the
   * difference is area.**
   *
   * Every other `paintedMetal` object in the world is a bracket, a railing or a condenser
   * measured in centimetres; §2.1's two cases are **6.2 m²** of continuous panel. At that
   * size, metalness 0.55 and `envMapIntensity` 1.0 — the highest env response in this table,
   * and the same 1.0 §6 records as having made the road read as snow — turn the case into a
   * mirror for whichever dynamic light is nearest. At the bend that is §7.1's light 9, cyan,
   * 3.4 m away, and it washed the case brighter than the content on it.
   *
   * A sign case is painted sheet that has been outdoors: rough, barely metallic, and dark.
   * Everything a visitor is meant to see on this object is *painted on it*, so the case
   * contributing light of its own is the case competing with the thing it carries.
   */
  boardCase: { roughness: 0.78, metalness: 0.12, envMapIntensity: 0.35 },
  condenserGrille: { roughness: 0.68, metalness: 0.7, alphaMapped: true },
  /**
   * No `transmission`. It costs a render pass per frame and buys nothing at this
   * exposure — the glass is dark and the neon behind it does the work.
   */
  glass: { roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.22 },
  norenFabric: { roughness: 0.92, metalness: 0.0, doubleSide: true },
  paperLantern: { roughness: 0.9, metalness: 0.0, emissiveIntensity: EMISSIVE.paperLanterns, doubleSide: true },
  neonTube: { roughness: 0.3, metalness: 0.0, basic: true, haloWidth: 0.03, haloIntensity: EMISSIVE.neonTubeHalo },
} as const

/**
 * §3.4 — the surface grain, and why the walls read as plastic without it.
 *
 * A `MeshStandardMaterial` with one `color` and one `roughness` has, by construction, the
 * same response at every point on it: a 6 m fascia and a 0.20 m plinth return exactly the
 * same highlight, and §6's wet ground beside them is the only thing in frame that is not
 * perfectly even. It is not a lighting problem and no amount of §7 fixes it.
 *
 * **White is the material as §4 and §8 authored it, and everything below white is damp.**
 * That is the whole rule, and it is what lets one greyscale canvas fill both slots: `map`
 * multiplies the §4 token so darker texels darken it, and `roughnessMap` multiplies the
 * §8 roughness so the same texels make it **glossier**. Darker and shinier is wrong on a
 * dry wall and exactly right on one standing in §10's rain. Both are multiplies, so the
 * map can only ever take a surface *away* from its authored value in one direction:
 * **nothing in this canvas can make a surface lighter or rougher than the palette says it
 * is**, which is what makes it safe to put on every large flat surface at once.
 *
 * **One texture in both slots, not two.** §3.3 argues this for its window bays — one
 * image cannot disagree with itself, where two let a surface be dirty in colour and clean
 * in gloss, a fault nobody finds by looking because the wall simply reads slightly wrong.
 * three decodes `map` from sRGB and reads `roughnessMap` raw, so the roughness excursion
 * arrives compressed against the albedo one; left alone, because that is the safe
 * direction and correcting it would mean two textures.
 *
 * **`repeat` is in UV space, not world space, and the speckle is fine on purpose.**
 * Everything here is a unit box scaled per instance, so a 6.20 m fascia and a 0.30 m pier
 * sample the same 0 → 1 UV and the texture arrives stretched by up to 4:1. A blotch or a
 * streak stretched 4:1 reads as a smear; isotropic aggregate speckle stretched 4:1 is
 * still speckle. That is a real constraint of the instancing this world needs for its
 * draw calls, and it is answered by choosing the right noise rather than by fighting it.
 */
export const SURFACE_GRAIN = {
  /**
   * §3.3's precedent — a wall does not get §11.1's signage scale.
   *
   * **512 → 384, and §15 named this one first.** Two canvases at 512² are 2.80 MB; at 384²
   * they are 1.56. This is *noise*: a field of aggregate speckle under broad damp patches,
   * tiled two to four times across every surface it lands on and stretched by up to 4:1 by
   * the instancing. There is no feature in it that a third fewer texels can destroy, which
   * is exactly why §15 listed it as the lever to spend before the ones that carry glyphs.
   */
  canvas: { desktop: 384, mobile: 192 },
  /**
   * The darkest texel on the wall, as a fraction of the §4 token — the field is
   * *normalised* into `[darkest, 1]`, so this is the one knob and it means what it says.
   *
   * **0.82, and it was 0.62.** At 0.62 the alley came out mottled like rock: a wall of
   * dark patches at a scale the eye reads as *shape* rather than as *surface*, which is a
   * worse failure than the flatness it was fixing, because a flat wall at least reads as
   * a wall. The aim is to break a surface up, not to paint dirt on it.
   */
  darkest: 0.82,
  /** Coarse damp patches over fine aggregate — see the note on stretching above. */
  patchScale: 4,
  speckleDensity: 0.5,
  /**
   * Per surface class: how many times the field tiles across one instance's UVs.
   *
   * **`crate` and `metal` are §3.7's, and they cost nothing.** A per-class repeat needs its
   * own `Texture`, but a *cloned* `Texture` shares its `Source` — one GPU upload, many
   * samplers — so the fifth and sixth classes are two more views of a canvas that is already
   * resident and §15's figure does not move. A crate at 1 gets one grain tile across its
   * 0.52 m face, which is the scale a cardboard box is; a bin drum at 2 gets the finer
   * speckle of galvanised sheet.
   */
  repeat: { concrete: 3, facade: 2, fabric: 4, crate: 1, metal: 2 },
  /** How much of the Sobel-derived normal each class takes. */
  normalScale: { concrete: 0.6, facade: 0.45, fabric: 0.35, crate: 0.5, metal: 0.35 },
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §9 — Post-processing
 * Applied in this order. Lands in the atmosphere step, not the shell.
 * ──────────────────────────────────────────────────────────────────────────── */

export const POST = {
  bloom: {
    desktop: {
      intensity: 0.9,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.28,
      mipmapBlur: true,
      radius: 0.72,
    },
    mobile: {
      intensity: 0.8,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.28,
      mipmapBlur: true,
      radius: 0.72,
      resolutionScale: 0.5,
    },
  },
  chromaticAberration: {
    offset: [0.0006, 0.0009],
    radialModulation: true,
    modulationOffset: 0.35,
    mobile: false,
  },
  noise: { opacity: 0.05, premultiply: false, mobile: false },
  vignette: { offset: 0.28, darkness: 0.85, mobile: true },
  /** No SMAA pass — not worth a full-screen pass here. */
  smaa: false,
  /**
   * §9.1 — the composer itself, which §9 did not have to describe until it existed.
   *
   * **`multisampling` carries §9's `antialias` flag, because `gl.antialias` stops
   * reaching the scene the moment a composer is mounted**: the scene is rendered into a
   * half-float target and the canvas is only ever shown a full-screen quad. Four samples
   * is what a browser typically grants for `antialias: true`; mobile's `false` is 0.
   */
  multisampling: { desktop: 4, mobile: 0 },
} as const

/** §9 — Canvas gl flags. Antialias is the only one that differs by tier. */
export const GL = {
  desktop: { antialias: true, powerPreference: 'high-performance', stencil: false, depth: true },
  mobile: { antialias: false, powerPreference: 'high-performance', stencil: false, depth: true },
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §10 — Rain, ripples, steam
 * The rain has just stopped being heavy. If it reads as a storm, it is too dense.
 * ──────────────────────────────────────────────────────────────────────────── */

export const RAIN = {
  near: {
    desktop: { count: 1400, opacity: 0.35 },
    mobile: { count: 700, opacity: 0.28 },
    box: [14, 12, 14],
    pointSize: 0.06,
    followsCamera: true,
  },
  far: {
    desktop: { count: 2600, opacity: 0.22 },
    mobile: { count: 1000, opacity: 0.18 },
    box: [30, 14, 46],
    pointSize: 0.04,
    followsCamera: false,
  },
  streakTexture: [8, 64],
  fallSpeed: 9.0,
  windDriftX: 0.6,
  color: 'rain',
  /** Not additive — additive rain at this density turns the alley to milk. */
  additive: false,
  /**
   * §13 — the near layer's 0.35 comes down to this and the far layer is already there.
   * Count halves. **Speed is untouched**: slower rain reads as broken, not as calm.
   */
  reducedMotion: { opacity: 0.22, countScale: 0.5 },
} as const

/**
 * §10.1 — the three figures the built form needs, none of them authored.
 *
 * A separate export rather than fields on `RAIN`, because every one of them is arithmetic
 * on a value above: a second copy in the object could disagree with its own source.
 */

/** Streak length ÷ width, from §10's painted texture: an 8 × 64 image is 1 : 8. */
export const RAIN_STREAK_ASPECT = RAIN.streakTexture[1] / RAIN.streakTexture[0]

/**
 * §10.1 — the streak's two dimensions, from §10's `pointSize` **and its counts**.
 *
 * The aspect above is only half the derivation, and taking it as the whole thing is a
 * mistake worth recording: `pointSize` × aspect makes a 0.06 streak 0.48 long, which is
 * **eight times the area** of the 0.06-square sprite §10's density was written for. §10
 * sets 2 600 far streaks at opacity 0.22 — figures that only mean what they were chosen
 * to mean if each streak covers `pointSize²`. At eight times that, forty metres of alley
 * accumulates enough alpha to turn the wet road into a pale sheet, and §10's own warning
 * (*"if it reads as a storm, it is too dense"*) is met without a single count changing.
 *
 * So: hold the **area** at `pointSize²` and the **aspect** at 1 : 8, and solve.
 *
 *     width = pointSize ÷ √8      length = pointSize × √8
 *
 * Near comes out **0.021 × 0.170**, far **0.014 × 0.113**.
 *
 * **0.170 is worth a second look, because it was not aimed at.** A drop falling at §10's
 * 9.0 m/s draws 0.15 m across one frame at 60 fps — which is what a rain streak physically
 * *is*, a drop smeared over an exposure. Two independent derivations, one from the
 * texture and the density, one from the fall speed and the frame rate, landing 12% apart.
 */
export const RAIN_STREAK = {
  near: {
    width: RAIN.near.pointSize / Math.sqrt(RAIN_STREAK_ASPECT),
    length: RAIN.near.pointSize * Math.sqrt(RAIN_STREAK_ASPECT),
  },
  far: {
    width: RAIN.far.pointSize / Math.sqrt(RAIN_STREAK_ASPECT),
    length: RAIN.far.pointSize * Math.sqrt(RAIN_STREAK_ASPECT),
  },
} as const

/**
 * How far off vertical the streak lies, in radians — `atan(0.6 ÷ 9.0)` ≈ 3.81°.
 *
 * The rain travels at that angle, so the streak is turned to match it. A vertical streak
 * drifting sideways is the one detail here that reads as wrong without anyone being able
 * to say why.
 */
export const RAIN_LEAN = Math.atan(RAIN.windDriftX / RAIN.fallSpeed)

/**
 * Where each box sits.
 *
 * **The near box follows the camera in `x` and `z` only.** §12.1 fixes the eye at 1.68
 * and nothing but head bob moves it, so following in `y` would buy nothing and would push
 * four metres of the box below the floor, where a third of the layer falls through the
 * world unseen. Its base is the ground.
 *
 * **The far box is §3's alley**, not a new figure: §10's 46 is `LAYOUT.alley.length` and
 * its 14 is the west facade height. Only the 30 of width is §10's own, and it is there to
 * carry rain across §3.6's opening as well as the alley.
 */
export const RAIN_BOX = {
  near: { baseY: LAYOUT.ground.y },
  far: { centre: [0, LAYOUT.facadeHeight.west / 2, 0] },
} as const satisfies {
  near: { baseY: number }
  far: { centre: readonly [number, number, number] }
}

/**
 * §10 / §10.0 — the ripple emitters, and the rule about *where* they go.
 *
 * The positions come from §6.2's puddle mask, not from a scatter, and that is the whole
 * of this block. A ring expanding on a dry island contradicts — in the most visible way
 * available — the one document that says where the puddles are.
 *
 * Sampling is against the **painted canvas**, not the weight function that generated it:
 * the function describes the *bias*, the canvas describes the *blobs*, and a ring has to
 * land inside an actual blob. One `getImageData` at mount, seeded, nothing per frame.
 *
 * §13 removes these rather than freezing them. A ring's radius is its only state, so a
 * frozen ring is a bullseye painted on the road.
 */
export const RIPPLES = {
  /* §10 — 12 → 64 and 6 → 28. Built at twelve the rings measured 0.007% of the frame and
     were invisible standing over a puddle: §10's figures were written for a matte road,
     and §6.0 turned the ground into the mirror §6 always claimed. One InstancedMesh either
     way, 128 triangles, and §10 specifies a shader — so the count was buying nothing. */
  /* §10.0.1 — 64 → 48 and 28 → 21, down 25%. The count was raised to 64 to make the rings
     visible at all against §6.0's mirror; with two generations alive and per-cycle jitter each
     emitter now reads as continuous rain rather than as one blinking spot, so the count that
     made twelve visible is more than the picture needs. Draw calls do not move at any count.
     The counts now live per region below, since the alley and the carriageway are two
     different amounts of visible ground. */
  /**
   * §10.0 — **where the rings may land, and it was one rectangle that was wrong at both
   * ends.**
   *
   * It ran `x ∈ [±4.5]`, which is the alley *including its pavements*, so rings were
   * expanding on the kerb — on a surface 12 cm above the water — and §3's widening from
   * 0.60 to 1.30 would have made that four times as visible. And it stopped at `z = 23`,
   * so **no rain landed on the carriageway** the bend opens onto, even though §6.0 had
   * already run the reflector to `z = 33` and put the far building and the traffic in that
   * road as reflections. Rain visibly falling into a street with a still, mirror-flat
   * surface is the one thing §10 exists to prevent, and it was happening in the only part
   * of the world where a moving vehicle is there to be compared against.
   *
   * The carriageway's x range is not the road's width; it is **how much of the road can be
   * seen** — §3.1's 3.36 m opening plus what parallax adds — cut off at 6.0 because §6.1's
   * strip ends there and the mask returns dry past it anyway. Twelve against forty-eight is
   * roughly the visible-area ratio.
   *
   * The rejection sampler needed no new machinery for either: the mask is one canvas over
   * one reflector and it was already wet out there.
   */
  sampleRegions: [
    {
      id: 'alley',
      /** §3's kerb inner edge, not the walls — the road, not the pavement. */
      x: [-3.2, 3.2],
      z: [-23.0, 23.0],
      desktop: 48,
      mobile: 21,
    },
    {
      id: 'carriageway',
      /** §6.1's arm. A ring must not land on ground the reflector does not cover. */
      x: REFLECTOR_STRIP.mouthX,
      z: [26.2, 31.6],
      desktop: 12,
      mobile: 5,
    },
  ],
  decalDiameter: 0.85,
  /* Still longer than the 1.4 s life, so rings overlap slightly instead of the floor
     going quiet between them. 64 at 1.1 s is 58 impacts a second across the alley. */
  ringIntervalSec: 1.1,
  ringLifeSec: 1.4,
  /** §10.0 — it is water, and §4 already has the token for water. */
  color: 'rain',
  /** §10.0 — between §10's steam at 0.08 and its far rain at 0.22. Twelve of these
      overlap down the centre channel, and §10.1's lesson was that transparent things
      accumulate along the view direction. */
  peakOpacity: 0.3,
  /**
   * §10.0.1 — how many ring generations are alive on one emitter at once.
   *
   * **Derived, not chosen:** `ceil(ringLifeSec ÷ ringIntervalSec)` = `ceil(1.4 ÷ 1.1)` = 2. It
   * exists because the cycle wraps on the *interval* while the age divides by the *life*, so a
   * single generation could never exceed age 0.786 — every ring was cut off at 79% of its life,
   * the `discard` guarding age > 1.0 was dead code, and each emitter restarted instantly in the
   * same place. Generation k carries the birth and k−1 the tail that was being deleted.
   */
  generations: 2,
  /** §10.0.1 — fraction of the life spent ramping in. A real impact appears abruptly, so short:
      this exists only to kill the pop *in*, now that the pop *out* is gone. */
  birthFrac: 0.05,
  /** §10.0.1 — ±fraction on a ring's reach, re-rolled every cycle so a ring never repeats the
      one before it. This is *"not all uniform shapes"*. */
  sizeVariation: 0.25,
  /** §10.0.1 — radial perturbation amplitude. A ripple on a moving film is not a circle, and a
      perfect one is the detail that reads as drawn. */
  wobble: 0.12,
  /**
   * §10.0.1 — the ladder of centre-travel radii, in metres, tried largest first.
   *
   * Each emitter probes eight points around itself at each rung and keeps the largest radius
   * still wet on all eight, so the jitter is **measured against that emitter's own puddle**
   * rather than assumed. A global bound honest enough for the worst emitter is about 0.07 m and
   * invisible; measuring per emitter buys most of them five times that. An emitter in a narrow
   * blob earns 0.05 or nothing, which is correct — it is the one that would walk onto dry
   * asphalt and contradict §10.0's placement rule.
   */
  jitterLadder: [0.36, 0.26, 0.18, 0.1, 0.05],
  /** §10.0 — an annulus, not a disc. A *fraction* of the current radius, so the ring
      thins as it grows, which is what a spreading wavefront does. */
  ringThickness: 0.16,
  /** §10.0 — §6.2 paints 0.06 inside puddles and 0.55 on dry patches with a 14 px blur
      between. 0.20 is inside the water rather than on the transition, so no ring
      straddles an edge. */
  wetThreshold: 0.2,
  /**
   * §10.0 — minimum metres between emitters. 2.0 was set when there were twelve; §6.2 leaves
   * roughly 250 m² of water in the alley and 64 emitters do not fit in it at that spacing.
   *
   * Without it the sampler follows §6.2's centre bias straight into a clump: the first build
   * put four rings inside 2.4 m and left a 15 m stretch of alley with none, which reads as a
   * patch of rain rather than as rain. **Where the water is does not decide where a ring is
   * worth drawing.**
   */
  minSeparation: 1.1,
  /** §11.1's precedent — a fixed seed, so the emitters sit in the same puddles every run. */
  seed: 0x9d2b41,
  /**
   * A rejection sampler needs a bound, and this one scales with the count rather than with
   * confidence. Each accept makes the next one harder — every emitter placed is another
   * 1.1 m exclusion disc — so the 64th candidate is rejected far more often than the first.
   * 6000 leaves ample room; the cap exists only so a pathological mask cannot hang mount.
   *
   * Running out is not a failure worth throwing over: the emitters that were placed still
   * work, and a thinner scattering of rings beats a blank floor or a frozen page. Same call
   * §10.1 made about the rain.
   */
  maxSampleAttempts: 6000,
} as const

export const STEAM = {
  desktop: { vents: 3, spritesPerVent: 24 },
  mobile: { vents: 2, spritesPerVent: 12 },
  opacity: 0.08,
  riseSpeed: 0.35,
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §11 — Text, signage and painted textures
 * All text in the 3D world is a canvas texture. No Text3D, no troika, no font file
 * shipped for the world. The 2D overlays use the DOM.
 * ──────────────────────────────────────────────────────────────────────────── */

export const CANVAS_PAINTER = {
  /** Device px per world cm. */
  scale: 4,
  maxTextureSize: 1024,
  powerOfTwo: true,
  latinFace: 'ui-monospace, "SF Mono", "JetBrains Mono", monospace',
  japaneseFace: '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif',
  anisotropy: { desktop: 8, mobile: 4 },
  generateMipmaps: true,
  minFilter: 'LinearMipmapLinear',
  colorSpace: 'srgb',
  /** Once on mount, and once per project change. Never per frame. */
  redraw: 'onMountAndOnProjectChange',
} as const

/** §11.2 — type sizes on the content surfaces. Heights are in world metres. */
export const TYPE_SIZES = {
  /**
   * A **maximum**, not a size. 0.26 at +0.08 em stacks thirteen glyphs into §2.1's
   * 3.40 m sign, which covers every name in CONTENT.md today — and §17 requires a
   * fourteenth-character name to work with no component edited. A cap height authored as
   * a fixed number is a name length authored as a fixed number, so the painter fits down.
   */
  titleSignProjectName: { capHeight: 0.3, trackingEm: 0.1 },
  /* §11.2 — there are no `boardBlurb` or `boardTags` rows any more. §2.1.2 moved the
     description to the screen overlay, where type is measured in pixels rather than in
     metres, and the tags went entirely. They were raised twice chasing a reading distance
     that the screen's width kept moving — which is the argument for not putting prose on a
     surface in a world at all. */
  stationPlate: { height: 0.55 },
  /* §11.2 — there is deliberately no `tech` row, and no control sizes. CONTENT.md still
     carries `Tech` and §2.2's About material may want it, but §2.1's board shows the name,
     the blurb and the tags. The arrow glyphs and position dots went to §2.1.2's screen
     overlay, where they are measured in pixels rather than in metres. */
} as const

/**
 * §3.1 — the station `終電` plate over the shuttered gate, and §7's light 11 sits on it.
 *
 * **It is built with its light and not before.** The gate wall had nothing lighting it and
 * the fix is a light — but §7.1's rule is that a glowing thing needs a visible source, and
 * this plate had been deferred as *surroundings work* since the shell. A light at y = 4.2
 * with nothing at y = 4.2 would have been exactly the unmotivated glow §7.1 deleted four
 * lightformers for.
 *
 * The panel is sized from §11.2's 0.55 glyph rather than authored: two characters plus
 * 0.26 of padding either side. Written as arithmetic so a change to the type size moves the
 * panel with it.
 */
/**
 * §3.1 — the station gate: one full-width roller shutter and the closure notice on it.
 *
 * **§17's first line was false until this existed.** *"You turn round and the shutter is down"* —
 * §3.1 had said *roller shutter down* since the shell and the north wall was a bare facade box.
 *
 * The slats are §3.4's geometry at §3.4's own pitch, not §8's `normalRepeat`. A repeat scales with
 * the surface it is on; a pitch does not, and the pitch is a property of the shutter rather than of
 * the opening — so a 9.00 m gate gets the same 0.09 m slats as a 3.60 m shop, because they are the
 * same product. §3.4's note records the same reasoning for the five shop widths.
 */
export const STATION_GATE = {
  width: LAYOUT.alley.width,
  /** Head clears the 4.20 plate with 0.80 to spare. */
  headY: 3.4,
  slatPitch: STOREFRONT.slatPitch,
  slatDepth: STOREFRONT.slatDepth,
  /**
   * §3.1 — the closure notice, carrying the shinkansen pictogram *and* §11.4's index 21 on one
   * canvas, so it is one texture and one material.
   *
   * 2.10 is where a station actually posts a closure notice, and it is the only height on this
   * wall a visitor reads at 3.0 m without looking up — the plate above is for looking up at.
   */
  notice: {
    width: 1.15,
    height: 0.72,
    centreY: 2.1,
    proud: 0.04,
    stringIndex: 21,
    /** §8.1's station-plate rung, reused rather than extended: same municipal backlight. */
    emissive: EMISSIVE.stationPlate,
    color: 'signWhite',
    canvas: { desktop: [512, 256], mobile: [256, 128] },
  },
} as const satisfies { notice: { color: ColorToken; [k: string]: unknown }; [k: string]: unknown }

/** §3.1 — ⌊3.40 ÷ 0.09⌋. Derived, so a pitch change moves the count with it. */
export const STATION_GATE_SLAT_COUNT = Math.floor(STATION_GATE.headY / STATION_GATE.slatPitch)

export const STATION_PLATE = {
  glyphHeight: TYPE_SIZES.stationPlate.height,
  pad: 0.26,
  thickness: 0.06,
  /** §11.4 index 13 — the only place in the world that says it. */
  stringIndex: 13,
  emissive: EMISSIVE.stationPlate,
  color: 'signWhite',
} as const satisfies { color: ColorToken; [key: string]: unknown }

/**
 * §3.1 — the plate's built dimensions and pose, derived rather than authored.
 *
 * The face clears the north end wall by the wall's own half-thickness plus the plate's, so
 * it stands proud of the gate instead of z-fighting it.
 */
export const STATION_PLATE_PANEL = {
  width: STATION_PLATE.glyphHeight * 2 + STATION_PLATE.pad * 2,
  height: STATION_PLATE.glyphHeight + STATION_PLATE.pad * 2 * 0.6,
  centre: [
    0,
    LAYOUT.ends.north.plateY,
    LAYOUT.ends.north.z + LAYOUT.wallThickness / 2 + STATION_PLATE.thickness / 2,
  ],
} as const satisfies { width: number; height: number; centre: readonly [number, number, number] }

/**
 * §11.3 — neon flicker. Applied to the shopfront sign and to decorative signs 3 and 7.
 * Hand-authored and fixed, not random per frame: it is identical every run, which is
 * what stops it reading as noise. Reduced motion holds it at a constant 1.
 */
export const NEON_FLICKER = {
  sequence: [1, 1, 0.2, 1, 0.05, 0.9, 1, 1, 1, 0.4, 1],
  stepMs: 22,
  holdSec: 6.5,
  appliesToDecorativeSignIndices: [3, 7],
  /** §11.3 — the three banners flicker too, at 1.78 they are hard to miss doing it. */
  appliesToBannerIndices: [0, 1, 2],
  /**
   * §11.3 — phase, as a fraction of the period, per flickering thing.
   *
   * Without these the effect inverts. The stutter is 242 ms inside a 6.742 s period, so
   * everything reading the same clock stutters on the same frame: five objects blinking in
   * perfect unison, which reads as the street being switched rather than as five failing
   * tubes. Spread so no two coincide.
   */
  phase: {
    shopfront: 0.0,
    /** §3.6's brand sign. Offset so it never stutters with §2.1's, 52 m down the same sightline. */
    brandSign: 0.41,
    decorativeSign: { 3: 0.17, 7: 0.53 },
    banner: [0.31, 0.68, 0.86],
  },
} as const

/**
 * §11.4 — the only strings permitted in the surroundings. Assigned to signs by index,
 * never randomised, never project-related. A string that is not on this list and not
 * from CONTENT.md does not exist in the world.
 */
export const DECORATIVE_SIGNAGE = [
  '居酒屋',
  'ラーメン',
  '営業中',
  'カラオケ',
  '24H',
  '喫茶',
  '酒',
  '定食',
  '深夜',
  'お好み焼',
  'コインランドリー',
  '自動販売機',
  '禁煙',
  '終電',
  /* 14 – 20 — §3.4's seven lit sign boxes, one each by index. These are what a single
     small premises says about itself, where 0–13 are what the street says about itself:
     yakitori, sushi, oden, a standing bar, Chinese, a snack bar, sweets. The seven
     *unlit* boxes take nothing — an unlit box is `shutter` with no emissive term, and a
     slab you cannot read is exactly what a shut shop's sign box is. */
  '焼鳥',
  'すし',
  'おでん',
  '立呑',
  '中華',
  'スナック',
  '甘味',
  /* 21 — §3.1's gate notice. The railway's own phrase: *service has ended* is what a gate posts
     when the last train has gone, where 営業終了 (*business has ended*) is what a shop posts. It
     pairs with 終電 on the plate two metres above without repeating it — the plate names the thing
     that left and this says what that means for you. Index 2 営業中 was not an option: it means
     OPEN, and it is already on a neon sign. */
  '運転終了',
] as const

/**
 * §11.4 / §3.4 — where the sign-box strings start in `DECORATIVE_SIGNAGE`.
 *
 * Written as an offset rather than as a sliced copy of the list, for the same reason
 * §3.5's `stringOffset` is: the list is the source, and a second array of the same words
 * is a second place for them to drift.
 */
export const SIGN_BOX_STRING_OFFSET = 14

/* ────────────────────────────────────────────────────────────────────────────
 * §12 — Navigation
 * ──────────────────────────────────────────────────────────────────────────── */

export const CAMERA = {
  eyeHeight: 1.68,
  fovDeg: { landscape: 62, portrait: 70 },
  near: 0.1,
  far: 90.0,
  spawn: {
    position: [0, 1.68, -19.5],
    yawDeg: 0,
    pitchDeg: -4,
  },
  /**
   * §14.1 — the entry sweep: the world's first movement, started by `Enter` and by nothing
   * else. The camera starts `riseM` above `eyeHeight` and `backM` behind spawn — measured
   * along the direction spawn already faces, not as a raw `x`/`z` pair, so a retuned spawn
   * heading rotates the start point with it rather than leaving it pointed at a wall — and
   * eases from there into exactly the resting frame over `durationMs`. Same yaw and pitch
   * throughout; see `lib/entrySweep.ts`.
   *
   * **Diagonal, not vertical.** A pure rise-and-drop reads as an elevator; pulling the start
   * back along the facing direction as well turns the ease into a swoop down-and-in, which
   * reads as *arriving* rather than merely *lowering*.
   *
   * **`easeOutCubic`, not `easeInOutCubic`.** The sweep covers ground fastest at the moment it
   * starts and decelerates the whole way in, rather than building up speed through the middle —
   * a glide that is already moving when it begins and settles into the resting frame rather
   * than arriving at speed and having to be stopped.
   *
   * **§13 — off.** `REDUCED_MOTION.entrySweep` is `false`, and that flag has named this
   * feature since §13 was written, before it existed to turn off. Under reduced motion the
   * sweep never starts, so the first frame after `Enter` is already at the resting frame —
   * cutting straight to control in the most literal sense available.
   */
  entrySweep: {
    riseM: 0.9,
    backM: 2.6,
    durationMs: 1600,
    ease: 'easeOutCubic',
  },
} as const

/**
 * §2.1.1 — the locked reading pose for §2.1's board.
 *
 * **It lives here rather than beside `SHOWCASE` because it derives from `CAMERA.eyeHeight`,
 * and `CAMERA` is declared below `SHOWCASE`.** Placement by dependency, not by section
 * number; the alternative is a temporal dead zone that only fails at runtime.
 *
 * Only two figures are authored — the standoff and the lateral offset. Yaw and pitch are
 * *solved* from them and from the board, because a pose written as four independent numbers
 * is four numbers that can disagree with each other about where the board is.
 */
/**
 * §2.1.1 — 7.00, and this is the one figure in §2.1 that is **not** derived.
 *
 * The derivation said 8.46: that is where a 5.20 m screen fits *whole* inside §12.1's portrait
 * frame. At 8.46 the billboard reads as a thing on a wall across the alley, and it is supposed
 * to read as the thing you came to look at. 7.00 is a deliberate choice to be closer, and its
 * cost is stated rather than hidden — **in portrait the screen now slightly overruns the frame
 * edges.** Landscape is unaffected and has margin to spare.
 */
const LOCK_STANDOFF = 7.0
/**
 * Not composition. Head-on at 8.50 the eye lands at `x = -4.68`, well outside §3's clamp at
 * `-3.60`. Offset 1.60 along the face it comes back inside `BOUNDS` and clears the stop
 * §3.7's rubbish point imposes at `x = -3.38`. **Removing the vending machine at west
 * `z = 20.3` is what made this reachable at all** — see §16.12.
 */
const LOCK_LATERAL = 1.0
const LOCK_DISTANCE = Math.hypot(LOCK_STANDOFF, LOCK_LATERAL)

export const SHOWCASE_LOCK = {
  standoff: LOCK_STANDOFF,
  lateral: LOCK_LATERAL,
  /** Straight-line distance to the board centre — what §2.1's width was derived against. */
  distance: LOCK_DISTANCE,
  /** Turning off the face normal costs obliquity, which §2.1's width derivation pays for. */
  yawDeg: BEND.yawDeg - (Math.atan(LOCK_LATERAL / LOCK_STANDOFF) * 180) / Math.PI,
  /**
   * The centre of the assembly's **angular** extent from the pose — from the door's foot on
   * the ground to the screen's top edge. Not its geometric centre, because most of it stands
   * above eye height; aiming at the middle would put the top nearer the frame edge than the
   * bottom.
   */
  pitchDeg:
    (((Math.atan((SHOWCASE.titleSign.baseY - CAMERA.eyeHeight) / LOCK_DISTANCE) +
      Math.atan(
        (SHOWCASE.screen.baseY + SHOWCASE.screen.height - CAMERA.eyeHeight) / LOCK_DISTANCE,
      )) /
      2) *
      180) /
    Math.PI,
  ease: 'easeInOutCubic',
  durationMs: 600,
  /** §13 — linear rather than a jump: the lock starts from wherever the visitor stands, and
      a cut leaves them no way to tell whether they moved or the world did. */
  reducedMotion: { ease: 'linear', durationMs: 600 },
} as const

/** §2.1.1 — the pose in world space. Derived from §3.1's frame; never authored. */
export const showcaseLockPosition = (): [number, number, number] => [
  BEND.faceCentre[0] +
    SHOWCASE_LOCK.standoff * BEND.inward[0] +
    (SHOWCASE.t + SHOWCASE_LOCK.lateral) * BEND.along[0],
  CAMERA.eyeHeight,
  BEND.faceCentre[1] +
    SHOWCASE_LOCK.standoff * BEND.inward[1] +
    (SHOWCASE.t + SHOWCASE_LOCK.lateral) * BEND.along[1],
]

/** §12.2 — drag-to-look. One model on desktop and touch; never PointerLockControls. */
export const LOOK = {
  sensitivity: { desktop: 0.0022, touch: 0.0032 },
  pitchClampDeg: 62,
  yawUnlimited: true,
  /** Framerate-independent: α = 1 − exp(−smoothingRate · delta). */
  smoothingRate: 18,
  invertY: false,
  /**
   * A pointer that travelled further than this between down and up was a camera turn,
   * not a tap — interactive objects ignore it. Look-drag and click share the left
   * mouse button, so without this a drag ending over a door opens the door.
   */
  clickGuardPx: 6,
  /**
   * §12.2 — looking is gated on `canControl` exactly as movement is. An overlay covers
   * the screen; a drag across it must not spin the world behind it, and Escape returning
   * the visitor to a heading they did not choose reads as a bug in the overlay.
   */
  gatedOnCanControl: true,
} as const

export const WALK = {
  /** One speed, no run. It is 3am and you are tired. */
  speed: 2.6,
  /**
   * §12.3 — these two never apply at the same time. Together they are a first-order
   * system settling at acceleration ÷ damping = 1.2 m/s, less than half the 2.6 above.
   * Acceleration runs while there is input, damping while there is none.
   */
  acceleration: 12.0,
  damping: 10.0,
  stick: {
    sizePx: 128,
    deadZone: 0.12,
    position: 'bottom-left',
    /** §12.3 — plus env(safe-area-inset-*); a notched phone puts the home indicator here. */
    insetPx: 24,
  },
  headBob: { amplitude: 0.022, frequencyHz: 1.9 },
  /** Camera yaw only, flattened to the ground plane. */
  basis: 'cameraYawFlattened',
  /**
   * §12.3 — how the two input paths converge. Keyboard normalised so W+D is not 1.41×,
   * stick dead-zone remapped, the two summed and clamped to the unit disc. Summed, not
   * maxed: it is the only rule that keeps a half-pushed stick at half speed.
   */
  convergence: 'sumThenClampToUnitDisc',
} as const

/** §12.5 — the interact manager. One owner of the key; no station listens for it. */
export const INTERACT = {
  /**
   * 3.00 → 6.50, in two steps and for two different reasons. A radius is measured from the
   * station, and this station is on a wall §3's rectangular clamp cannot approach squarely:
   * at 3.00 the in-range region inside `BOUNDS` was a 3.2 × 1.4 m sliver pinned against the
   * `z = 21.4` clamp. Then §2.1's board grew to 3.20 m and its locked pose moved out to
   * 5.627 m to fit it in frame.
   *
   * **A radius that does not contain its own locked pose is a lock you cannot enter from
   * where it puts you** — press `E`, get pulled to 5.6 m, and the prompt that got you there
   * is out of range. It is large in absolute terms because the object is: 3.20 × 4.80 m is
   * the biggest thing in the alley a visitor can touch.
   */
  board: { radius: 9.5, prompt: 'E — View Projects' },
  /** §2.2 — the food cart. Contains §12.6's stop at 3.60 m with 0.40 to spare. */
  bio: { radius: BIO_STATION.interactRadius, prompt: 'E — About' },
  /**
   * §2.3 — the mailbox bank. **2.00 is authored and the *stop* moved to fit it**, not the
   * other way round: at §12.6's original 2.40 m standoff this radius would have had to grow
   * past 2.40, and a 2.40+ radius reaches 2.32 m to §2.1.1's locked pose — so standing at
   * the board you would be prompted for contact. `stationAudit`'s `wrong-station-at-stop`
   * is what found that, and it found it before either object existed.
   */
  /**
   * **The prompt names the boxes, not the key.** Every other station in the world has one
   * thing to press and `E — …` says it; this one has six, each going somewhere different, and
   * the panel `E` opens is the *fallback* rather than the point. §12.6 parks the visitor here
   * facing six labelled boxes, and a prompt that only mentioned a keyboard key on a wall full
   * of things to click was the least useful true sentence available.
   */
  contact: {
    radius: CONTACT_STATION.interactRadius,
    /**
     * **Two prompts, because the two tiers offer different things.**
     *
     * On a desktop the six boxes are the affordance: a pointer reaches any of them without
     * moving, and `E` is the fallback that lists them all. On a phone that is reversed — the
     * boxes are 0.44 m targets in a locked portrait frame, which is why §12.6 opens the panel
     * on arrival there (§2.1.2's argument), so the prompt should offer the thing that works
     * rather than the thing that is nominally true.
     */
    prompt: { desktop: 'Click a Mailbox · E for Overlay', mobile: 'Click to View All' },
  },
  promptFadeMs: 180,
} as const

/**
 * §12.6 — the guided path, for a visitor who does not want to walk.
 *
 * **This holds policy; `lib/guidedPath.ts` resolves the poses.** Three of the four stops
 * are *derived from the thing they are a stop for* — the board's from §2.1.1's locked pose,
 * the other two from where their stations actually stand — and two of them read
 * `lib/props.ts`, which imports this file. Concrete positions therefore cannot live here,
 * and putting them here anyway is exactly the drift §7.1 warns about: a stop written as its
 * own coordinate beside the thing it is a stop for goes stale silently, because a camera
 * two metres off still looks like a camera.
 */
export const GUIDED_PATH = {
  /**
   * **Ends on contact rather than on the board.** §12.6 used to say the tour ends on the
   * surface the whole piece is for, and that was right while contact was a payphone halfway
   * down the alley. With all three within eight metres of each other, the last thing to
   * leave a visitor looking at is the way to reach the person who made it.
   */
  order: ['spawn', 'about', 'work', 'contact'],
  spawn: { position: [0, CAMERA.eyeHeight, -19.5], yawDeg: 0, pitchDeg: -4 },
  /**
   * How far out from each wall station the visitor is put.
   *
   * **`contact` splits by tier, and it is the only stop that does.** The bank is 2.00 m wide
   * on a wall the visitor stands square to, so how much of it fits is decided entirely by
   * h-FOV — 35.8° in portrait against 62° landscape. Desktop frames all six from 1.60 m and
   * gets a 0.10 m label at a comfortable reading distance; a phone needs **3.34 m** to see the
   * same six, measured, and at 1.60 m showed 1.03 m of a 2.00 m bank.
   *
   * **The radius does not split with it.** 3.80 contains both, and it only became available
   * once §12.5 started preferring the station the visitor is *facing* — before that anything
   * over 2.32 m claimed §2.1.1's locked pose from behind the visitor's head.
   */
  standoff: { about: 3.6, contact: { desktop: 1.6, mobile: 3.4 }, gate: 3.0 },
  ease: 'easeInOutCubic',
  /**
   * **A speed, because `legDurationSec` was a duration and durations do not survive a stop
   * moving.** The legs are 38.6, 5.9 and 2.1 m now; 38.6 m in the authored 2.6 s is 14.8 m/s
   * — the precise fault §12.6 rejected once already, arrived at again from the other side.
   * 2.6 s was only ever right for the 26 m leg it was measured against, so it is read as
   * what it always was: a speed.
   *
   * **10 m/s → 5.0, because at 10 the visitor did not travel, they arrived.** §12.6's whole
   * premise is *a visitor who does not want to walk* — which is not the same as one who does
   * not want to **go**. Thirty-eight metres in under four seconds, accelerating through the
   * middle of an `easeInOutCubic`, reads as a cut with motion blur: the alley the tour exists
   * to show goes past too fast to be seen. 5.0 is a brisk walk — about twice §12.3's own
   * 2.6 m/s — so the first leg takes about eight seconds and the visitor watches forty metres
   * of street they would otherwise have had to walk. Any movement input still ends it
   * instantly, so nobody is held there.
   */
  glideSpeedMps: 5.0,
  /** So the 2.1 m leg is a move rather than a quarter-second snap. */
  minLegSec: 1.2,
  /** Quadratic through the alley centre, so a leg never clips a wall. */
  pathShape: 'quadraticThroughCentre',
  /** The visitor always wins: any movement input returns control immediately. */
  releaseOnInput: true,
  reducedMotion: { jump: true, fadeMs: 180, fadeThrough: 'void' },
} as const

/**
 * §12.7 — always present after the gate, on every device.
 *
 * **About first, matching §12.6's order.** The nav and the tour disagreeing about which
 * order the three surfaces come in is the kind of small incoherence a visitor cannot name
 * and does notice.
 */
export const TOP_NAV = ['About', 'Work', 'Contact', 'Next stop'] as const

/**
 * §12.7 — the studio's name in the corner, on the nav's own line.
 *
 * **The Latin counterpart to §3.6's katakana, and the reason that sign could change script.**
 * The brand sign is 52 m away behind 0.09 to 0.91 of §5's fog; this is screen-space type at a
 * fixed size on every device. Between them the world keeps its own language and a stranger
 * still reads the name in the first second.
 *
 * Here rather than in `Nav.tsx` for the same reason `TOP_NAV` is: it is a string the world
 * owns, and two copies of a name is one place for it to drift.
 */
export const WORDMARK = ['Jacinto', 'Design'] as const

/* ────────────────────────────────────────────────────────────────────────────
 * §13 — Reduced motion
 * Built in with the movement code, never retrofitted. Everything stays reachable —
 * reduced motion never means reduced access.
 * ──────────────────────────────────────────────────────────────────────────── */

export const REDUCED_MOTION = {
  headBob: false,
  cameraLookEasing: false,
  entrySweep: false,
  guidedPathJumps: true,
  projectTransitionMs: 0,
  neonFlicker: 'constant',
  groundNormalScroll: false,
  ripples: false,
  steam: { static: true, opacity: 0.05 },
  /** Slower rain reads as broken, not as calm — speed is unchanged. */
  rain: { opacity: 0.22, countMultiplier: 0.5, speedUnchanged: true },
  chromaticAberration: false,
  noise: false,
  /** Not motion. Unchanged. */
  unchanged: ['bloom', 'vignette', 'fog', 'reflections'],
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §14 — Threshold: gate, sound, hint
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * §14.1 — the entry gate.
 *
 * **The title is the name and the story is the line above it.** It was drafted the other way
 * round — a `終電 / LAST TRAIN DEPARTED` eyebrow over the vibe line, the name nowhere — which
 * is a mood board rather than a front door. The first screen of a portfolio has one job that
 * outranks atmosphere: say whose it is.
 */
export const GATE = {
  background: 'void',
  /**
   * **Two lines, not one, on every device.** The reveal below fades each in on its own beat,
   * which a single string cannot do — so this was always two elements; `sm` and up just let
   * them flow inline onto what usually reads as one line. Split at the sentence boundary
   * rather than left to wrap wherever the width breaks it, because *You've / missed the last
   * train* is not the same read as *You've missed / the last train*.
   */
  kickerLines: ["It's three AM.", "You've missed the last train."],
  title: 'Jacinto Design',
  /**
   * **A word, not a sentence.** `STEP OUT INTO THE RAIN` was the draft and it is copy rather
   * than a control: it wraps on a phone, and it is a third thing to read by a visitor who
   * decided two lines ago.
   */
  button: 'Enter',
  /**
   * §14.1 — no longer on the gate. It is `metadata.description` in `app/layout.tsx`, which is
   * the one place a sentence of atmosphere still has work to do.
   */
  vibeLine: "3am in Tokyo. You've just missed the last train. Neon reflections on wet pavement.",
  /** §13 — the panel is removed rather than faded, no fade to time. */
  fadeOutMs: 320,
  /**
   * **Five lines, five fades, one direction of travel.** `It's three AM.` → `You've missed the
   * last train.` → `Jacinto` → `Design` → `Enter`, each rising a few pixels and brightening in
   * after the one before it. It is the gate doing at the level of a sentence what §3.6's
   * traffic and §10's rain already do at the level of a scene: nothing in this world arrives
   * all at once, and the first five seconds should not be the exception.
   *
   * **Delays are relative to the panel's own mount, not to §14.1's ready state.** The story is
   * free to render on a slow connection exactly when it is free to render on a fast one — tying
   * it to the load would make the reveal a symptom of the wait rather than a piece of writing.
   *
   * §13 turns the sequence off rather than down: every line at full opacity, no motion, read
   * order unchanged.
   *
   * **All five lines fade in together, where an earlier pass staggered them 150 ms apart.**
   * The staggered read gave each line its own beat, but with the loading bar also gone
   * (§14.1) the panel no longer has a wait to fill — one simultaneous rise reads as the
   * screen arriving, not as five things queuing to be read.
   */
  reveal: {
    delayMs: [0, 0, 0, 0, 0],
    riseDurationMs: 480,
    risePx: 10,
    /**
     * **The button fades; it does not rise.** It is the one element on the gate a visitor is
     * about to press, and a target sliding into place under the cursor reads worse than one
     * that simply brightens. A full second, well past the 480 ms rise above it — with no
     * motion to carry the eye, the fade itself is what has to hold attention, and a slow one
     * reads as deliberate rather than as something arriving late.
     */
    buttonFadeMs: 1000,
  },
  /**
   * **The escape hatch, and it is here because this is the one screen that can trap someone.**
   * No WebGL, a context that failed to create, a driver that gave up — and the button never
   * enables, with nothing on screen saying why. It enables anyway after this.
   */
  readyTimeoutMs: 12_000,
} as const

/** §14.2 — all levels in dB, relative to a master that starts at −6. */
export const AUDIO = {
  /**
   * §14.2 — **−30, three steps down from where it started.** The first pass took this to −12,
   * half the amplitude of the original −6; the next took it to −24, a quarter of *that*. Half
   * of −24 dB's amplitude again is another −6.02 dB, so −30: `10^(-30/20) ≈ 0.0316`, which
   * against the −24 figure is `10^(-30/20) / 10^(-24/20) ≈ 0.501` — measured, not assumed,
   * the day this changed again. Every bed still sits at its own level relative to this,
   * unchanged — the mix balance was never the thing that moved.
   */
  masterDb: -30,
  beds: {
    rainOnAsphalt: { db: -18, loop: true },
    lowCityHum: { db: -26, loop: true },
    distantTrain: { db: -12, intervalSec: [40, 90], notWithinSecOfStationOpen: 10 },
    vendingCompressor: { db: -24, positional: true, falloffFrom: 6 },
    payphoneRing: { db: -22, positional: true, intervalSec: 34 },
    footsteps: { db: -20, frequencyHz: 1.9, roundRobin: 4 },
    interact: { db: -16 },
  },
  /** Never autoplays. Silent until the gate button, or until first interaction. */
  autoplay: false,
  /**
   * §14.2 — rain on asphalt, synthesised rather than sampled. No file: white noise has no
   * periodicity for a loop seam to expose, so a short buffer loops as cleanly as an infinite
   * one — see `lib/rainBed.ts`.
   */
  rainSynthesis: {
    /** Long enough that the loop is never audible, short enough to cost nothing to build. */
    bufferSeconds: 6,
    /**
     * **One lowpass, and that is the whole filter.** White noise carries equal energy at
     * every frequency; 900 Hz rolls the top few octaves off, which is the hiss a real gutter
     * does not have. Q **0.6**, under the biquad default of 1 — a resonant peak at the
     * cutoff is the filter *whistling*, and a whistling rain bed reads as a synthesiser.
     */
    lowpassHz: 900,
    lowpassQ: 0.6,
    /**
     * **The wobble is on the filter's cutoff, not on the gain.** Modulating loudness reads
     * as a pulse — a fader move; modulating *brightness* instead changes how the noise
     * sounds moment to moment without ever changing how loud it is, closer to how a real
     * gutter drifts. ±220 Hz around 900 on a 14 s cycle (0.07 Hz) is slow enough that no two
     * adjacent seconds sound different, which is what stops filtered noise reading as
     * static — static has no motion at all; this has motion too slow to name.
     */
    wobble: { rateHz: 0.07, depthHz: 220 },
  },
} as const

/**
 * §14.3 — the controls hint. **A dismissible panel with a persisted "seen" flag and a
 * standing way back in, not the auto-fading idle bar this constant used to describe.**
 *
 * The idle-bar design was never built, and it solved the wrong problem: it disappears on
 * its own schedule regardless of whether the visitor read it, and it comes back only after
 * 45 s of stillness — which is also, on this world, roughly how long a visitor spends
 * reading the food cart. A stranger who taps through it by accident had no way to ask for
 * it again short of waiting a minute. This version keeps the state instead of the timer:
 * shown once, automatically, the first time the gate is dismissed on a given browser
 * (`localStorage`, `lib/controlsHint.ts`'s own key), closed by its own **✕** or `Escape` or
 * a tap on the scrim, and always reachable again after that from a **`?`** button that
 * lives for as long as the world does — top-right beside §14.2's mute toggle, or
 * bottom-right beside it on a portrait phone; see `lib/controlsCorner.ts`.
 */
export const CONTROLS_HINT = {
  /**
   * §15.1's tier decides which of these a visitor reads — `resolveTier() === 'mobile'`
   * gets `touchLines`, everyone else gets `lines` — because a desktop visitor has no `E`
   * key story to tell touch's version and a phone has no `WASD` to explain. Two arrays
   * rather than one with a per-line device split: the split-inline version read as one
   * unfinished sentence per row (`WASD or the arrow keys — or the on-screen stick on
   * touch`), which is exactly the run-on shape the label/detail split was meant to fix,
   * just moved one level down. A visitor only ever has one input method in front of them;
   * the copy they read should only ever mention that one.
   *
   * In reading order, each split into the control and what it does — a short label a
   * visitor's eye can jump to on a second visit, a divider under every row.
   */
  lines: [
    { label: 'Look', detail: 'Drag anywhere to look around.' },
    { label: 'Move', detail: 'WASD or the arrow keys to walk.' },
    { label: 'Interact', detail: 'Press E near a station.' },
    { label: 'Tour', detail: '“Next stop” in the nav glides you to every stop.' },
  ],
  /** The touch tier's own copy — no keyboard named anywhere in it. */
  touchLines: [
    { label: 'Look', detail: 'Drag anywhere on screen to look around.' },
    { label: 'Move', detail: 'Use the on-screen stick, bottom left, to walk.' },
    { label: 'Interact', detail: 'Tap the prompt that appears near a station.' },
    { label: 'Tour', detail: '“Next stop” in the nav glides you to every stop for you.' },
  ],
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §15 — Performance budget
 * Measured on a mid-range phone, not the development machine.
 * ──────────────────────────────────────────────────────────────────────────── */

export const BUDGET = {
  desktop: {
    fps: 60,
    drawCalls: 140,
    triangles: 350_000,
    /**
     * §15 — 14 → 18. §3.5 flagged the overrun and ruled the budget itself was what should
     * be revisited, once; this is that once. The world stands at 16.94 MB and every lever
     * §3.5 listed costs more than the overrun did — and §10.0 has since given the puddle
     * mask a second job, so shrinking the largest consumer now degrades the ripples too.
     *
     * 18 rather than 17 because a ceiling set to today's total is raised again by the next
     * thing to arrive, and §16 item 6 (the project screenshots) is known not to fit at all.
     * **Mobile is the figure that describes a real constraint, and it did not move.**
     */
    textureMemoryMB: 18,
    /** §7 — 10 → 11. Ten was *exactly* full (1 hemisphere + §2's four + the alley's five),
        so §3.1's station gate had no slot. Moved by one, because one is what was missing. */
    dynamicLights: 11,
    timeToFirstFrameSec: 1.5,
  },
  mobile: {
    fps: 45,
    fpsFloor: 35,
    drawCalls: 90,
    triangles: 220_000,
    textureMemoryMB: 9,
    /**
     * §7 / §15 — **7 → 9, and the seven was never measured.**
     *
     * It was authored before any of §7's lights existed, when the world had six and a cap was
     * a guess about a phone. What it bought once the world was full: §7.1 surrendered two of
     * its five sign lights *and* §2.2's station light, and the mean frame at §12.6's about
     * stop came out at **14.4 against desktop's 51.6 — 28%**. Two of the three content
     * surfaces had nothing on them but emissive, which is the exact failure §7 exists to
     * prevent, on the tier §17's test is written about.
     *
     * **Nine is what this world needs minus the one light that is genuinely expensive.**
     * Light 2's `rectAreaLight` stays desktop-only for its type; the hemisphere, the gate,
     * §2.1's sign light, both station lights and four of §7.1's five fit inside it. A
     * `pointLight` in a forward renderer is a loop iteration per fragment, not a pass — what
     * actually constrains a phone here is fill rate, and §15 already caps DPR at 1.5, halves
     * the reflector and drops multisampling for that.
     *
     * **Then 9 → 10, because §7 #2 turned out to have no substitute.** Light 2's whole
     * contribution is the specular rectangle it makes in §6's mirror — the slab of lit board
     * on the wet road that is the first thing anyone looks at from spawn. A `pointLight`
     * stand-in gives a hot dot instead, so it is the wrong image rather than a dimmer one,
     * and it is kept on both tiers. Ten is then everything this world has except one of
     * §7.1's five sign lights.
     *
     * **This is the one figure in §15 not checked on a real device**, and it has now moved
     * twice in one pass, which is worth being uncomfortable about in writing. What makes it
     * defensible is that light *count* was never what constrains this world on a phone —
     * fill rate is, and §15 already caps DPR at 1.5, halves the reflector to 512, drops
     * multisampling and thins the rain for exactly that. **If a mid-range phone drops frames,
     * turn this back first**, before any of the levers that cost the picture.
     */
    dynamicLights: 10,
    timeToFirstFrameSec: 2.5,
  },
  /** Capped on both tiers. */
  maxPixelRatio: 1.5,
  engineChunkGzipKB: 600,
} as const

/** §15 — the turn-down ladder, in this order. Shadow maps are already off. */
export const TURNDOWN_ORDER = [
  'reflector resolution',
  'post-processing passes',
  'rain density',
  'draw calls (instance harder before deleting anything)',
  'shadow maps',
] as const
