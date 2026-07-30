'use client'

import { useCallback, useMemo } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three'
import { resolveTier } from '@/lib/device'
import {
  FLOORS_PER_TEXTURE,
  SILL_ABOVE_FLOOR,
  facadeWindowTexture,
} from '@/lib/textures/facadeWindows'
import { grainParams } from '@/lib/textures/surfaceGrain'
import { FACADE_WINDOWS, LAYOUT, MATERIALS, PALETTE, facadeWindowFloors } from '@/lib/world'

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

/** The reveal grid's one shape, scaled per instance. Hoisted; lives for the page. */
const UNIT_BOX = new BoxGeometry(1, 1, 1)

const { bay, offset, bandBaseY, floorHeight, variants, reveal, window: win } = FACADE_WINDOWS

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

/* ────────────────────────────────────────────────────────────────────────────
 * §3.3 — the reveal grid
 * ──────────────────────────────────────────────────────────────────────────── */

/** Into the alley: +X off the west wall, −X off the east. §3.4's `facing`, one band up. */
const proudDir = (wall: Wall) => (wall.rotationY > 0 ? 1 : -1)

const COLUMNS = Math.round(bay.width / win.pitch)
/** Half the pier between two windows — the same figure the painter insets each opening by. */
const HALF_PIER = (win.pitch - win.width) / 2

type Slab = { position: [number, number, number]; scale: [number, number, number] }

/**
 * The piers and spandrels that stand proud of one bay, in world space.
 *
 * **This is §3.4's trick one band up: the recess is faked by standing everything else
 * proud.** The painted panel stays exactly where it was, 4 mm off the wall; what changes
 * is that the wall *between* the openings now comes forward, so each window is the floor
 * of a 0.09 – 0.12 m box. No hole is cut and nothing is booleaned.
 *
 * The piers are 0.03 deeper than the spandrels, and that is load-bearing rather than
 * decorative: piers run the full band height and spandrels the full bay width, so all
 * thirty crossings have two boxes meeting, and at equal depth their front faces would be
 * **coplanar** — z-fighting across an entire facade. The offset makes the piers win every
 * crossing and turns the artefact into a concrete frame, which is what these are.
 */
function slabsFor(wall: Wall, bayZ: number): Slab[] {
  const dir = proudDir(wall)
  const bandHeight = wall.floors * floorHeight
  const slabs: Slab[] = []

  /* Piers, at every column boundary. The two at the bay edges are half-width, so a bay's
     right-hand pier butts its neighbour's left-hand one into a single 0.65 pier at the
     joint — one of the few places in this world where two instances have to meet exactly
     rather than merely not overlap. */
  const pierX = wall.x + dir * (reveal.pierDepth / 2)
  const pierY = bandBaseY + bandHeight / 2
  for (let c = 0; c <= COLUMNS; c++) {
    const edge = c === 0 || c === COLUMNS
    const width = edge ? HALF_PIER : HALF_PIER * 2
    const along =
      c === 0
        ? -bay.width / 2 + HALF_PIER / 2
        : c === COLUMNS
          ? bay.width / 2 - HALF_PIER / 2
          : c * win.pitch - bay.width / 2
    slabs.push({
      position: [pierX, pierY, bayZ + along],
      scale: [reveal.pierDepth, bandHeight, width],
    })
  }

  /* Spandrels: the bands the openings are *not* in. One below the first sill, one between
     every pair of floors, one at the parapet — so `floors + 1` of them, derived from the
     sill and head lines rather than listed, which is what keeps them on the paint. */
  const spandrelX = wall.x + dir * (reveal.spandrelDepth / 2)
  const edges = [0]
  for (let f = 0; f < wall.floors; f++) {
    edges.push(f * floorHeight + SILL_ABOVE_FLOOR)
    edges.push(f * floorHeight + SILL_ABOVE_FLOOR + win.height)
  }
  edges.push(bandHeight)

  for (let i = 0; i < edges.length; i += 2) {
    const lo = edges[i] as number
    const hi = edges[i + 1] as number
    if (hi - lo <= 0.001) continue
    slabs.push({
      position: [spandrelX, bandBaseY + (lo + hi) / 2, bayZ],
      scale: [reveal.spandrelDepth, hi - lo, bay.width],
    })
  }

  return slabs
}

/**
 * Every pier and spandrel on both walls — **one `InstancedMesh`, one draw call.**
 *
 * They are the same box in the same material, so there is no reason to split them by
 * kind; the only thing that differs is a scale, which is what an instance matrix is for.
 * Axis-aligned throughout: the walls run along `z`, so nothing here needs a rotation.
 */
function RevealGrid({ material }: { material: Material }) {
  const slabs = useMemo(
    () => WALLS.flatMap((wall) => bayCentresZ.flatMap((z) => slabsFor(wall, z))),
    [],
  )

  const attach = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      slabs.forEach((slab, i) => {
        dummy.position.set(...slab.position)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(...slab.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      // Without this the whole grid culls against one box at the origin — see BayRow.
      mesh.computeBoundingSphere()
    },
    [slabs],
  )

  return (
    <instancedMesh
      name="facade:reveal"
      ref={attach}
      args={[UNIT_BOX, material, slabs.length]}
    />
  )
}

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
  /**
   * §3.4's surface grain, on the frame rather than on the panel.
   *
   * **The bay panel does not get it and must not.** That material already carries a
   * painted image in `map` *and* `emissiveMap`, and this one would have to take the `map`
   * slot from it — a wall of windows with no windows in it. The frame in front is where
   * the grain belongs anyway: it is the part that is actually concrete, and it is the part
   * that catches §7's light at an angle now that it stands proud.
   */
  const revealMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: PALETTE[FACADE_WINDOWS.baseColor],
        roughness: MATERIALS.facade.roughness,
        metalness: MATERIALS.facade.metalness,
        envMapIntensity: MATERIALS.facade.envMapIntensity,
        ...grainParams('facade', tier),
      }),
    [tier],
  )

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

      <RevealGrid material={revealMaterial} />
    </>
  )
}
