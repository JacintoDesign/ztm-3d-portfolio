'use client'

import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { expose } from '@/lib/debug'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { canControl, getMode, setMode } from '@/lib/store'
import { CAMERA, LOOK, degToRad, yawToThreeRotationY } from '@/lib/world'

/**
 * §12.2 — drag-to-look. One model for mouse, pen and touch.
 *
 * **Never `PointerLockControls`.** It contests `Escape` with the overlays, hides the
 * cursor the visitor needs to click a door, and has to be released and recaptured around
 * every locked view. Pointer events on the canvas, yaw and pitch on module state.
 *
 * This file owns the camera's *rotation*; `Player.tsx` owns its position. Step 5's locked
 * view and guided path graft onto the same shape — a target pose, an ease, a release —
 * which is what `look` already is.
 */

/**
 * Yaw is kept in the brief's convention throughout (§12.1: yaw 0 faces `+Z`) and
 * converted to three's exactly once, at the write below. §12.1 is explicit that the
 * conversion must not be sprinkled around, because one missing `+ π` faces the visitor
 * at a wall for reasons that look like a layout bug.
 *
 * Module scope, so `Player` reads the smoothed yaw for its movement basis with a direct
 * read rather than a subscription.
 */
export const look = {
  yaw: degToRad(CAMERA.spawn.yawDeg),
  pitch: degToRad(CAMERA.spawn.pitchDeg),
  targetYaw: degToRad(CAMERA.spawn.yawDeg),
  targetPitch: degToRad(CAMERA.spawn.pitchDeg),
}

const PITCH_LIMIT = degToRad(LOOK.pitchClampDeg)

/** One look pointer at a time, tracked by id — the other thumb belongs to the stick. */
let activePointerId: number | null = null
let lastX = 0
let lastY = 0
/* Annotated, because `world.ts` is `as const` and the inferred type would be the literal
   0.0022 — which then rejects the touch value at the first assignment. */
let sensitivity: number = LOOK.sensitivity.desktop

export default function Camera(): null {
  const domElement = useThree((state) => state.gl.domElement)
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)

  // Dev only; compiled away in production. `gl.info.render` is how the §15 draw-call
  // budget gets read — the alternative is guessing from a screenshot.
  useEffect(() => {
    expose('camera', camera)
    expose('gl', gl)
    expose('setMode', setMode)
    expose('getMode', getMode)
  }, [camera, gl])

  useEffect(() => {
    function onPointerDown(event: PointerEvent): void {
      if (activePointerId !== null) return
      if (!event.isPrimary && event.pointerType !== 'touch') return
      // Left button only on a mouse; touch and pen report button 0 on contact.
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (!canControl()) return

      activePointerId = event.pointerId
      lastX = event.clientX
      lastY = event.clientY
      sensitivity =
        event.pointerType === 'touch' ? LOOK.sensitivity.touch : LOOK.sensitivity.desktop

      // Capture is what keeps a drag alive once it leaves the window. Without it the
      // camera stops mid-turn at the viewport edge and never receives the pointerup.
      domElement.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent): void {
      if (event.pointerId !== activePointerId) return

      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY

      if (!canControl()) return

      // Right drag turns right, which is a *decreasing* world yaw: facing +Z puts world
      // −X on the visitor's right, and −X is yaw −90°. Down drag looks down (§12.2:
      // invert Y, no).
      look.targetYaw -= dx * sensitivity
      look.targetPitch -= dy * sensitivity

      // Clamped at the target, not after the ease, so the ease approaches a legal value
      // instead of being cut short at one every frame.
      if (look.targetPitch > PITCH_LIMIT) look.targetPitch = PITCH_LIMIT
      else if (look.targetPitch < -PITCH_LIMIT) look.targetPitch = -PITCH_LIMIT
    }

    function release(event: PointerEvent): void {
      if (event.pointerId !== activePointerId) return
      activePointerId = null
    }

    domElement.addEventListener('pointerdown', onPointerDown)
    domElement.addEventListener('pointermove', onPointerMove)
    domElement.addEventListener('pointerup', release)
    // Both matter: `pointercancel` is the incoming phone call, `lostpointercapture` is
    // the browser taking the capture back. Missing either leaves the camera turning.
    domElement.addEventListener('pointercancel', release)
    domElement.addEventListener('lostpointercapture', release)

    return () => {
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerup', release)
      domElement.removeEventListener('pointercancel', release)
      domElement.removeEventListener('lostpointercapture', release)
      activePointerId = null
    }
  }, [domElement])

  /**
   * Priority −2, so this runs before `Player`'s −1 and the movement basis is never a
   * frame stale. Negative priorities order callbacks *without* taking over the render
   * loop — only a positive one would make us responsible for calling `gl.render`.
   */
  useFrame((state, delta) => {
    if (prefersReducedMotion()) {
      // §13 — camera easing on look: off, direct.
      look.yaw = look.targetYaw
      look.pitch = look.targetPitch
    } else {
      // §12.2 — framerate-independent, so a 120 Hz phone and a 60 Hz laptop feel the same.
      const alpha = 1 - Math.exp(-LOOK.smoothingRate * delta)
      look.yaw += (look.targetYaw - look.yaw) * alpha
      look.pitch += (look.targetPitch - look.pitch) * alpha
    }

    // The one conversion. `rotation.order` is set to YXZ on the camera in World.tsx,
    // which is what keeps these two axes independent.
    state.camera.rotation.y = yawToThreeRotationY(look.yaw)
    state.camera.rotation.x = look.pitch
  }, -2)

  return null
}
