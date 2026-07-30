'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type InstancedMesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { resolveTier } from '@/lib/device'
/* §13 touches the count and the opacity, both fixed at mount, and deliberately leaves the
   speed alone — slower rain reads as broken, not as calm. So the frame loop below never
   asks about it and only the reactive read is needed here. */
import { usePrefersReducedMotion } from '@/lib/reducedMotion'
import { rainStreakTexture } from '@/lib/textures/rainStreak'
import {
  CAMERA,
  PALETTE,
  RAIN,
  RAIN_BOX,
  RAIN_LEAN,
  RAIN_STREAK,
  type Tier,
} from '@/lib/world'

/**
 * §10 / §10.1 — the rain. Two instanced layers, one draw call each.
 *
 * **Quads, not points, and `gl_PointSize` is what decides it.** A point sprite's size is
 * a screen-space quantity: driver-capped, unrotatable, and growing as it nears the camera
 * in a way unrelated to distance. §10 asks for rain 0.06 m wide leaning 3.81° off
 * vertical — three properties a point sprite has none of, and a quad has all three for
 * one extra triangle.
 *
 * Nothing here allocates after mount and nothing reaches React state. The whole of a
 * frame is arithmetic over one `Float32Array` — the `InstancedMesh`'s own matrix buffer —
 * with the rotation and scale computed once and shared by every streak in the layer.
 */

/** Lies in XY facing +Z, so the billboard is a yaw and the streak runs up local Y. */
const PLANE = new PlaneGeometry(1, 1)

/**
 * §10.1's lean as a slope, which is the form the per-frame projection wants.
 *
 * Read from `RAIN_LEAN` rather than recomputed from the two speeds: the brief's derived
 * constant stays the single source, and the loop below cannot quietly disagree with it.
 */
const LEAN_SLOPE = Math.tan(RAIN_LEAN)

/** §11.1's precedent — a fixed seed, so the rain falls identically on every run. */
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
 * True modulo into `[min, min + size)`, whatever the input.
 *
 * §10 describes rain returning to the top, which is all a static box needs. The near box
 * follows the camera, so it also has to wrap in `x` and `z` — otherwise the visitor walks
 * out of their own rain and leaves it behind, which is invisible standing still and is
 * how the world gets checked. A modulo rather than a single `if` because it is also what
 * seeds the near layer: at mount the streaks sit around §12.1's spawn and the camera may
 * already be several box-widths away by the time this runs.
 */
function wrap(value: number, min: number, size: number): number {
  const offset = (value - min) % size
  return offset < 0 ? min + offset + size : min + offset
}

type LayerKey = 'near' | 'far'

function useLayerMaterial(layer: LayerKey, tier: Tier, reduced: boolean) {
  return useMemo(() => {
    const map = rainStreakTexture(tier)
    if (map === null) return null

    return new MeshBasicMaterial({
      color: PALETTE[RAIN.color],
      map,
      transparent: true,
      /* §13 — the near layer's 0.35 comes down to 0.22; the far layer is already there. */
      opacity: reduced
        ? Math.min(RAIN[layer][tier].opacity, RAIN.reducedMotion.opacity)
        : RAIN[layer][tier].opacity,
      /* §10 — never additive. §3.6 recorded why: FogExp2 mixes toward `fogColor` before
         the blend, so an additive quad at range arrives inside a visible dark box. */
      depthWrite: false,
    })
  }, [layer, tier, reduced])
}

function Layer({ layer, tier }: { layer: LayerKey; tier: Tier }) {
  const reduced = usePrefersReducedMotion()
  const material = useLayerMaterial(layer, tier, reduced)

  const spec = RAIN[layer]
  const [sizeX, sizeY, sizeZ] = spec.box
  /* §10.1 — area held at `pointSize²`, aspect held at the texture's 1 : 8. Taking the
     aspect alone makes each streak eight times the footprint §10's counts were written
     for, and forty metres of alley then accumulates into a pale sheet over the road. */
  const { width, length } = RAIN_STREAK[layer]

  /* §13 — count halves. It is fixed when the instance buffer is allocated, so it is read
     reactively here and never inside the frame loop. */
  const count = Math.round(
    spec[tier].count * (reduced ? RAIN.reducedMotion.countScale : 1),
  )

  /**
   * World positions, three floats per streak, hoisted for the life of the layer.
   *
   * Seeded around where the box will be at mount: §12.1's spawn for the near layer, §10's
   * static centre for the far one. `wrap` carries them the rest of the way on frame one.
   */
  const positions = useMemo(() => {
    const random = mulberry32(layer === 'near' ? 0x5aa1c0 : 0x2f1d77)
    const centre =
      layer === 'near'
        ? [
            CAMERA.spawn.position[0],
            RAIN_BOX.near.baseY + sizeY / 2,
            CAMERA.spawn.position[2],
          ]
        : RAIN_BOX.far.centre

    const array = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      array[i * 3] = (centre[0] as number) - sizeX / 2 + random() * sizeX
      array[i * 3 + 1] = (centre[1] as number) - sizeY / 2 + random() * sizeY
      array[i * 3 + 2] = (centre[2] as number) - sizeZ / 2 + random() * sizeZ
    }
    return array
  }, [count, layer, sizeX, sizeY, sizeZ])

  const meshRef = useRef<InstancedMesh | null>(null)

  const attach = useCallback((mesh: InstancedMesh | null) => {
    meshRef.current = mesh
    if (mesh === null) return
    /* The near box surrounds the camera by construction and the far box is §3's whole
       alley — neither is ever meaningfully out of frame, and an InstancedMesh otherwise
       culls against a bounding sphere at the origin. Two layers of quads is 8 000
       triangles against §15's 350 k; culling them is not worth the bounds arithmetic
       §3.6's traffic needed. */
    mesh.frustumCulled = false
  }, [])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (mesh === null) return

    /* Guard against a tab returning from the background with a delta of several seconds,
       which would otherwise wrap every streak through the box an unbounded number of
       times in one frame. A sixteenth of a second is four frames of rain. */
    const dt = Math.min(delta, 0.0625)

    const camera = state.camera
    const centreX = layer === 'near' ? camera.position.x : (RAIN_BOX.far.centre[0] as number)
    const centreZ = layer === 'near' ? camera.position.z : (RAIN_BOX.far.centre[2] as number)
    const baseY =
      layer === 'near'
        ? RAIN_BOX.near.baseY
        : (RAIN_BOX.far.centre[1] as number) - sizeY / 2

    const minX = centreX - sizeX / 2
    const minZ = centreZ - sizeZ / 2

    /**
     * §10.1 — one rotation and one scale for the whole layer, built here and shared by
     * every streak, which is what lets the matrices be written by hand below.
     *
     * The yaw is the camera's, so the quads face the visitor. The lean is §10's rain
     * lying along its own velocity, *projected into the billboard plane*: the plane's
     * local X is world `(cos ψ, 0, −sin ψ)`, so the visible part of a `+X` wind is
     * `windDrift · cos ψ`. Looking along the wind it correctly falls to zero — a streak
     * leaning the same way from every angle is the version of this that looks painted on.
     */
    const yaw = camera.rotation.y
    const cosYaw = Math.cos(yaw)
    const sinYaw = Math.sin(yaw)
    const lean = Math.atan(LEAN_SLOPE * cosYaw)
    const cosLean = Math.cos(lean)
    const sinLean = Math.sin(lean)

    // Columns of Ry(ψ)·Rz(lean), each already scaled. `+Y` maps toward `−X`, which is
    // where the trail of a drop moving `+X` actually is.
    const m0 = cosYaw * cosLean * width
    const m1 = sinLean * width
    const m2 = -sinYaw * cosLean * width
    const m4 = -cosYaw * sinLean * length
    const m5 = cosLean * length
    const m6 = sinYaw * sinLean * length

    const matrices = mesh.instanceMatrix.array as Float32Array
    const fall = RAIN.fallSpeed * dt
    const drift = RAIN.windDriftX * dt

    for (let i = 0; i < count; i++) {
      const p = i * 3

      const x = wrap((positions[p] as number) + drift, minX, sizeX)
      const y = wrap((positions[p + 1] as number) - fall, baseY, sizeY)
      const z = wrap(positions[p + 2] as number, minZ, sizeZ)

      positions[p] = x
      positions[p + 1] = y
      positions[p + 2] = z

      const m = i * 16
      matrices[m] = m0
      matrices[m + 1] = m1
      matrices[m + 2] = m2
      matrices[m + 3] = 0
      matrices[m + 4] = m4
      matrices[m + 5] = m5
      matrices[m + 6] = m6
      matrices[m + 7] = 0
      matrices[m + 8] = sinYaw
      matrices[m + 9] = 0
      matrices[m + 10] = cosYaw
      matrices[m + 11] = 0
      matrices[m + 12] = x
      matrices[m + 13] = y
      matrices[m + 14] = z
      matrices[m + 15] = 1
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  if (material === null) return null

  return (
    <instancedMesh
      name={`rain:${layer}`}
      ref={attach}
      args={[PLANE, material, count]}
    />
  )
}

export default function Rain() {
  const tier = resolveTier()

  return (
    <>
      <Layer layer="near" tier={tier} />
      <Layer layer="far" tier={tier} />
    </>
  )
}
