'use client'

import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, EdgesGeometry, Vector2 } from 'three'
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

  useFrame((_, delta) => {
    if (normalMap === null) return
    // §13 — frozen under reduced motion. A direct read, never a subscription: sixty
    // React renders a second would cost more than everything else on screen.
    if (prefersReducedMotion()) return

    // The plane is rotated -90° about X, so texture V increases toward world -Z, which
    // means a rising offset carries the pattern toward +Z — the direction §6.2 asks for.
    // Wrapped to keep the value small; left to grow it loses float precision after hours.
    normalMap.offset.y = (normalMap.offset.y + RIPPLE_NORMAL.scrollUPerSec * delta) % 1
  })

  return (
    <>
      {/* Base plane. Plain and matte — everything worth looking at happens on the strip
          above it, and this only exists so the world has a floor out to the fog. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAYOUT.ground.y, 0]}>
        <planeGeometry args={[LAYOUT.ground.size, LAYOUT.ground.size]} />
        <meshStandardMaterial
          color={PALETTE.asphalt}
          roughness={reflector.roughness}
          metalness={MATERIALS.wetAsphalt.metalness}
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
