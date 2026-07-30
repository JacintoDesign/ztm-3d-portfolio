'use client'

import { useCallback, useMemo } from 'react'
import {
  BoxGeometry,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { resolveTier } from '@/lib/device'
import { gateNoticeTexture } from '@/lib/textures/gateNotice'
import {
  LAYOUT,
  MATERIALS,
  PALETTE,
  STATION_GATE,
  STATION_GATE_SLAT_COUNT,
} from '@/lib/world'

/**
 * §3.1 — the station ticket gate: one full-width roller shutter, down, with the closure notice on it.
 *
 * **§17's first line was false until this file existed.** *"You spawn facing an empty alley. You turn
 * round and the shutter is down. You understand what happened without being told."* §3.1 had said
 * *roller shutter down* since the shell, and the north wall was a bare facade box — the beat the whole
 * piece opens on had nothing to land on.
 *
 * **The slats are §3.4's geometry at §3.4's own pitch, not §8's `normalRepeat`.** A material's repeat
 * scales with the surface it is on; a world pitch does not, and the pitch belongs to the shutter
 * rather than to the opening. So a 9.00 m gate gets the same 0.09 m slats as a 3.60 m shopfront,
 * because they are the same product. §3.4's own note reaches that conclusion for its five widths.
 *
 * Thirty-seven slats plus the notice is **two draw calls**: the slats are one `InstancedMesh` and
 * nothing here moves, so the matrices are written once when the mesh attaches.
 */

const UNIT_BOX = new BoxGeometry(1, 1, 1)

/* Hoisted for composing the slat matrices at mount — a loop, so the rule holds even though it is
   not a frame loop. */
const TMP_POSITION = new Vector3()
const TMP_QUATERNION = new Quaternion()
const TMP_SCALE = new Vector3()

/**
 * §3.4's shutter material, at its own roughness and metalness.
 *
 * `shutter` rather than `facade`: this is the same rolled steel as every shopfront in the alley, and
 * §4 gives it a token of its own precisely so it does not read as more wall.
 */
const SLAT_MATERIAL = new MeshStandardMaterial({
  color: PALETTE.shutter,
  roughness: MATERIALS.rollerShutter.roughness,
  metalness: MATERIALS.rollerShutter.metalness,
})

export default function StationGate() {
  const tier = resolveTier()

  /** The inner face of the north end wall — the shutter hangs on this, not inside it. */
  const faceZ = LAYOUT.ends.north.z + LAYOUT.wallThickness / 2

  /**
   * §3.1 — thirty-seven slats, bottom to head.
   *
   * Each is 0.9 of the pitch, so the remaining tenth is the groove between them. That is §3.4's
   * proportion, kept rather than re-chosen: the groove is what makes a shutter read as slats at all,
   * and at this size an eyeballed gap would be the one thing that says "different shutter".
   */
  const slats = useMemo(() => {
    const out: Matrix4[] = []
    const { slatPitch, slatDepth, width } = STATION_GATE
    for (let i = 0; i < STATION_GATE_SLAT_COUNT; i++) {
      out.push(
        new Matrix4().compose(
          TMP_POSITION.set(0, slatPitch * (i + 0.5), faceZ + slatDepth / 2),
          TMP_QUATERNION,
          TMP_SCALE.set(width, slatPitch * 0.9, slatDepth),
        ),
      )
    }
    return out
  }, [faceZ])

  const attachSlats = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      slats.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [slats],
  )

  /**
   * §3.1 — the closure notice: the shinkansen pictogram and §11.4's index 21 on one canvas.
   *
   * `emissiveMap` with a `void` diffuse, per §3.4's rule — the accent lives in the emissive term or
   * the panel arrives at roughly twice the intensity §8.1 asked for.
   */
  const noticeMaterial = useMemo(() => {
    const texture = gateNoticeTexture(tier)
    if (texture === null) return null
    return new MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: 0xffffff,
      color: PALETTE.void,
      emissiveIntensity: STATION_GATE.notice.emissive,
      roughness: MATERIALS.paintedMetal.roughness,
      metalness: MATERIALS.paintedMetal.metalness,
    })
  }, [tier])

  const { notice, slatDepth } = STATION_GATE

  return (
    <>
      <instancedMesh
        name="station:gateSlats"
        ref={attachSlats}
        args={[UNIT_BOX, SLAT_MATERIAL, slats.length]}
      />

      {noticeMaterial !== null ? (
        <mesh
          name="station:gateNotice"
          geometry={UNIT_BOX}
          material={noticeMaterial}
          position={[0, notice.centreY, faceZ + slatDepth + notice.proud]}
          scale={[notice.width, notice.height, notice.proud]}
        />
      ) : null}
    </>
  )
}
