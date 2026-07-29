'use client'

import { useCallback, useMemo } from 'react'
import {
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three'
import { resolveTier } from '@/lib/device'
import { FLOORS_PER_TEXTURE, facadeWindowTexture } from '@/lib/textures/facadeWindows'
import { FACADE_WINDOWS, LAYOUT, MATERIALS, facadeWindowFloors } from '@/lib/world'

/**
 * §3.3 — the window grid on the upper facades.
 *
 * The grid is worked out from each wall's real height (`facadeWindowFloors`), not listed
 * per wall: 14.0 gives three floors, 12.5 gives two, and what does not divide is left as
 * parapet. Both walls share one texture set — the two-floor wall samples the bottom two
 * thirds of the same image through its UVs — so the height classes cost geometry and not
 * texture memory, which is what §15's 14 MB budget can afford.
 *
 * **Not a skyline.** §1 and §3.1 stand: no sky dome, no towers, no horizon. This is a
 * treatment of the two walls that were already there, inside the same fog.
 *
 * **Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against.
 *
 * **No collision.** These lie flush on walls at x = ±4.5 and §3's hard clamp already
 * stops the eye at ±3.60; a bounding box here would guard a boundary that cannot be
 * reached. Boxes are for what protrudes into the alley.
 */

/** Reused for every instance matrix. Written at mount, never in a frame loop. */
const dummy = new Object3D()

const { bay, offset, bandBaseY, floorHeight, variants } = FACADE_WINDOWS

/** §3.1 — facades run the alley plus a wall thickness at each end. 48.0 ÷ 8.00 = 6. */
const facadeLength = LAYOUT.alley.length + LAYOUT.wallThickness * 2
const firstBayZ = -facadeLength / 2 + bay.width / 2
const bayCentresZ = Array.from({ length: bay.count }, (_, i) => firstBayZ + i * bay.width)

type Wall = {
  key: string
  /** The panel face, `offset` in front of the wall's inner face. */
  x: number
  rotationY: number
  floors: number
}

const WALLS: readonly Wall[] = [
  {
    key: 'west',
    x: LAYOUT.alley.x[0] + offset,
    // A plane faces +Z; +90° about Y swings it to +X, into the alley.
    rotationY: Math.PI / 2,
    floors: facadeWindowFloors(LAYOUT.facadeHeight.west),
  },
  {
    key: 'east',
    x: LAYOUT.alley.x[1] - offset,
    rotationY: -Math.PI / 2,
    floors: facadeWindowFloors(LAYOUT.facadeHeight.east),
  },
]

/** §3.3 — six bays cycle A B C A B C, by index. Never randomised. */
const bayIndicesFor = (variant: number) =>
  bayCentresZ.map((_, i) => i).filter((i) => i % variants === variant)

/**
 * One bay panel, cropped to this wall's floor count.
 *
 * The UV scale is the whole trick behind sharing a texture: the geometry is shorter and
 * its V runs 0 → floors ÷ FLOORS_PER_TEXTURE, so a two-floor wall reads the bottom two
 * thirds of a three-floor image. Ground floor stays at the bottom of both.
 */
export function bayGeometry(floors: number): PlaneGeometry {
  const geometry = new PlaneGeometry(bay.width, floors * floorHeight)
  if (floors === FLOORS_PER_TEXTURE) return geometry

  const uv = geometry.attributes.uv
  const scale = floors / FLOORS_PER_TEXTURE
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * scale)
  uv.needsUpdate = true
  return geometry
}

function BayRow({
  wall,
  variant,
  geometry,
  material,
}: {
  wall: Wall
  variant: number
  geometry: BufferGeometry
  material: Material
}) {
  const indices = useMemo(() => bayIndicesFor(variant), [variant])
  const centreY = bandBaseY + (wall.floors * floorHeight) / 2

  /**
   * Matrices are written once, in a ref callback, rather than per frame — nothing here
   * moves. `computeBoundingSphere` afterwards is what keeps frustum culling honest: an
   * InstancedMesh's default bounds come from the geometry at the origin, so without it
   * six panels spread over 48 m would cull as one panel sitting at the alley centre.
   */
  const attach = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      indices.forEach((bayIndex, slot) => {
        dummy.position.set(wall.x, centreY, bayCentresZ[bayIndex] as number)
        dummy.rotation.set(0, wall.rotationY, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(slot, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [indices, wall, centreY],
  )

  return <instancedMesh ref={attach} args={[geometry, material, indices.length]} />
}

export default function FacadeWindows() {
  const tier = resolveTier()

  /**
   * Three materials and two geometries for the whole thing — twelve panels, six draw
   * calls. Built once and kept for the life of the page, which is the correct lifetime:
   * constructing either in a render body is the allocation `CLAUDE.md` rules out.
   */
  const materials = useMemo(
    () =>
      Array.from({ length: variants }, (_, variant) => {
        const texture = facadeWindowTexture(variant, tier)
        return new MeshStandardMaterial({
          /* One image, both slots. Two textures would let a window be lit in colour and
             dark in glow — a wall that reads subtly wrong with nothing to point at. */
          map: texture,
          emissiveMap: texture,
          // White, so the map's own colours come through the emissive term unchanged.
          emissive: 0xffffff,
          /* §8.1 — 0.55 sits under the 0.90 bloom threshold. These are the most numerous
             emissive things in the world; on the bloom side of the knee, two 48 m walls
             would out-glow the shopfront and §17's three-warm-things rule would break. */
          emissiveIntensity: FACADE_WINDOWS.emissiveIntensity,
          roughness: MATERIALS.facade.roughness,
          metalness: MATERIALS.facade.metalness,
          envMapIntensity: MATERIALS.facade.envMapIntensity,
        })
      }),
    [tier],
  )

  const geometries = useMemo(
    () => new Map(WALLS.map((wall) => [wall.key, bayGeometry(wall.floors)])),
    [],
  )

  return (
    <>
      {WALLS.map((wall) =>
        materials.map((material, variant) => (
          <BayRow
            key={`${wall.key}:${variant}`}
            wall={wall}
            variant={variant}
            geometry={geometries.get(wall.key) as BufferGeometry}
            material={material}
          />
        )),
      )}
    </>
  )
}
