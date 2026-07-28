'use client'

import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
} from 'three'
import { CANVAS_PAINTER, RIPPLE_NORMAL, type Tier } from '@/lib/world'

/**
 * §6.2 — the resting ripple normal map.
 *
 * Fine isotropic stipple, no direction. This is only the texture the water sits at;
 * the §10 ripple emitters own the expanding rings. A second directional cue on top of
 * the +0.012 u/s scroll would read as a texture sliding rather than as water.
 *
 * Every dimple is wrapped toroidally, so the map tiles seamlessly at repeat 8 — at that
 * repeat each tile covers 1.5 m of the 12 m strip, which puts the dimples at 2–7 cm.
 * Raindrop scale, which is the scale it has to be.
 *
 * Built once and cached. Deterministic, like the puddle mask.
 */

const SEED = 0x21bb1e5

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

/** §6.2 — how hard the height field bends into normals, before `normalScale` scales it. */
const SLOPE = RIPPLE_NORMAL.slope

function buildHeightField(size: number): Float32Array {
  const height = new Float32Array(size * size)
  const random = mulberry32(SEED)
  const [minRadius, maxRadius] = RIPPLE_NORMAL.dimples.radiusPx

  for (let d = 0; d < RIPPLE_NORMAL.dimples.count; d++) {
    const cx = random() * size
    const cy = random() * size
    const radius = minRadius + random() * (maxRadius - minRadius)
    const depth = 0.45 + random() * 0.55
    const twoSigmaSq = 2 * (radius / 2) ** 2
    const reach = Math.ceil(radius * 1.8)

    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const distSq = dx * dx + dy * dy
        if (distSq > reach * reach) continue

        // Wrapping the write, not the read, is what makes the tile seamless — a dimple
        // near an edge comes back in on the opposite side instead of being clipped.
        const x = (((Math.round(cx) + dx) % size) + size) % size
        const y = (((Math.round(cy) + dy) % size) + size) % size
        height[y * size + x] -= depth * Math.exp(-distSq / twoSigmaSq)
      }
    }
  }

  // One faint low-frequency swell so the eye does not find the grid the dimples sit on.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const v = (y / size) * Math.PI * 2
      height[y * size + x] += 0.06 * (Math.sin(u * 2 + 0.7) * Math.cos(v * 3 - 0.4))
    }
  }

  return height
}

function paint(): HTMLCanvasElement {
  const size = RIPPLE_NORMAL.size
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) return canvas

  const field = buildHeightField(size)
  const image = ctx.createImageData(size, size)
  const { data } = image

  const at = (x: number, y: number): number => {
    const wx = ((x % size) + size) % size
    const wy = ((y % size) + size) % size
    return field[wy * size + wx] ?? 0
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Central differences. Sampling wraps, so the gradient is continuous across the
      // seam and the tiling stays invisible.
      const dx = (at(x + 1, y) - at(x - 1, y)) * SLOPE
      const dy = (at(x, y + 1) - at(x, y - 1)) * SLOPE

      const length = Math.hypot(-dx, -dy, 1)
      const nx = -dx / length
      const ny = -dy / length
      const nz = 1 / length

      const i = (y * size + x) * 4
      data[i] = Math.round((nx * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

let cached: CanvasTexture | null = null

/** The ripple normal, painted on first call and cached for the lifetime of the page. */
export function rippleNormal(tier: Tier): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  if (cached !== null) return cached

  const texture = new CanvasTexture(paint())
  // Normals are vectors, not colour. sRGB here would bend every one of them.
  texture.colorSpace = NoColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(RIPPLE_NORMAL.uvRepeat, RIPPLE_NORMAL.uvRepeat)
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true

  cached = texture
  return texture
}
