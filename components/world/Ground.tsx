'use client'

import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, EdgesGeometry, type Texture, Vector2 } from 'three'
import { resolveTier } from '@/lib/device'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { puddleMask } from '@/lib/textures/puddleMask'
import { rippleNormal } from '@/lib/textures/rippleNormal'
import {
  BOUNDS,
  LAYOUT,
  MATERIALS,
  PALETTE,
  REFLECTOR,
  REFLECTOR_STRIP,
  RIPPLE_NORMAL,
  type Tier,
  v2,
} from '@/lib/world'

/**
 * §6 — the ground. The picture, budgeted first and cut last.
 *
 * Two surfaces, per §6.1: a 60 × 60 base plane whose overscan the fog hides, and the
 * 12 × 52 reflector strip over the alley. The reflector runs only across x ∈ [-6, 6]
 * because beyond that the fog has the floor anyway — and neither of its seams is ever
 * in frame, since the walls at x = ±4.5 stand 1.5 m inside the x-edge and the z-edge
 * sits 3 m behind each end wall.
 *
 * The gutter is carried by the puddle mask rather than by geometry (§3); its 0.03 recess
 * needs the floor to stop being a plane and is still open (§16.5).
 */

/** Flip to see the §3 walkable clamp. Nothing enforces it until the player exists. */
const SHOW_WALKABLE_BOUNDS = false

/** Hoisted — a Vector2 built in a render body would be rebuilt on every render. */
const NORMAL_SCALE = new Vector2(...v2(RIPPLE_NORMAL.normalScale))

/**
 * §6.2's ripple, sized for the base plane instead of for the strip.
 *
 * The two surfaces have to agree on **world tile size**, not on repeat count: §6.2's
 * `uvRepeat` of 8 lands on a 12 × 52 strip, which is 1.5 m per tile across and 6.5 m
 * along — the map is already anisotropic on the strip, and copying the number rather than
 * the metres onto a 70 × 70 plane would put 8.75 m tiles beside 1.5 m ones and draw a
 * line down the edge of the reflector.
 *
 * A clone rather than a second painting: `Texture.clone()` keeps the same `Source`, and
 * three's renderer caches uploads per source, so the two repeats cost one texture on the
 * GPU. §15's budget does not move.
 */
function baseRipple(tier: Tier): Texture | null {
  const source = rippleNormal(tier)
  if (source === null) return null

  const cached = baseRippleCache.get(tier)
  if (cached !== undefined) return cached

  const tileX = REFLECTOR_STRIP.width / RIPPLE_NORMAL.uvRepeat
  const tileZ = REFLECTOR_STRIP.length / RIPPLE_NORMAL.uvRepeat

  const texture = source.clone()
  texture.repeat.set(LAYOUT.ground.size / tileX, LAYOUT.ground.size / tileZ)
  texture.needsUpdate = true

  baseRippleCache.set(tier, texture)
  return texture
}

const baseRippleCache = new Map<Tier, Texture>()

function WalkableBounds() {
  const geometry = useMemo(() => {
    const width = BOUNDS.x[1] - BOUNDS.x[0]
    const depth = BOUNDS.z[1] - BOUNDS.z[0]
    return new EdgesGeometry(new BoxGeometry(width, 0.02, depth))
  }, [])

  const centreX = (BOUNDS.x[0] + BOUNDS.x[1]) / 2
  const centreZ = (BOUNDS.z[0] + BOUNDS.z[1]) / 2

  return (
    <lineSegments geometry={geometry} position={[centreX, 0.02, centreZ]}>
      <lineBasicMaterial color={PALETTE.neonCyan} />
    </lineSegments>
  )
}

export default function Ground() {
  const tier = resolveTier()
  const reflector = REFLECTOR[tier]

  // No useMemo: both painters already cache at module scope for the lifetime of the
  // page, so wrapping them would add a hook and memoise nothing.
  const mask = puddleMask(tier)
  const normalMap = rippleNormal(tier)
  const baseNormalMap = baseRipple(tier)

  useFrame((_, delta) => {
    if (normalMap === null) return
    // §13 — frozen under reduced motion. A direct read, never a subscription: sixty
    // React renders a second would cost more than everything else on screen.
    if (prefersReducedMotion()) return

    // The plane is rotated -90° about X, so texture V increases toward world -Z, which
    // means a rising offset carries the pattern toward +Z — the direction §6.2 asks for.
    // Wrapped to keep the value small; left to grow it loses float precision after hours.
    normalMap.offset.y = (normalMap.offset.y + RIPPLE_NORMAL.scrollUPerSec * delta) % 1

    /* The base plane scrolls at the same rate, and because it was given the strip's own
       world tile size that rate is the same *world* speed. Advancing it by anything else
       would drift the two surfaces apart over minutes — the kind of fault that is
       invisible on arrival and obvious to anyone who stands still. */
    if (baseNormalMap !== null) baseNormalMap.offset.y = normalMap.offset.y
  })

  return (
    <>
      {/* Base plane. It carries §6.2's ripple normal at the strip's own world tile size
          and scrolling in step with it, so the rain reads across the whole floor and not
          only over the alley — §3.6 put a road out here and a mirror-smooth carriageway
          beside a rippled alley is the seam that shows. It is not a reflector: what it
          gains is the surface, not the reflection. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYOUT.ground.y, 0]}>
        <planeGeometry args={[LAYOUT.ground.size, LAYOUT.ground.size]} />
        <meshStandardMaterial
          color={PALETTE.asphalt}
          roughness={reflector.roughness}
          metalness={MATERIALS.wetAsphalt.metalness}
          {...(baseNormalMap !== null
            ? { normalMap: baseNormalMap, normalScale: NORMAL_SCALE }
            : {})}
        />
      </mesh>

      {/* §6.1 — the reflector strip, 4 mm above the base plane. That lift is depth-buffer
          arithmetic and not a look choice: at near 0.10 / far 90.0 the conventional 1 mm
          separation z-fights at 40 m, which is exactly where nobody thinks to look. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, REFLECTOR_STRIP.y, 0]}>
        <planeGeometry args={[REFLECTOR_STRIP.width, REFLECTOR_STRIP.length]} />
        <MeshReflectorMaterial
          color={PALETTE.asphaltWet}
          resolution={reflector.resolution}
          blur={v2(reflector.blur)}
          mixBlur={reflector.mixBlur}
          mixStrength={reflector.mixStrength}
          mixContrast={reflector.mixContrast}
          depthScale={reflector.depthScale}
          minDepthThreshold={reflector.minDepthThreshold}
          maxDepthThreshold={reflector.maxDepthThreshold}
          depthToBlurRatioBias={reflector.depthToBlurRatioBias}
          distortion={reflector.distortion}
          mirror={reflector.mirror}
          reflectorOffset={reflector.reflectorOffset}
          roughness={reflector.roughness}
          metalness={reflector.metalness}
          {...(mask !== null ? { roughnessMap: mask, distortionMap: mask } : {})}
          {...(normalMap !== null ? { normalMap, normalScale: NORMAL_SCALE } : {})}
        />
      </mesh>

      {SHOW_WALKABLE_BOUNDS ? <WalkableBounds /> : null}
    </>
  )
}
