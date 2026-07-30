'use client'

import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  type MeshStandardMaterialParameters,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector2,
} from 'three'
import { CANVAS_PAINTER, SURFACE_GRAIN, type Tier } from '@/lib/world'

/**
 * §3.4 — the grain that stops every flat surface in the alley reading as plastic.
 *
 * A `MeshStandardMaterial` with one `color` and one `roughness` has, by construction, the
 * same response at every point on it: a 6 m fascia and a 0.20 m plinth return exactly the
 * same highlight, and §6's wet ground beside them is the only thing in frame that is not
 * perfectly even. This is the cheapest place to fix that — the material, not the geometry.
 *
 * **One height field, two maps.** The field is painted once; the grain texture is that
 * field as-is, and the normal texture is a Sobel of it. Two images derived from one source
 * cannot disagree about where a bump is, which is the same argument §3.3 makes for using
 * one canvas in `map` and `emissiveMap`.
 *
 * **White is the material as §4 and §8 authored it, and everything below white is damp.**
 * `map` multiplies the §4 token so darker texels darken it; `roughnessMap` multiplies the
 * §8 roughness so the same texels make it *glossier*. Darker and shinier is wrong on a dry
 * wall and exactly right on one standing in §10's rain. Both are multiplies, so this canvas
 * can only ever take a surface away from its authored value in one direction: **nothing
 * here can make a surface lighter or rougher than the palette says it is.**
 *
 * **Isotropic on purpose.** Everything this goes on is a unit box scaled per instance, so a
 * 6.20 m fascia and a 0.30 m pier sample the same 0 → 1 UV and the texture arrives stretched
 * by up to 4:1. A blotch or a streak stretched 4:1 reads as a smear; speckle stretched 4:1
 * is still speckle. That is a constraint of the instancing this world needs for its draw
 * calls, answered by choosing the right noise rather than by fighting it.
 */

export type GrainClass = keyof typeof SURFACE_GRAIN.repeat

const SEED = 0x5c07eed

/** Deterministic PRNG — the same wall on every machine, on every load. §3.3's precedent. */
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

/**
 * The height field, as a `Float32Array` in 0 → 1 rather than as pixels.
 *
 * Kept as numbers because both consumers want it as numbers: the grain canvas writes it
 * straight out, and the Sobel needs neighbours. Reading it back out of a canvas with
 * `getImageData` would quantise it to 8 bits before the gradient is taken, which is where
 * a normal map picks up banding on a gentle slope.
 */
function heightField(size: number): Float32Array {
  const random = mulberry32(SEED)
  const field = new Float32Array(size * size)

  /**
   * Broad damp patches, as a sum of a few smooth waves at irrational frequency ratios so
   * nothing tiles visibly against itself. `patchScale` is in canvas widths, and the whole
   * texture then repeats per §3.4's `repeat` — two independent scales, which is what keeps
   * the coarse layer coarse when the fine layer is tiled three times across a pier.
   */
  const waves = Array.from({ length: 5 }, () => ({
    fx: (0.6 + random() * 2.4) * SURFACE_GRAIN.patchScale,
    fy: (0.6 + random() * 2.4) * SURFACE_GRAIN.patchScale,
    phase: random() * Math.PI * 2,
    weight: 0.35 + random() * 0.65,
  }))
  const totalWeight = waves.reduce((sum, wave) => sum + wave.weight, 0)

  /**
   * **The coarse layer is a third of the fine one and that ratio is the whole tuning.**
   * Built the other way round first — broad patches carrying most of the amplitude — it
   * came out as camouflage: a wall of dark blotches at a scale the eye reads as *shape*
   * rather than as *surface*, which is a worse failure than the flatness it was fixing,
   * because a flat wall at least reads as a wall. Damp gathers in a few places and
   * aggregate is everywhere; the amplitudes should say so.
   */
  for (let y = 0; y < size; y++) {
    const v = y / size
    for (let x = 0; x < size; x++) {
      const u = x / size
      let patch = 0
      for (const wave of waves) {
        patch +=
          wave.weight *
          Math.sin(u * wave.fx * Math.PI * 2 + wave.phase) *
          Math.cos(v * wave.fy * Math.PI * 2 + wave.phase * 1.7)
      }
      field[y * size + x] = (patch / totalWeight) * 0.3
    }
  }

  /* Aggregate. One texel at a time rather than a blur of a coarser layer — this is the
     part that has to survive a 4:1 stretch, and a single texel is the only feature that
     stretches to something still smaller than a pixel at any distance the alley offers.
     Two-sided: chips catch light, pores lose it. One-sided reads as dirt sprayed on. */
  const speckles = Math.round(size * size * SURFACE_GRAIN.speckleDensity)
  for (let i = 0; i < speckles; i++) {
    const at = Math.floor(random() * field.length)
    field[at] = (field[at] as number) + (random() - 0.5)
  }

  /**
   * Normalised into `[darkest, 1]` rather than clamped there, so **`darkest` is the one
   * knob and it means exactly what it says**: the darkest texel on the wall, as a fraction
   * of the §4 token. Clamping instead — which is what this did first — leaves the actual
   * range depending on how the two layers happened to sum, so turning the brief's number
   * down moved the floor without moving the *look*, and the texture was tuned by changing
   * numbers that were not the ones doing the work.
   */
  let lo = Infinity
  let hi = -Infinity
  for (const value of field) {
    if (value < lo) lo = value
    if (value > hi) hi = value
  }
  const span = hi - lo || 1
  const floor = SURFACE_GRAIN.darkest
  for (let i = 0; i < field.length; i++) {
    field[i] = floor + (((field[i] as number) - lo) / span) * (1 - floor)
  }

  return field
}

function grainCanvas(field: Float32Array, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const image = ctx.createImageData(size, size)
  for (let i = 0; i < field.length; i++) {
    const value = Math.round((field[i] as number) * 255)
    image.data[i * 4] = value
    image.data[i * 4 + 1] = value
    image.data[i * 4 + 2] = value
    image.data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

/**
 * The tangent-space normal, Sobel of the same field.
 *
 * Wrapped sampling on both axes, because the texture tiles: a gradient taken against a
 * clamped edge leaves a seam line every `repeat` across the wall, which is exactly the
 * kind of artefact that reads as a modelling error rather than as a texture bug.
 */
function normalCanvas(field: Float32Array, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const at = (x: number, y: number): number =>
    field[(((y % size) + size) % size) * size + (((x % size) + size) % size)] as number

  const image = ctx.createImageData(size, size)
  /**
   * **1.5, and it was 8.** A Sobel over a field whose fine layer changes by a tenth from
   * one texel to the next returns a gradient near 1 at every texel, and multiplying that
   * by 8 tips almost every normal flat against the surface — which is not bumpy concrete,
   * it is a wall with no consistent facing at all, and under §7's grazing light it reads
   * as boiling static. **Per-class strength belongs in `normalScale`**, where §3.4 puts
   * it and where it can differ between render and fabric; this number's only job is to
   * get the map into a sane range first.
   */
  const strength = 1.5

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))

      const nx = dx * strength
      const ny = dy * strength
      const length = Math.hypot(nx, ny, 1)

      const index = (y * size + x) * 4
      image.data[index] = Math.round(((nx / length) * 0.5 + 0.5) * 255)
      image.data[index + 1] = Math.round(((ny / length) * 0.5 + 0.5) * 255)
      image.data[index + 2] = Math.round((1 / length) * 255)
      image.data[index + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

type Painted = { grain: CanvasTexture; normal: CanvasTexture }

const painted = new Map<Tier, Painted>()

function paint(tier: Tier): Painted | null {
  if (typeof document === 'undefined') return null

  const cached = painted.get(tier)
  if (cached !== undefined) return cached

  const size = SURFACE_GRAIN.canvas[tier]
  const field = heightField(size)

  const grain = new CanvasTexture(grainCanvas(field, size))
  /* Colour: it multiplies a §4 token in `map`. `roughnessMap` reads the green channel raw
     and therefore reads it sRGB-encoded — deliberate, and recorded in §3.4: it compresses
     the roughness excursion against the albedo one, which is the safe direction, and
     correcting it would mean a second texture. */
  grain.colorSpace = SRGBColorSpace

  const normal = new CanvasTexture(normalCanvas(field, size))
  // Data, not colour. An sRGB decode here bends every normal toward the surface.
  normal.colorSpace = NoColorSpace

  for (const texture of [grain, normal]) {
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
    texture.minFilter = LinearMipmapLinearFilter
    texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
    texture.needsUpdate = true
  }

  const result = { grain, normal }
  painted.set(tier, result)
  return result
}

const clones = new Map<string, Painted>()

/**
 * The grain and normal for one surface class, at that class's `repeat`.
 *
 * **Clones, not new textures.** A `repeat` lives on the `Texture`, not on the material, so
 * three classes at three repeats need three texture objects — but a clone shares its
 * `Source` with the original, and three keys its GPU upload on the source. Three classes
 * therefore cost one upload each for grain and normal, which is what §15's figure assumes.
 */
export function surfaceGrain(surface: GrainClass, tier: Tier): Painted | null {
  const key = `${tier}:${surface}`
  const cached = clones.get(key)
  if (cached !== undefined) return cached

  const base = paint(tier)
  if (base === null) return null

  const repeat = SURFACE_GRAIN.repeat[surface]
  const grain = base.grain.clone()
  const normal = base.normal.clone()
  for (const texture of [grain, normal] as Texture[]) {
    texture.repeat.set(repeat, repeat)
    texture.needsUpdate = true
  }

  const result = { grain, normal }
  clones.set(key, result)
  return result
}

/**
 * The same thing as material parameters, ready to spread into a constructor.
 *
 * The one call site's worth of assembly, written once: **`map` and `roughnessMap` are the
 * same texture**, which is §3.4's rule and the thing most likely to be quietly undone by
 * someone wiring a second painter in later. Returns `{}` where there is no document, so a
 * material built during SSR is simply the untextured one it was before this file existed.
 */
export function grainParams(
  surface: GrainClass,
  tier: Tier,
): Pick<MeshStandardMaterialParameters, 'map' | 'roughnessMap' | 'normalMap' | 'normalScale'> {
  const textures = surfaceGrain(surface, tier)
  if (textures === null) return {}

  const scale = SURFACE_GRAIN.normalScale[surface]
  return {
    map: textures.grain,
    roughnessMap: textures.grain,
    normalMap: textures.normal,
    normalScale: new Vector2(scale, scale),
  }
}
