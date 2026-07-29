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
    north: { z: -23.0, platePlateY: 4.2 },
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
  { item: 'bicycles', count: 4, solid: true },
  { item: 'crates', count: 9, solid: true },
  { item: 'conesAndBarriers', count: 3, solid: true },
  { item: 'steamVentGrates', count: 3, solid: false },
  { item: 'overheadCableSpans', count: 34, solid: false },
  { item: 'utilityPoles', count: 6, solid: true },
  { item: 'puddleDecals', count: 18, solid: false },
  { item: 'rippleEmitters', count: 12, solid: false },
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
  emissiveIntensity: 0.55,
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
  spillEmissive: 1.1,
  signEmissive: 0.85,
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
  projection: [0.55, 1.15],
  bracket: 0.05,
  mountY: [2.9, 5.2],
  /** §8 — the tube. `meshBasicMaterial`, colour at full, standing 0.03 proud all round. */
  rim: 0.03,
  /** §8.1 — vertical signs. */
  faceEmissive: 2.4,
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
    emissive: 0.95,
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
      count: 22,
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
        0.4, 2.25, 5.15, 8.05, 9.9, 12.8, 15.7, 17.55, 20.45, 23.35, 25.2,
      ],
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
    emissive: 2.6,
  },
  /** §8.1 — 1.55, over the knee but soft. Dimmer than the headlights, as they are. */
  tailLamp: {
    lateral: 0.22,
    height: 0.12,
    depth: 0.16,
    sideProud: 0.01,
    noseProud: 0.01,
    color: 'lantern',
    emissive: 1.55,
  },
  /**
   * §8.1 — 1.20. **Nothing carries this rung now.** It belonged to the box-built taxi's
   * 行灯, and none of the three models in `public/` is a taxi. Kept because the rung costs
   * nothing to leave on the ladder and inventing a roof light for a Range Rover would.
   */
  roofSign: { depth: 0.2, lateral: 0.46, height: 0.18, color: 'sodium', emissive: 1.2 },
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
  surroundStrip: { width: 0.04, emissiveIntensity: 1.4 },
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
  frontPanel: { width: 0.96, height: 1.42, baseY: 0.44, emissiveIntensity: 1.6 },
  buttons: { grid: [3, 4], size: 0.07, emissiveIntensity: 2.1 },
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
  handsetLamp: { emissiveIntensity: 1.9 },
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
  /** Built from Lightformers only. Baked once at mount — never re-rendered per frame. */
  environment: { resolution: 128, frames: 1 },
} as const

/**
 * §5.1 — environment lightformers.
 * These exist to feed the wet-ground reflections and the metal, not to light the scene
 * directly. Positions are [x, y, z].
 */
export const LIGHTFORMERS = [
  { form: 'rect', scale: [4, 10], position: [-6, 5, -4], color: 'neonMagenta', intensity: 2.4 },
  { form: 'rect', scale: [4, 10], position: [6, 5, 8], color: 'sodium', intensity: 1.8 },
  { form: 'rect', scale: [3, 8], position: [-6, 4, 14], color: 'neonCyan', intensity: 1.2 },
  { form: 'rect', scale: [12, 2], position: [0, 11, 0], color: 'void', intensity: 0.4 },
  { form: 'ring', scale: [6, 6], position: [0, 3, 22], color: 'lantern', intensity: 0.9 },
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

export const REFLECTOR = {
  desktop: {
    resolution: 1024,
    blur: [420, 100],
    mixBlur: 0.85,
    mixStrength: 8.0,
    mixContrast: 1.2,
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
    mixBlur: 0.95,
    mixStrength: 6.5,
    mixContrast: 1.2,
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
  {
    id: 6,
    type: 'point',
    color: 'sodium',
    intensity: 3.4,
    position: [3.4, 4.6, -14.0],
    distance: 12.0,
    decay: 2,
    mobile: 'halve',
  },
  {
    id: 7,
    type: 'point',
    color: 'neonMagenta',
    intensity: 3.0,
    position: [-3.4, 4.2, 2.0],
    distance: 11.0,
    decay: 2,
    mobile: 'halve',
  },
  {
    id: 8,
    type: 'point',
    color: 'neonCyan',
    intensity: 2.2,
    position: [3.4, 4.4, 11.0],
    distance: 10.0,
    decay: 2,
    mobile: 'drop',
  },
  {
    id: 9,
    type: 'point',
    color: 'lantern',
    intensity: 2.6,
    position: [-3.4, 3.4, 19.0],
    distance: 9.0,
    decay: 2,
    mobile: 'drop',
  },
  {
    id: 10,
    type: 'point',
    color: 'sodium',
    intensity: 1.8,
    position: [0, 3.0, -21.5],
    distance: 8.0,
    decay: 2,
    mobile: 'drop',
  },
] as const

/**
 * Light #1. Named because it is the only one of the ten that belongs to the atmosphere
 * rather than to an object — the other nine arrive with the things they light.
 */
export const HEMISPHERE_LIGHT = LIGHTS[0]

/** Resolve a light's intensity for a tier, or null if it drops. */
export const lightIntensityFor = (
  light: { intensity: number; mobile: 'keep' | 'halve' | 'drop' },
  tier: Tier,
): number | null => {
  if (tier === 'desktop') return light.intensity
  if (light.mobile === 'drop') return null
  return light.mobile === 'halve' ? light.intensity / 2 : light.intensity
}

/* ────────────────────────────────────────────────────────────────────────────
 * §8 — Materials
 * ──────────────────────────────────────────────────────────────────────────── */

export const MATERIALS = {
  /** Reflector material — see §6. */
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
  paperLantern: { roughness: 0.9, metalness: 0.0, emissiveIntensity: 1.3, doubleSide: true },
  neonTube: { roughness: 0.3, metalness: 0.0, basic: true, haloWidth: 0.03, haloIntensity: 0.6 },
} as const

/**
 * §8.1 — the emissive intensity ladder.
 * Bloom's threshold is 0.90. This is what sits either side of it, and the ordering is
 * the point: the project screenshot is the one thing that must never cross.
 */
export const EMISSIVE = {
  neonTubes: 3.2,
  verticalSigns: 2.4,
  selectionButtons: 2.1,
  payphoneLamp: 1.9,
  vendingFrontPanel: 1.6,
  lightboxSurroundStrip: 1.4,
  paperLanterns: 1.3,
  stationPlate: 0.95,
  infoPanelBacklight: 0.7,
  projectScreenshot: 0,
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
} as const

export const RIPPLES = {
  desktop: { emitters: 12 },
  mobile: { emitters: 6 },
  decalDiameter: 0.9,
  ringIntervalSec: 1.8,
  ringLifeSec: 1.4,
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
 * §11.3 — neon flicker. Applied to the shopfront sign and to decorative signs 3 and 7.
 * Hand-authored and fixed, not random per frame: it is identical every run, which is
 * what stops it reading as noise. Reduced motion holds it at a constant 1.
 */
export const NEON_FLICKER = {
  sequence: [1, 1, 0.2, 1, 0.05, 0.9, 1, 1, 1, 0.4, 1],
  stepMs: 22,
  holdSec: 6.5,
  appliesToDecorativeSignIndices: [3, 7],
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
] as const

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
    textureMemoryMB: 14,
    dynamicLights: 10,
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
