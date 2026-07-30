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
  facade: '#10141D', // building walls
  facadeWarm: '#151119', // west facade, faintly warmer
  shutter: '#161B24', // roller shutters
  concrete: '#1A1F28', // kerbs, plinths, poles
  metalDark: '#1E242E', // brackets, condensers, railings
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
  verticalSigns: raise(2.4), //         2.40 → 4.20
  selectionButtons: raise(2.1), //      2.10 → 3.54
  payphoneLamp: raise(1.9), //          1.90 → 3.10
  vendingFrontPanel: raise(1.6), //     1.60 → 2.44
  vehicleTailLamp: raise(1.55), //      1.55 → 2.33
  /* Authored 1.30 → 1.50. Eleven of these are the warm spine of the alley and were
     reading as dull red shapes rather than as lit paper. §3.7. */
  paperLanterns: raise(1.5), //         1.50 → 2.22
  lightboxSurroundStrip: raise(1.4), // 1.40 → 2.00
  /* Authored 0.95 → 1.30, and it no longer shares a rung with the station plate. The
     old match was about *material* — both are read-through cloth, not tube — which put
     the three largest lit surfaces above eye level one hundredth of a step over the
     bloom knee. A banner is read from forty metres and a plate from four. §8.1. */
  overheadBanner: raise(1.3), //        1.30 → 1.78
  taxiRoofSign: raise(1.2), //          1.20 → 1.56
  openShutterSpill: raise(1.1), //      1.10 → 1.34
  /* Stays at 0.95. §3.1 calls it a *dark* backlit plate and §17's beat is that you
     notice it only when you turn round — barely-there is the specification. */
  stationPlate: raise(0.95), //         0.95 → 1.01, still edge, deliberately
  /* Held under the knee. Not candidates for the raise — see `raise` above. */
  storefrontSignBox: 0.85,
  facadeWindowBay: 0.55,
  infoPanelBacklight: 0.7,
  projectScreenshot: 0,
  /* §8 — the tube's 0.03 halo shell. Held at 0.6 although the tube it surrounds nearly
     doubled: its job is the soft gradient at the tube's edge, and it is under the knee so
     that the tube blooms and the halo does not. Scaled with the tube it would cross 0.90
     and put a second bloom source around all nine signs. */
  neonTubeHalo: 0.6,
} as const

/* ────────────────────────────────────────────────────────────────────────────
 * §3 — Layout
 * ──────────────────────────────────────────────────────────────────────────── */

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
    width: 0.6,
    /** Inner edge; outer edge meets the wall at x = ±4.5. */
    innerEdgeX: 3.9,
  },
  gutter: {
    width: 0.22,
    /** Centre line, both sides. */
    x: 3.72,
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
  { item: 'deadVendingMachines', count: 5, solid: true },
  { item: 'paperLanterns', count: 11, solid: false },
  { item: 'decorativeNeonSigns', count: 9, solid: false },
  { item: 'airConCondensers', count: 16, solid: false },
  { item: 'standpipes', count: 22, solid: true, solidCount: 12 },
  /* §3.2 — scooters, not bicycles. At this world's box-and-cylinder vocabulary a bicycle
     is a lattice of thin tubes that reads as noise; a scooter is five solids that read as
     one object. Same count, same places, same job — see §3.2 and §16.7. */
  { item: 'scooters', count: 4, solid: true },
  { item: 'crates', count: 9, solid: true },
  { item: 'conesAndBarriers', count: 3, solid: true },
  { item: 'steamVentGrates', count: 3, solid: false },
  { item: 'overheadCableSpans', count: 34, solid: false },
  { item: 'utilityPoles', count: 6, solid: true },
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
   * §15 — 512 across 8.00 m is 64 px/m. The §11.1 painter scale is a signage figure; at
   * 4 px/cm this bay would want 3200 px and spend the entire texture budget on one wall.
   */
  canvas: { desktop: 512, mobile: 256 },
  /** §6.1's depth arithmetic, unchanged — 1 mm z-fights at the far end, 4 mm does not. */
  offset: 0.004,
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
  rollRadius: 0.16,
  /** §2.1 gives the shopfront door 2.05; this is the ordinary version of that door. */
  doorway: { width: 0.9, height: 2.05, recess: 0.45 },
  /** Centred over the doorway, not over the unit — a shop sign hangs above its entrance. */
  signBox: { width: 1.3, height: 0.7, baseY: 2.85, proud: 0.14 },
  /** The doorway takes one end of the unit; the shutter aperture takes the rest. */
  doorGap: 0.15,
  /** Underside clears the 2.55 aperture head and stops below the 2.85 sign box. */
  awning: { count: 5, depth: 1.25, undersideY: 2.6, barRadius: 0.05, thickness: 0.07 },
  serviceGap: 1.8,
  /** §3.4 — nine shut and nobody in any of them. §1: nobody else is here. */
  states: { closed: 9, ajar: 3, open: 2 },
  /** How far the shutter still hangs when ajar — light under it is the whole point. */
  ajarClearance: 0.62,
  /** Rolled up to the head, but never fully gone. */
  openClearance: 2.3,
  litSignCount: 7,
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
  /** No unit may enter these — §2.1, §2.3 west; §2.2 east. */
  reserved: {
    west: [
      [-6.6, -1.4],
      [12.9, 15.1],
    ],
    east: [[5.1, 6.9]],
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
      rows: ['JACINTO', 'DESIGN'],
      /** §4's signature over §4's spice — the pairing that reads as branding, not as a shopfront. */
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
   * §3.7 — §2.2's body, unlit. Five more of the bio station's own object is what makes
   * the lit one mean something: it is the only lit drinks machine in the alley and it is
   * the one you can open. The front panel takes §2.2's 0.96 × 1.42 as a `void` slab and
   * there is no emissive term anywhere on it.
   */
  vendingMachine: {
    size: [1.12, 0.82, 1.94],
    kick: { height: 0.08 },
    front: { width: 0.96, height: 1.42, baseY: 0.44, proud: 0.03 },
    flap: { width: 0.7, height: 0.2, baseY: 0.16, proud: 0.04 },
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
    /** Faces down, under the canopy. §8.1's 1.10 — over the knee, under the lanterns. */
    lamp: { length: 1.7, depth: 0.7, y: 1.98, color: 'sodium', emissive: EMISSIVE.openShutterSpill },
    bodyColor: 'shutter',
    metalColor: 'metalDark',
    wheelColor: 'void',
  },

  /** §3.2's line, redrawn — see there for why a bicycle could not be built. */
  scooter: {
    size: [1.75, 0.62, 1.08],
    leanDeg: 8,
    floorpan: { length: 1.05, depth: 0.32, y: [0.3, 0.42] },
    cowl: { length: 0.66, depth: 0.4, y: [0.42, 0.84] },
    legShield: { length: 0.24, depth: 0.38, y: [0.36, 1.02] },
    seat: { length: 0.54, depth: 0.34, y: [0.84, 0.95] },
    wheel: { radius: 0.21, width: 0.07, spacing: 1.22 },
    bar: { radius: 0.018, length: 0.54, y: 1.04 },
    bodyColor: 'shutter',
    metalColor: 'metalDark',
    darkColor: 'void',
  },

  /** Stacks of 2 to 4, each stack offset and turned a little off square. */
  crate: {
    size: [0.52, 0.36, 0.31],
    /** Two tints of the same dark, so nine stacks do not read as nine materials. */
    colors: ['shutter', 'metalDark'],
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

  rubbishPoint: {
    drum: { radius: 0.3, height: 0.74 },
    lid: { radius: 0.32, height: 0.05 },
    sack: { size: [0.42, 0.36, 0.34] },
    drumColor: 'metalDark',
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
   * §3.7 — on §3's gutter centre, not against the wall: §3.4's fascia projects 0.35
   * across every unit above 2.55, so a pole behind 4.15 is buried for most of its
   * height. The cost is 0.11 m inside the walkable band, which is where a real one
   * stands. No pole may share a z span with an awninged unit (see §3.7).
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
  rubbishPoint: { drumColor: ColorToken; lidColor: ColorToken; sackColor: ColorToken; [key: string]: unknown }
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

/** §2.1 — the shopfront. One project at a time, everything generated from CONTENT.md. */
export const SHOWCASE = {
  wall: 'west',
  z: -4.0,
  recess: { width: 3.8, height: 4.6, depth: 0.55 },
  /** 16:8.5 — matches the 1920×1020 screenshots exactly, so nothing is cropped. */
  lightbox: { width: 3.2, height: 1.7, sillY: 1.02, glassOffset: 0.06 },
  neonSign: { width: 0.52, height: 3.4, x: -4.06, z: -4.0, baseY: 4.3 },
  infoPanel: { width: 1.1, height: 0.62, z: -5.9, sillY: 1.15 },
  door: { width: 1.0, height: 2.05, z: -2.3 },
  /** Small enamel plate beside the doorframe — opens the GitHub URL. */
  githubPlate: { y: 1.45 },
  advanceArrows: { size: 0.24, x: -4.28, y: 1.9, z: [-2.35, -5.65] },
  /** N comes from CONTENT.md. Never hardcoded. */
  positionIndicator: { dotDiameter: 0.05, spacing: 0.12, y: 0.88 },
  /**
   * §2.1 — the rule that protects the whole scene. The screenshot is basic-material,
   * tinted, and tone-mapped; its peak luminance must land below the bloom threshold.
   * The glow around the window comes from the surround, never from the image.
   */
  screenshot: { tint: '#A6B2C6', multiply: 0.68, toneMapped: true, emissive: 0 },
  surroundStrip: { width: 0.04, emissiveIntensity: EMISSIVE.lightboxSurroundStrip },
  /** Resting state when a screenshot fails to load. No spinner, no error, no white. */
  restingColor: '#0E121A',
  transitionMs: { toBlack: 140, hold: 90, fadeUp: 260 },
} as const

/** §2.2 — the vending machine. Reads the About material from CONTENT.md. */
export const BIO_STATION = {
  wall: 'east',
  body: { width: 1.12, depth: 0.82, height: 1.94 },
  x: 4.1,
  z: 6.0,
  facing: '-X',
  frontPanel: { width: 0.96, height: 1.42, baseY: 0.44, emissiveIntensity: EMISSIVE.vendingFrontPanel },
  buttons: { grid: [3, 4], size: 0.07, emissiveIntensity: EMISSIVE.selectionButtons },
  interactRadius: 2.2,
  idle: { breatheHz: 0.5, breatheAmplitude: 0.004 },
} as const

/** §2.3 — the payphone. Reads the contact channels from CONTENT.md. */
export const CONTACT_STATION = {
  wall: 'west',
  box: { width: 0.62, depth: 0.54, height: 1.36, plinthHeight: 0.28 },
  x: -4.16,
  z: 14.0,
  facing: '+X',
  awning: { width: 1.6, depth: 1.1, undersideY: 2.6, undersideEmissiveIntensity: 0.85 },
  handsetLamp: { emissiveIntensity: EMISSIVE.payphoneLamp },
  interactRadius: 2.0,
  /** Never more often than this. */
  idleRingIntervalSec: 34,
} as const

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
 * and the z-edge sits 3 m behind each end wall.
 */
export const REFLECTOR_STRIP = {
  x: [-6.0, 6.0],
  z: [-26.0, 26.0],
  width: 12.0,
  length: 52.0,
  y: 0.004,
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
   * Measured across the alley only, not the full strip. The 1.5 m of strip past each
   * wall is hidden geometry — counting it makes the generator flood the floor the
   * visitor can actually see in order to hit a global average.
   */
  coverageMeasureX: [-4.5, 4.5],
  blob: { ellipsesPerBlob: [3, 6], majorAxis: [0.8, 4.5] },
  /**
   * Water pools where it drains — centre of the alley, and the gutter lines. The
   * baseline is load-bearing: without it the weight falls to nothing between the bumps
   * and concentrates water into saturated bands instead of biasing a floor that is wet
   * throughout.
   */
  bias: { baseline: 0.38, centre: true, gutterX: 3.72, thinsAtKerb: true },
} as const

/** §6.2 — the resting ripple texture. The §10 emitters own the expanding rings. */
export const RIPPLE_NORMAL = {
  size: 512,
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

export const LIGHT_CAP = 10
export const MOBILE_LIGHT_CAP = 7

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
    intensity: 0.35,
    mobile: 'keep',
  },
  {
    id: 2,
    type: 'rectArea',
    size: [3.2, 1.7],
    color: 'signWhite',
    intensity: 4.0,
    position: [-4.28, 1.87, -4.0],
    facing: '+X',
    mobile: 'keep',
  },
  {
    id: 3,
    type: 'point',
    color: 'neonMagenta',
    intensity: 6.0,
    position: [-3.9, 6.0, -4.0],
    distance: 9.0,
    decay: 2,
    mobile: 'keep',
  },
  {
    id: 4,
    type: 'rectArea',
    size: [0.96, 1.42],
    color: 'vendGlow',
    intensity: 5.0,
    position: [3.98, 1.15, 6.0],
    facing: '-X',
    mobile: 'keep',
  },
  {
    id: 5,
    type: 'point',
    color: 'phoneGreen',
    intensity: 2.5,
    position: [-4.0, 1.6, 14.0],
    distance: 5.0,
    decay: 2,
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
  distance: 9.0,
  decay: 2,
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
export const ALLEY_LIGHTS = [
  { id: 6, sign: 1, intensity: 150, distance: 12.0, decay: 2, mobile: 'halve' },
  { id: 7, sign: 4, intensity: 130, distance: 11.0, decay: 2, mobile: 'halve' },
  { id: 8, sign: 6, intensity: 95, distance: 10.0, decay: 2, mobile: 'keep' },
  { id: 9, sign: 8, intensity: 115, distance: 9.0, decay: 2, mobile: 'keep' },
  { id: 10, sign: 0, intensity: 80, distance: 8.0, decay: 2, mobile: 'keep' },
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
export const LIGHT_SURRENDER_ORDER = [10, 9, 8] as const

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
  if (tier === 'desktop') return light.intensity
  return light.mobile === 'halve' ? light.intensity / 2 : light.intensity
}

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
     made twelve visible is more than the picture needs. Draw calls do not move at any count. */
  desktop: { emitters: 48 },
  mobile: { emitters: 21 },
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
   * §10.0 — the alley, not the strip. §6.1 runs the reflector 3 m behind each end wall and
   * 1.5 m past each side wall so its seams are never in frame; that margin is hidden
   * geometry, and a ring out there is one nobody can see, spent out of a budget of twelve.
   * The first build put two of its twelve behind the station gate.
   */
  sampleX: [-4.5, 4.5],
  sampleZ: [-23.0, 23.0],
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
  neonSignProjectName: { capHeight: 0.26, trackingEm: 0.08, vertical: true },
  infoPanelDescription: { height: 0.045, trackingEm: 0.02 },
  infoPanelTech: { height: 0.032, trackingEm: 0.1, uppercase: true, color: 'uiDim' },
  doorPlate: { height: 0.038, trackingEm: 0.14 },
  stationPlate: { height: 0.55 },
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
} as const

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
  shopfront: { radius: 3.0, prompt: 'E — view project' },
  vending: { radius: 2.2, prompt: 'E — about' },
  payphone: { radius: 2.0, prompt: 'E — contact' },
  promptFadeMs: 180,
} as const

/** §12.6 — the guided path, for a visitor who does not want to walk. */
export const GUIDED_PATH = {
  stops: [
    { name: 'spawn', position: [0, 1.68, -19.5], yawDeg: 0, pitchDeg: -4 },
    { name: 'shopfront', position: [-1.6, 1.68, -4.0], yawDeg: -90, pitchDeg: -2 },
    { name: 'vending', position: [1.9, 1.68, 6.0], yawDeg: 90, pitchDeg: -6 },
    { name: 'payphone', position: [-1.8, 1.68, 14.0], yawDeg: -90, pitchDeg: -8 },
  ],
  ease: 'easeInOutCubic',
  legDurationSec: 2.6,
  /** Quadratic through the alley centre, so a leg never clips a wall. */
  pathShape: 'quadraticThroughCentre',
  /** The visitor always wins: any movement input returns control immediately. */
  releaseOnInput: true,
  reducedMotion: { jump: true, fadeMs: 180, fadeThrough: 'void' },
} as const

/** §12.7 — always present after the gate, on every device. */
export const TOP_NAV = ['Work', 'About', 'Contact', 'Next stop'] as const

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

export const GATE = {
  background: 'void',
  eyebrow: '終電 / LAST TRAIN DEPARTED',
  vibeLine: "3am in Tokyo. You've just missed the last train. Neon reflections on wet pavement.",
  button: 'STEP OUT INTO THE RAIN',
  /** A 1 px rule filling left to right. Not a spinner. */
  progress: 'rule',
} as const

/** §14.2 — all levels in dB, relative to a master that starts at −6. */
export const AUDIO = {
  masterDb: -6,
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
} as const

export const CONTROLS_HINT = {
  appearAfterMs: 900,
  fadeAfterSec: 6,
  desktop: 'WASD / drag to look / E to interact',
  touch: 'stick to walk / drag to look / tap to interact',
  /** Never returns unless the visitor idles this long with no input. */
  returnAfterIdleSec: 45,
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
    dynamicLights: 7,
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
