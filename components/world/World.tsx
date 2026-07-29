'use client'

import { Suspense, useCallback } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { PerspectiveCamera as ThreePerspectiveCamera } from 'three'
import { ACESFilmicToneMapping, ColorManagement, SRGBColorSpace } from 'three'
import Camera from '@/components/player/Camera'
import Player from '@/components/player/Player'
import TouchStick from '@/components/ui/TouchStick'
import { resolveTier, useIsPortrait } from '@/lib/device'
import { ATMOSPHERE, BUDGET, CAMERA, GL } from '@/lib/world'
import Alley from './Alley'
import Atmosphere from './Atmosphere'
import CrossStreet from './CrossStreet'
import FacadeWindows from './FacadeWindows'
import Ground from './Ground'
import NeonSigns from './NeonSigns'
import Overhead from './Overhead'
import Storefronts from './Storefronts'
import Traffic from './Traffic'

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
   * §12.1 — `YXZ`, set once when the camera mounts. Under three's default `XYZ`, pitching
   * rolls the horizon as you turn.
   *
   * A ref callback rather than a prop because the order has to be in place *before* any
   * rotation is written to this camera, including `Camera.tsx`'s first frame.
   *
   * The pose itself is not set here. `Camera.tsx` owns the rotation and `Player.tsx` owns
   * the position, both starting from `CAMERA.spawn`, and both from the first frame — a
   * declarative `position` prop would additionally teleport the visitor back to spawn on
   * every re-render, which the orientation change below would trigger mid-stride.
   */
  const applyRotationOrder = useCallback((camera: ThreePerspectiveCamera | null) => {
    if (camera === null) return
    camera.rotation.order = 'YXZ'
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
        <PerspectiveCamera makeDefault ref={applyRotationOrder} fov={fov} near={CAMERA.near} far={CAMERA.far} />
        {/* Camera before Player is documentation, not mechanism — the −2 / −1 frame
            priorities are what guarantee look runs before walk. */}
        <Camera />
        <Player />
        <Atmosphere />
        <Alley />
        {/* §3.3 / §3.4 / §3.5 — all sit on the alley envelope, so they follow it. */}
        <FacadeWindows />
        <Storefronts />
        <NeonSigns />
        <Overhead />
        {/* §3.6 — past the bend, and past §3's clamp. Nothing out here is reachable. */}
        <CrossStreet />
        {/* The vehicles are glTF files, so they suspend. The boundary is around Traffic
            alone and not around the world: hoisted any higher, four megabytes of car
            would hold the whole alley off the screen, and the one thing §3.6 is allowed
            to be is late. An empty road for a moment is the correct fallback. */}
        <Suspense fallback={null}>
          <Traffic />
        </Suspense>
        <Ground />
      </Canvas>

      {/* §12.3 — 2D overlay, so it lives outside the Canvas. Being a sibling of the
          canvas rather than a child is also what keeps a thumb on the stick away from
          the look listener. */}
      <TouchStick />
    </div>
  )
}
