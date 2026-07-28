'use client'

import { useCallback } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { PerspectiveCamera as ThreePerspectiveCamera } from 'three'
import { ACESFilmicToneMapping, ColorManagement, SRGBColorSpace } from 'three'
import { resolveTier, useIsPortrait } from '@/lib/device'
import { ATMOSPHERE, BUDGET, CAMERA, GL, degToRad, v3, yawToThreeRotationY } from '@/lib/world'
import Alley from './Alley'
import Atmosphere from './Atmosphere'
import Ground from './Ground'

/**
 * §5 — set explicitly rather than leaning on the renderer default. The brief names it,
 * so the code names it.
 */
ColorManagement.enabled = ATMOSPHERE.colorManagement

/**
 * The single <Canvas> for the whole world.
 *
 * There is never a second one: another Canvas carries its own renderer and scene graph
 * and halves the frame rate for nothing.
 */
export default function World() {
  const tier = resolveTier()
  const portrait = useIsPortrait()
  const fov = portrait ? CAMERA.fovDeg.portrait : CAMERA.fovDeg.landscape

  /**
   * The spawn pose, applied once when the camera mounts.
   *
   * Deliberately a ref callback and not a prop: `rotation.order` has to be set before
   * `rotation`, or the same three numbers describe a different orientation — and a
   * declarative `rotation` would be re-applied on every render, which would yank the
   * visitor back to spawn mid-stride the moment the player exists. This is a starting
   * position, not a value that tracks state.
   */
  const applySpawnPose = useCallback((camera: ThreePerspectiveCamera | null) => {
    if (camera === null) return
    // YXZ is the order that keeps yaw and pitch independent. Under the default XYZ,
    // pitching rolls the horizon as you turn.
    camera.rotation.order = 'YXZ'
    camera.rotation.set(
      degToRad(CAMERA.spawn.pitchDeg),
      yawToThreeRotationY(degToRad(CAMERA.spawn.yawDeg)),
      0,
    )
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        /* §7 — there is no sun at 3am. Grounding comes from the reflections and from
           painted contact-AO decals, not from shadow maps. */
        shadows={false}
        /* §15 — capped at 1.5 on both tiers, mobile and desktop alike. */
        dpr={[1, BUDGET.maxPixelRatio]}
        gl={{
          ...GL[tier],
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: ATMOSPHERE.toneMappingExposure,
          outputColorSpace: SRGBColorSpace,
        }}
      >
        {/* Declarative, so the §12.1 FOV split (62° landscape / 70° portrait) follows
            orientation on its own — drei re-runs updateProjectionMatrix on change. */}
        <PerspectiveCamera
          makeDefault
          ref={applySpawnPose}
          fov={fov}
          near={CAMERA.near}
          far={CAMERA.far}
          position={v3(CAMERA.spawn.position)}
        />
        <Atmosphere />
        <Alley />
        <Ground />
      </Canvas>
    </div>
  )
}
