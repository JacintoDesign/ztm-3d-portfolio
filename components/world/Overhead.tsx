'use client'

import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  CylinderGeometry,
  type InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { resolveTier } from '@/lib/device'
import { flickerLevel } from '@/lib/flicker'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { BANNERS } from '@/lib/signs'
import { neonSignTexture } from '@/lib/textures/neonSign'
import { LAYOUT, MATERIALS, NEON_FLICKER, OVERHEAD, PALETTE } from '@/lib/world'

/**
 * §3.1 / §3.5 — the overhead mat: 34 cable spans between y 6.50 and 9.00, three of them
 * carrying a cross-alley banner.
 *
 * §3.1 is explicit that there is no sky. This is what closes the top of the alley, and
 * the fog does the rest.
 *
 * **Each span is three straight segments approximating a catenary.** A real curve is a
 * tube geometry per cable and 34 of them; at 6.5 m up through fog at 0.03 density there
 * is no visible difference between three segments and thirty, and the whole mat is one
 * draw call this way.
 *
 * Not solid (§3.2), and 6.50 m clears a 1.68 m eye by a wide margin. No boxes.
 */

const dummy = new Object3D()
const UNIT_BOX = new BoxGeometry(1, 1, 1)
/** Radius 1, height 1, axis Y. Oriented per instance from its own direction vector. */
const UNIT_CYLINDER = new CylinderGeometry(1, 1, 1, 6, 1)

/* Hoisted — these are written once at mount, but allocating three Vector3s per segment
   across 102 segments is a habit worth not forming. */
const from = new Vector3()
const to = new Vector3()
const mid = new Vector3()
const direction = new Vector3()
const unitDirection = new Vector3()
const UP = new Vector3(0, 1, 0)

const SEED = 0x0cab1e

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

const lerp = (range: readonly [number, number], t: number) =>
  range[0] + (range[1] - range[0]) * t

/**
 * Every cable segment in the alley.
 *
 * Anchors sit on the two wall faces; most spans cross at an angle rather than square,
 * which is what stops the mat reading as a ladder. Sag is quadratic — three chords of a
 * parabola, which is close enough to a catenary at this scale that the difference is
 * under a centimetre.
 */
function buildSegments() {
  const random = mulberry32(SEED)
  const segments: { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number, number] }[] = []
  const helper = new Object3D()

  const zFrom = LAYOUT.alley.z[0] + 1
  const zTo = LAYOUT.alley.z[1] - 1
  const stride = (zTo - zFrom) / OVERHEAD.spans

  for (let i = 0; i < OVERHEAD.spans; i++) {
    const z = zFrom + stride * (i + 0.5) + (random() - 0.5) * stride * 0.6
    const skew = (random() - 0.5) * 2 * OVERHEAD.skew
    const yWest = lerp(OVERHEAD.y, random())
    const yEast = lerp(OVERHEAD.y, random())
    const sag = lerp(OVERHEAD.sag, random())

    /** Parabolic sag: 0 at both anchors, `sag` at mid-span. */
    const at = (t: number): [number, number, number] => [
      LAYOUT.alley.x[0] + (LAYOUT.alley.x[1] - LAYOUT.alley.x[0]) * t,
      yWest + (yEast - yWest) * t - sag * 4 * t * (1 - t),
      z + skew * t,
    ]

    for (let s = 0; s < OVERHEAD.segmentsPerSpan; s++) {
      from.set(...at(s / OVERHEAD.segmentsPerSpan))
      to.set(...at((s + 1) / OVERHEAD.segmentsPerSpan))
      mid.addVectors(from, to).multiplyScalar(0.5)
      direction.subVectors(to, from)

      // The cylinder's own axis is Y; turn it to face along this chord.
      unitDirection.copy(direction).normalize()
      helper.quaternion.setFromUnitVectors(UP, unitDirection)

      segments.push({
        position: [mid.x, mid.y, mid.z],
        scale: [OVERHEAD.radius, direction.length(), OVERHEAD.radius],
        rotation: [
          helper.quaternion.x,
          helper.quaternion.y,
          helper.quaternion.z,
          helper.quaternion.w,
        ],
      })
    }
  }

  return segments
}

export default function Overhead() {
  const tier = resolveTier()
  const segments = useMemo(() => buildSegments(), [])

  const cableMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: PALETTE[OVERHEAD.color],
        roughness: MATERIALS.paintedMetal.roughness,
        metalness: MATERIALS.paintedMetal.metalness,
        envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
      }),
    [],
  )

  const banners = useMemo(
    () =>
      BANNERS.map((banner) => {
        const texture = neonSignTexture(
          banner.text,
          banner.color,
          'horizontal',
          OVERHEAD.banner.canvas[tier],
          tier,
          'banner',
        )
        return {
          banner,
          material: new MeshStandardMaterial({
            map: texture,
            emissiveMap: texture,
            emissive: 0xffffff,
            /* `concrete`, not `void`. §3.4's rule — accent in the emissive only — is
               about lit panels; a banner is cloth with lit text on it, and painting the
               cloth `void` against a `void` background leaves the strings hanging in
               mid-air with no banner under them. The emissive map is dark everywhere but
               the glyphs, so the cloth stays cloth and only the text glows. */
            color: PALETTE.concrete,
            // §8.1 — the station plate's rung. Cloth read through, not tube.
            emissiveIntensity: OVERHEAD.banner.emissive,
            roughness: MATERIALS.norenFabric.roughness,
            metalness: MATERIALS.norenFabric.metalness,
          }),
        }
      }),
    [tier],
  )

  /**
   * §11.3 — the banners flicker, with a phase offset each.
   *
   * **The offsets are the whole point.** The stutter is 242 ms inside a 6.742 s period, so
   * three banners reading the same clock stutter on the same frame — which does not read as
   * three failing tubes but as somebody switching the street. §11.3 assigns 0.31, 0.68, 0.86.
   *
   * One frame callback for all three, mutating `emissiveIntensity` on the material directly.
   * This never reaches React state: sixty renders a second to dim a banner costs more than
   * the banner does.
   */
  useFrame((state) => {
    if (prefersReducedMotion()) {
      // §13 — constant 1. Not dimmed and not frozen mid-sequence: on.
      for (const { material } of banners) material.emissiveIntensity = OVERHEAD.banner.emissive
      return
    }
    banners.forEach(({ material }, i) => {
      const phase = NEON_FLICKER.phase.banner[i] ?? 0
      material.emissiveIntensity =
        OVERHEAD.banner.emissive * flickerLevel(state.clock.elapsedTime, phase)
    })
  })

  const attachCables = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      segments.forEach((segment, i) => {
        dummy.position.set(...segment.position)
        dummy.quaternion.set(...segment.rotation)
        dummy.scale.set(...segment.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      // An InstancedMesh otherwise culls against the geometry at the origin, and a mat
      // spread over 44 m vanishes as one cable sitting at the alley centre.
      mesh.computeBoundingSphere()
    },
    [segments],
  )

  const { banner } = OVERHEAD
  const wireY = banner.wireY

  return (
    <>
      <instancedMesh
        ref={attachCables}
        args={[UNIT_CYLINDER, cableMaterial, segments.length]}
      />

      {banners.map(({ banner: item, material }) => (
        <group key={item.index}>
          {/* The wire it hangs from — straight, because a loaded wire is. */}
          <mesh
            geometry={UNIT_CYLINDER}
            material={cableMaterial}
            position={[0, wireY, item.z]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[OVERHEAD.radius, LAYOUT.alley.width, OVERHEAD.radius]}
          />
          <mesh
            geometry={UNIT_BOX}
            material={material}
            position={[0, wireY - banner.drop - banner.height / 2, item.z]}
            scale={[banner.width, banner.height, 0.03]}
          />
        </group>
      ))}
    </>
  )
}
