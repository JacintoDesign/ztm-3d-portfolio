'use client'

import { BoxGeometry, MeshStandardMaterial } from 'three'
import { LAYOUT, MATERIALS, PALETTE, degToRad } from '@/lib/world'

/**
 * §3 — the alley envelope: facades, end walls, kerbs.
 *
 * Bare boxes at the brief's dimensions and nothing else. No grime maps, no shutters, no
 * signage, no detail of any kind — this is the substrate that the surroundings step
 * decorates, and it is here now so that everything built after it is judged inside a
 * corridor rather than against an empty plane.
 *
 * This file holds the immovable envelope. Surroundings.tsx will hold the §3.2 inventory.
 * Keeping them apart is what lets that step be reviewed as a diff, which the brief asks
 * for; fourteen shutter variants landing in the same file as the walls would not be.
 *
 * The gutter channel is not here: §3 settles that it is expressed through the puddle
 * mask rather than as overlay geometry, and that its 0.03 recess waits for the floor to
 * have real geometry (§16.5).
 */

/**
 * One unit box, scaled per mesh. Hoisted to module scope and never disposed: it lives
 * for the lifetime of the page by design, which is the correct lifetime for it.
 * Constructing geometry in a render body is the thing this avoids.
 */
const UNIT_BOX = new BoxGeometry(1, 1, 1)

const westFacadeMaterial = new MeshStandardMaterial({
  color: PALETTE.facadeWarm,
  roughness: MATERIALS.facade.roughness,
  metalness: MATERIALS.facade.metalness,
  envMapIntensity: MATERIALS.facade.envMapIntensity,
})

const eastFacadeMaterial = new MeshStandardMaterial({
  color: PALETTE.facade,
  roughness: MATERIALS.facade.roughness,
  metalness: MATERIALS.facade.metalness,
  envMapIntensity: MATERIALS.facade.envMapIntensity,
})

const kerbMaterial = new MeshStandardMaterial({
  color: PALETTE.concrete,
  roughness: MATERIALS.concrete.roughness,
  metalness: MATERIALS.concrete.metalness,
  envMapIntensity: MATERIALS.concrete.envMapIntensity,
})

const { alley, facadeHeight, wallThickness, kerb, ends } = LAYOUT

const halfThickness = wallThickness / 2
/** Inner faces sit at x = ±4.5, so the boxes are centred half a thickness outboard. */
const westCentreX = alley.x[0] - halfThickness
const eastCentreX = alley.x[1] + halfThickness
/** Long enough to meet the outer faces of both end walls, so no corner shows a gap. */
const facadeLength = alley.length + wallThickness * 2

const northCentreZ = ends.north.z - halfThickness
const southCentreZ = ends.south.z + halfThickness

/** §3.1 — the taller of the two facades, so a cap never opens a strip of sky. */
const endWallHeight = facadeHeight.west
/** Spans the full alley plus both facade thicknesses. */
const endWallWidth = alley.width + wallThickness * 2

const southAngle = degToRad(ends.south.angleDeg)
/** §3.1 — across the end, swung 20° off square, west end meeting the west wall. */
const southCentreX = alley.x[0] + (ends.south.returnLength / 2) * Math.cos(southAngle)

export default function Alley() {
  return (
    <>
      {/* West facade — 14.0, faintly warmer. The asymmetry with the east side is what
          stops the alley reading as a corridor. */}
      <mesh
        geometry={UNIT_BOX}
        material={westFacadeMaterial}
        position={[westCentreX, facadeHeight.west / 2, 0]}
        scale={[wallThickness, facadeHeight.west, facadeLength]}
      />

      {/* East facade — 12.5. */}
      <mesh
        geometry={UNIT_BOX}
        material={eastFacadeMaterial}
        position={[eastCentreX, facadeHeight.east / 2, 0]}
        scale={[wallThickness, facadeHeight.east, facadeLength]}
      />

      {/* §3.1 north — the station ticket gate. Behind you at spawn; turning round is
          the story beat. The shutter, the dead gate machines and the 終電 plate are all
          surroundings work. */}
      <mesh
        geometry={UNIT_BOX}
        material={eastFacadeMaterial}
        position={[0, endWallHeight / 2, northCentreZ]}
        scale={[endWallWidth, endWallHeight, wallThickness]}
      />

      {/* §3.1 south — the bend. */}
      <mesh
        geometry={UNIT_BOX}
        material={eastFacadeMaterial}
        position={[southCentreX, endWallHeight / 2, southCentreZ]}
        rotation={[0, southAngle, 0]}
        scale={[ends.south.returnLength, endWallHeight, wallThickness]}
      />

      {/* Kerbs — 0.12 high, 0.60 wide, inner edge at x = ±3.90, so the outer edge meets
          the wall. Both sit outside the §3 walkable clamp; the visitor never steps up. */}
      <mesh
        geometry={UNIT_BOX}
        material={kerbMaterial}
        position={[-(kerb.innerEdgeX + kerb.width / 2), kerb.height / 2, 0]}
        scale={[kerb.width, kerb.height, alley.length]}
      />
      <mesh
        geometry={UNIT_BOX}
        material={kerbMaterial}
        position={[kerb.innerEdgeX + kerb.width / 2, kerb.height / 2, 0]}
        scale={[kerb.width, kerb.height, alley.length]}
      />
    </>
  )
}
