'use client'

import { useCallback, useMemo } from 'react'
import {
  BoxGeometry,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
} from 'three'
import { resolveTier } from '@/lib/device'
import { grainParams } from '@/lib/textures/surfaceGrain'
import { BEND, BEND_PLINTH, LAYOUT, MATERIALS, PALETTE } from '@/lib/world'

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

/**
 * §3.4's surface grain, on the envelope as well as on the storefronts in front of it.
 *
 * The bare walls are the largest flat surfaces in the world and the ones a visitor stands
 * closest to — the bend in particular, which §2.1's board is now mounted on and which is
 * therefore looked at deliberately rather than walked past.
 *
 * **Built per tier rather than at module scope**, which is why these moved into the
 * component: `resolveTier()` needs a document, and a material constructed on the module's
 * first evaluation would take whichever tier the server did not have.
 */
function buildMaterials(tier: ReturnType<typeof resolveTier>) {
  const facadeGrain = grainParams('facade', tier)

  return {
    west: new MeshStandardMaterial({
      color: PALETTE.facadeWarm,
      roughness: MATERIALS.facade.roughness,
      metalness: MATERIALS.facade.metalness,
      envMapIntensity: MATERIALS.facade.envMapIntensity,
      ...facadeGrain,
    }),
    east: new MeshStandardMaterial({
      color: PALETTE.facade,
      roughness: MATERIALS.facade.roughness,
      metalness: MATERIALS.facade.metalness,
      envMapIntensity: MATERIALS.facade.envMapIntensity,
      ...facadeGrain,
    }),
    kerb: new MeshStandardMaterial({
      color: PALETTE.concrete,
      roughness: MATERIALS.concrete.roughness,
      metalness: MATERIALS.concrete.metalness,
      envMapIntensity: MATERIALS.concrete.envMapIntensity,
      ...grainParams('concrete', tier),
    }),
  }
}

const { alley, facadeHeight, wallThickness, kerb, ends } = LAYOUT

const halfThickness = wallThickness / 2
/** Inner faces sit at x = ±4.5, so the boxes are centred half a thickness outboard. */
const westCentreX = alley.x[0] - halfThickness
const eastCentreX = alley.x[1] + halfThickness
/** Long enough to meet the outer faces of both end walls, so no corner shows a gap. */
const facadeLength = alley.length + wallThickness * 2

/**
 * §3.1 — how much further south the **west** facade runs than the east one.
 *
 * The bend is at 20°, so its west end reaches `z = 24.94` at the facade's inner face while
 * the facade itself stopped at 24.00 — **a 0.94 m open corner** between the two, and the
 * only thing behind it is §3.6's cross street. It showed as a patch of lit road at the foot
 * of the wall, which is where a corner gap always shows: at the bottom, because that is the
 * only part of it a 1.68 m eye is below.
 *
 * Derived from where the bend's *back* face crosses `x = −4.5`, plus a little, so the
 * overlap survives a change to §3.1's angle. The east side needs none: past the bend's east
 * corner is §3.1's opening, which is meant to be open.
 */
const westFacadeOverrun = 1.0
const westFacadeLength = facadeLength + westFacadeOverrun
const westFacadeCentreZ = westFacadeOverrun / 2

const northCentreZ = ends.north.z - halfThickness

/** §3.1 — the taller of the two facades, so a cap never opens a strip of sky. */
const endWallHeight = facadeHeight.west
/** Spans the full alley plus both facade thicknesses. */
const endWallWidth = alley.width + wallThickness * 2

/**
 * §3 / §3.1 — the two kerbs and the bend's plinth, as one instanced set.
 *
 * Built once at module scope: none of it moves and none of it depends on the tier.
 *
 * **The plinth stands where §6.1's reflector stops**, its depth read from the same constant,
 * so the gap between mirror and wall is filled by a solid step rather than by floor. That
 * gap had been showing the base plane — brighter than the mirror beside it, a lit sliver the
 * length of the wall, reported as a slot under it. There is no ground there to see now.
 */
const KERB_MATRICES = (() => {
  const at = new Object3D()
  const matrices: Matrix4[] = []

  for (const side of [-1, 1] as const) {
    at.position.set(side * (kerb.innerEdgeX + kerb.width / 2), kerb.height / 2, 0)
    at.rotation.set(0, 0, 0)
    at.scale.set(kerb.width, kerb.height, alley.length)
    at.updateMatrix()
    matrices.push(at.matrix.clone())
  }

  /* Centred on the bend's *face* pushed half its own depth into the alley, and turned with
     the wall — the same frame §2.1's board mounts in, read from `BEND` rather than
     re-derived, because two descriptions of one wall drift the moment the angle changes. */
  const [fx, fz] = BEND.faceCentre
  const [ix, iz] = BEND.inward
  at.position.set(
    fx + ix * (BEND_PLINTH.depth / 2),
    BEND_PLINTH.height / 2,
    fz + iz * (BEND_PLINTH.depth / 2),
  )
  at.rotation.set(0, BEND.angleRad, 0)
  at.scale.set(BEND.length, BEND_PLINTH.height, BEND_PLINTH.depth)
  at.updateMatrix()
  matrices.push(at.matrix.clone())

  return matrices
})()

export default function Alley() {
  const tier = resolveTier()
  const material = useMemo(() => buildMaterials(tier), [tier])

  /* Written once when the mesh attaches — nothing here moves. `computeBoundingSphere`
     follows, or the set culls against the geometry at the origin and the kerbs vanish as
     one unit the moment it leaves frame. */
  const attachKerbs = useCallback((mesh: InstancedMesh | null) => {
    if (mesh === null) return
    KERB_MATRICES.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  return (
    <>
      {/* West facade — 14.0, faintly warmer. The asymmetry with the east side is what
          stops the alley reading as a corridor. */}
      <mesh
        geometry={UNIT_BOX}
        material={material.west}
        position={[westCentreX, facadeHeight.west / 2, westFacadeCentreZ]}
        scale={[wallThickness, facadeHeight.west, westFacadeLength]}
      />

      {/* East facade — 12.5. */}
      <mesh
        geometry={UNIT_BOX}
        material={material.east}
        position={[eastCentreX, facadeHeight.east / 2, 0]}
        scale={[wallThickness, facadeHeight.east, facadeLength]}
      />

      {/* §3.1 north — the station ticket gate. Behind you at spawn; turning round is
          the story beat. The shutter, the dead gate machines and the 終電 plate are all
          surroundings work. */}
      <mesh
        geometry={UNIT_BOX}
        material={material.east}
        position={[0, endWallHeight / 2, northCentreZ]}
        scale={[endWallWidth, endWallHeight, wallThickness]}
      />

      {/* §3.1 south — the bend. Its frame is derived once in `lib/world.ts` as `BEND`,
          because §2.1's board mounts on this same face and two derivations of one wall
          drift silently. */}
      <mesh
        geometry={UNIT_BOX}
        material={material.east}
        position={[BEND.centre[0], endWallHeight / 2, BEND.centre[1]]}
        rotation={[0, BEND.angleRad, 0]}
        scale={[BEND.length, endWallHeight, wallThickness]}
      />

      {/* §3 — the two kerbs, and §3.1's bend plinth. **One `InstancedMesh` for all three**:
          they are the same box in the same `concrete`, and the only thing that had ever kept
          the kerbs apart was being written as two elements. Three instances therefore cost
          one draw call where two used to cost two. */}
      <instancedMesh ref={attachKerbs} args={[UNIT_BOX, material.kerb, KERB_MATRICES.length]} />
    </>
  )
}
