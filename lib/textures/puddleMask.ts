'use client'

import { CanvasTexture, ClampToEdgeWrapping, LinearMipmapLinearFilter, NoColorSpace } from 'three'
import { CANVAS_PAINTER, PUDDLE_MASK, REFLECTOR_STRIP, type Tier } from '@/lib/world'

/**
 * §6.2 — the puddle mask.
 *
 * One greyscale map, used twice: as `roughnessMap` and as `distortionMap` on the ground.
 * Dark is wet (roughness 0.06, near-mirror), light is dry (0.55, genuinely matte).
 *
 * It maps 1:1 onto the reflector strip — no UV repeat — so puddles are anchored to
 * world positions and stay put as the visitor walks. U runs along world X, V along
 * world Z, which is why the canvas is 12 units wide and 52 tall in world terms.
 *
 * Painted once and cached. Never per frame, and never with `Math.random()`: the alley
 * looks identical on every load, which is the difference between a designed floor and
 * a floor that happens differently each time you open the page.
 */

const SEED = 0x5ea51de

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

/** Roughness 0..1 to an 8-bit grey level. */
const level = (roughness: number) => Math.round(roughness * 255)

/**
 * Where water collects, as a weight over world X.
 *
 * Three terms. The baseline is the important one and is why this is not simply two
 * bumps: §6.2 asks for a *bias* toward the centre and the gutters, and a weight that
 * falls to nothing between them does not produce a biased floor — it produces a
 * saturated one. With no baseline the centre reaches 100% wet long before the global
 * coverage target is met, every dry patch gets pushed out past x = ±4.5 where the walls
 * hide it, and the visitor walks on an unbroken mirror with no dry islands at all.
 *
 * On top of that baseline: the crown of a narrow alley sheds toward the middle, and the
 * gutter lines at x = ±3.72 are where the water actually runs. The weight drops away
 * past the walls, which the visitor never sees.
 */
function wetnessWeight(x: number, z: number): number {
  /* **Everything below models the alley's drainage, so past the bend none of it applies.**
     The crown at `x = 0` and the gutters at `|x| = 3.02` both run *along* the alley; §3.6's
     carriageway runs across it, and its crown and gutters are perpendicular to every term
     here. Applied out there the profile made the far road dry wherever the alley happened to
     be dry — measured at 5.8% wet against the alley's 59.8%, on the one stretch of ground
     with traffic on it and a §6.0 reflection of the traffic in it. §6.2's flat figure is this
     function's own mean over the alley, so the far road gets the same expected density
     without a second invented profile. */
  if (z >= PUDDLE_MASK.bias.beyondWallsToZ) return PUDDLE_MASK.bias.crossStreet

  const baseline = PUDDLE_MASK.bias.baseline
  const centre = 0.3 * Math.exp(-((x / 2.6) ** 2))
  const gutter = 0.28 * Math.exp(-(((Math.abs(x) - PUDDLE_MASK.bias.gutterX) / 0.5) ** 2))
  /* The 1.5 m of strip past each wall is hidden geometry — §6.1 runs it out there so no seam
     is ever in frame — and a puddle on it is a puddle nobody can see. */
  const beyondWalls = Math.abs(x) > 4.5 ? 0.25 : 1
  return (baseline + centre + gutter) * beyondWalls
}

/* ────────────────────────────────────────────────────────────────────────────
 * World ↔ texel, in one place
 *
 * **The painter and the sampler disagreed about which way `z` ran, and had since §6.2.**
 * `paint()` drew a blob at `row = (z − z0) × pxPerMetre`, so row 0 was the *north* end;
 * `puddleWetnessAt()` read `row = (1 − v) × height`, so row 0 was the *south* end. The
 * plane is rotated −90° about X, which puts texture V along −Z, so the sampler was the one
 * that matched the render — and the whole mask was therefore **painted mirrored in z**.
 *
 * Nothing showed it. `wetnessWeight` had no `z` term, so a z-flip of a z-symmetric field is
 * the same field, and §10's emitters landed in real puddles because the sampler and the
 * render agreed with each other. It surfaced the moment §6.2 asked for a blob *in a named
 * region*: every cross-street blob went to the north end of the alley and the region it was
 * aimed at stayed dry through four thousand attempts.
 *
 * Both conversions live here now. A world-to-texel mapping written twice is a mapping that
 * can be written twice differently.
 * ──────────────────────────────────────────────────────────────────────────── */

const toColumn = (x: number, width: number): number =>
  ((x - REFLECTOR_STRIP.x[0]) / REFLECTOR_STRIP.width) * width

const toRow = (z: number, height: number): number =>
  (1 - (z - REFLECTOR_STRIP.z[0]) / REFLECTOR_STRIP.length) * height

function paint(tier: Tier): HTMLCanvasElement {
  const { width, height, boundaryBlurPx } = PUDDLE_MASK.size[tier]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const pxPerMetreX = width / REFLECTOR_STRIP.width
  const pxPerMetreZ = height / REFLECTOR_STRIP.length

  // Dry asphalt everywhere, then water on top of it.
  ctx.fillStyle = `rgb(${level(PUDDLE_MASK.roughnessDry)} ${level(PUDDLE_MASK.roughnessDry)} ${level(PUDDLE_MASK.roughnessDry)})`
  ctx.fillRect(0, 0, width, height)

  const wet = level(PUDDLE_MASK.roughnessWet)
  ctx.fillStyle = `rgb(${wet} ${wet} ${wet})`

  const random = mulberry32(SEED)
  const [minEllipses, maxEllipses] = PUDDLE_MASK.blob.ellipsesPerBlob
  const [minAxis, maxAxis] = PUDDLE_MASK.blob.majorAxis

  /**
   * Blobs go down until every §6.2 region has met the target, rather than to a fixed
   * count — a count would drift away from 60% the moment any size or bias value changed.
   * The cap is a guard against a weight function that can never reach the target, not an
   * expected outcome.
   *
   * **Each pass fills whichever region is furthest behind**, which is the fix for a
   * single global average satisfying itself on the alley and leaving §3.6's carriageway
   * at 5.8%. Blob centres are drawn from that region **grown by half the largest major
   * axis**, so a blob can straddle the boundary and the region has an edge that water
   * found rather than one that was measured.
   */
  const MAX_BLOBS = 4000
  const CHECK_EVERY = 15
  let placed = 0

  while (placed < MAX_BLOBS) {
    const levels = PUDDLE_MASK.coverageRegions.map((region) =>
      coverage(ctx, width, height, region),
    )
    let worst = 0
    for (let i = 1; i < levels.length; i++) {
      if ((levels[i] as number) < (levels[worst] as number)) worst = i
    }
    if ((levels[worst] as number) >= PUDDLE_MASK.coverage) break

    const region = PUDDLE_MASK.coverageRegions[worst] as (typeof PUDDLE_MASK.coverageRegions)[number]
    const bleed = maxAxis / 2
    const [xFrom, xTo] = [region.x[0] - bleed, region.x[1] + bleed]
    const [zFrom, zTo] = [region.z[0] - bleed, region.z[1] + bleed]

    for (let i = 0; i < CHECK_EVERY; i++) {
      // Rejection-sample a centre so blobs follow the wetness weight.
      let cx = 0
      let cz = 0
      for (let attempt = 0; attempt < 24; attempt++) {
        cx = xFrom + random() * (xTo - xFrom)
        cz = zFrom + random() * (zTo - zFrom)
        if (random() < wetnessWeight(cx, cz)) break
      }

      // Each puddle is a union of overlapping ellipses — a single ellipse reads as a
      // stencil, and the overlap is what gives an edge that looks like water finding
      // a low spot rather than a shape someone drew.
      const count = Math.floor(minEllipses + random() * (maxEllipses - minEllipses + 1))
      const major = minAxis + random() * (maxAxis - minAxis)

      for (let e = 0; e < count; e++) {
        const spread = major * 0.35
        const ex = cx + (random() - 0.5) * spread
        const ez = cz + (random() - 0.5) * spread * 1.6
        const rx = (major * (0.35 + random() * 0.4)) / 2
        const rz = rx * (0.6 + random() * 0.9)

        ctx.beginPath()
        ctx.ellipse(
          toColumn(ex, width),
          toRow(ez, height),
          rx * pxPerMetreX,
          rz * pxPerMetreZ,
          random() * Math.PI,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      placed++
    }
  }

  return blur(canvas, boundaryBlurPx)
}

/**
 * Fraction of one §6.2 region that is wet, measured on a coarse sample of the hard-edged
 * art before it is blurred.
 *
 * **Per region, not globally.** The bounds are what the visitor can see — the alley's walls,
 * and §3.1's mouth slot for the cross street. §6.1 runs the strip 1.5 m past each wall and
 * 3 m behind each end wall so no seam is ever in frame, and that margin is hidden geometry:
 * counting it drags the average down and the loop floods the part you *can* see to
 * compensate. A single average over the alley and the cross street had the same failure in
 * the other direction — it was satisfied by the alley alone and left the far road dry.
 */
function coverage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  region: { x: readonly [number, number]; z: readonly [number, number] },
): number {
  const midpoint = (level(PUDDLE_MASK.roughnessWet) + level(PUDDLE_MASK.roughnessDry)) / 2
  const step = 8
  const { data } = ctx.getImageData(0, 0, width, height)

  /* V runs opposite to the row order — the plane is rotated −90° about X — so a region's
     `z` maximum is its *first* row. */
  const fromX = Math.max(0, Math.round(toColumn(region.x[0], width)))
  const toX = Math.min(width, Math.round(toColumn(region.x[1], width)))
  const fromY = Math.max(0, Math.round(toRow(region.z[1], height)))
  const toY = Math.min(height, Math.round(toRow(region.z[0], height)))

  let wet = 0
  let total = 0

  for (let y = fromY; y < toY; y += step) {
    for (let x = fromX; x < toX; x += step) {
      const red = data[(y * width + x) * 4] ?? 255
      if (red < midpoint) wet++
      total++
    }
  }

  return total === 0 ? 0 : wet / total
}

/** §6.2 — 14 px at the boundary, so puddles have an edge rather than a cutout. */
function blur(source: HTMLCanvasElement, radiusPx: number): HTMLCanvasElement {
  const target = document.createElement('canvas')
  target.width = source.width
  target.height = source.height

  const ctx = target.getContext('2d')
  if (ctx === null) return source

  ctx.filter = `blur(${radiusPx}px)`
  ctx.drawImage(source, 0, 0)
  ctx.filter = 'none'
  return target
}

const cache = new Map<Tier, CanvasTexture>()

/** The mask, painted on first call and cached for the lifetime of the page. */
export function puddleMask(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const cached = cache.get(tier)
  if (cached !== undefined) return cached

  const canvas = paintedCanvas(tier)
  if (canvas === null) return null

  const texture = new CanvasTexture(canvas)
  // Data, not colour. Tagging this sRGB would push every roughness value through a
  // gamma curve and quietly make the whole floor wetter than the brief says.
  texture.colorSpace = NoColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cache.set(tier, texture)
  return texture
}

/**
 * §10.0 — the mask's second job: telling §10's ripple emitters where the water is.
 *
 * **Sampled from the painted canvas, not from `wetnessWeight`.** The weight function
 * describes the *bias* — centre channel, gutters, thinning at the kerb — and the canvas
 * describes the *blobs* that were actually dealt from it. A ring has to expand inside a real
 * puddle, not merely in a wet-ish region, or it contradicts the one document that says where
 * the puddles are.
 *
 * One `getImageData` on first call, cached for the page. Nothing here runs per frame; the
 * emitters resolve their positions once at mount.
 *
 * Returns the mask value in `[0, 1]` — §6.2's roughness, so **low means wet** (0.06 inside
 * puddles, 0.55 on dry patches). Out-of-range coordinates read dry, which keeps the caller
 * from having to clamp before asking.
 */
export function puddleWetnessAt(tier: Tier): ((x: number, z: number) => number) | null {
  if (typeof document === 'undefined') return null

  const cached = samplerCache.get(tier)
  if (cached !== undefined) return cached

  const canvas = paintedCanvas(tier)
  if (canvas === null) return null

  const ctx = canvas.getContext('2d')
  if (ctx === null) return null

  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)

  /* §6.2 — the mask maps 1:1 onto the reflector strip, no UV repeat, so world position
     converts straight to a texel, through the same two helpers `paint()` uses. */
  const [x0, x1] = REFLECTOR_STRIP.x
  const [z0, z1] = REFLECTOR_STRIP.z

  const sampler = (x: number, z: number): number => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return PUDDLE_MASK.roughnessDry

    const px = Math.min(width - 1, Math.max(0, Math.floor(toColumn(x, width))))
    const py = Math.min(height - 1, Math.max(0, Math.floor(toRow(z, height))))
    return (data[(py * width + px) * 4] ?? 255) / 255
  }

  samplerCache.set(tier, sampler)
  return sampler
}

const samplerCache = new Map<Tier, (x: number, z: number) => number>()

/**
 * The painted canvas behind the texture, cached separately.
 *
 * `CanvasTexture.image` is the canvas, so this could read it back off the texture — but that
 * couples the sampler to the texture having been built, and §10's emitters mount before
 * §6's ground on a cold cache. Painting is idempotent and cached either way.
 */
const canvasCache = new Map<Tier, HTMLCanvasElement>()

function paintedCanvas(tier: Tier): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const cached = canvasCache.get(tier)
  if (cached !== undefined) return cached
  const canvas = paint(tier)
  canvasCache.set(tier, canvas)
  return canvas
}
