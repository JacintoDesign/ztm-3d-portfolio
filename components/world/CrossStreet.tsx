'use client'

import { useCallback, useMemo } from 'react'
import {
  type BufferGeometry,
  Color,
  type InstancedMesh,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  BoxGeometry,
  PlaneGeometry,
} from 'three'
import { resolveTier } from '@/lib/device'
import { colorRun } from '@/lib/signs'
import { facadeWindowTexture } from '@/lib/textures/facadeWindows'
import {
  CROSS_STREET,
  type ColorToken,
  FACADE_WINDOWS,
  MATERIALS,
  PALETTE,
  dimHex,
  facadeWindowFloors,
} from '@/lib/world'
import { bayGeometry } from './FacadeWindows'

/**
 * §3.6 — the street the bend opens onto, without the traffic on it.
 *
 * §3.1's return wall crosses the end at 20° and lands at x = 1.14, leaving a 3.36 m gap
 * between itself and the east facade. Everything in this file stands on the far side of
 * that gap: two pavements, a centre line, and the building that closes the horizon.
 *
 * **Carries nothing** (§2.4), and **nothing is solid** (§3.6): the whole street lies past
 * z = 24.60 against §3's clamp at z ≤ 21.40, behind a 14 m wall spanning the rest of the
 * end. §12.4's registry gets nothing — unlike §3.4's storefronts there is not even a
 * boundary here for a box to be inert against.
 *
 * **The far building is lit from within because nothing lights it from without.** §7's
 * ten dynamic lights are all inside the alley with finite distance and none of them
 * reaches z = 32.80. An unlit wall out there is a wall nobody can see, which is §3.5's
 * banner problem at building scale — so it carries §3.3's window bays at §3.3's own
 * rung, off the same three cached canvases, for no texture memory at all.
 */

/** Hoisted, scaled per mesh. These live for the page, which is the correct lifetime. */
const UNIT_BOX = new BoxGeometry(1, 1, 1)
/** Reused for every instance matrix. Written at mount, never in a frame loop. */
const dummy = new Object3D()

const { pavement, centreLine, farBuilding } = CROSS_STREET
const { groundBand, panels } = farBuilding

const concreteMaterial = new MeshStandardMaterial({
  color: PALETTE.concrete,
  roughness: MATERIALS.concrete.roughness,
  metalness: MATERIALS.concrete.metalness,
  envMapIntensity: MATERIALS.concrete.envMapIntensity,
})

const facadeMaterial = new MeshStandardMaterial({
  color: PALETTE[farBuilding.color],
  roughness: MATERIALS.facade.roughness,
  metalness: MATERIALS.facade.metalness,
  envMapIntensity: MATERIALS.facade.envMapIntensity,
})

const bandMaterial = new MeshStandardMaterial({
  color: PALETTE[groundBand.color],
  roughness: MATERIALS.rollerShutter.roughness,
  metalness: MATERIALS.rollerShutter.metalness,
})

/**
 * §3.6 — painted, not lit, and above the road glow at y = 0.024.
 *
 * A standard material out here is lit by a 0.35 hemisphere and nothing else, so a
 * correctly-lit road marking is an invisible one; and drawn *under* the headlight pools
 * it would disappear exactly when a real marking lights up. Same trick as §8's neon
 * tube, at a fifth of the value.
 */
const centreLineMaterial = new MeshBasicMaterial({
  color: dimHex(PALETTE[centreLine.color], centreLine.paint),
})

/** One white base; §4's ratio arrives per instance through `instanceColor`. */
const panelMaterial = new MeshBasicMaterial({ color: 0xffffff })

/* ── Pavements ──────────────────────────────────────────────────────────────── */

type Slab = { x: [number, number]; z: [number, number] }

/**
 * The break between the two near spans is the alley mouth — a dropped kerb, so the alley
 * floor runs unbroken into the carriageway. A kerb across it would put a 12 cm step in
 * the one part of this street whose ground the visitor can actually see, and it would
 * read as something the alley had grown rather than as the place two roads meet.
 */
const SLABS: readonly Slab[] = [
  ...pavement.near.spans.map((span) => ({
    x: [span[0], span[1]] as [number, number],
    z: [pavement.near.z[0], pavement.near.z[1]] as [number, number],
  })),
  {
    x: [pavement.far.x[0], pavement.far.x[1]],
    z: [pavement.far.z[0], pavement.far.z[1]],
  },
]

function Pavements() {
  const attach = useCallback((mesh: InstancedMesh | null) => {
    if (mesh === null) return
    SLABS.forEach((slab, i) => {
      dummy.position.set(
        (slab.x[0] + slab.x[1]) / 2,
        pavement.height / 2,
        (slab.z[0] + slab.z[1]) / 2,
      )
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(slab.x[1] - slab.x[0], pavement.height, slab.z[1] - slab.z[0])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    dummy.scale.set(1, 1, 1)
    mesh.instanceMatrix.needsUpdate = true
    // Without this the bounds come from the unit box at the origin and 80 m of pavement
    // culls as a 1 m cube in the middle of the alley.
    mesh.computeBoundingSphere()
  }, [])

  return (
    <instancedMesh
      name="street:pavements"
      ref={attach}
      args={[UNIT_BOX, concreteMaterial, SLABS.length]}
    />
  )
}

/* ── Centre line ────────────────────────────────────────────────────────────── */

const DASH_PERIOD = centreLine.dash + centreLine.gap
const DASH_COUNT = Math.floor((centreLine.x[1] - centreLine.x[0]) / DASH_PERIOD)
const DASH_GEOMETRY = new PlaneGeometry(centreLine.dash, centreLine.width)

function CentreLine() {
  const attach = useCallback((mesh: InstancedMesh | null) => {
    if (mesh === null) return
    dummy.scale.set(1, 1, 1)
    for (let i = 0; i < DASH_COUNT; i++) {
      dummy.position.set(
        centreLine.x[0] + centreLine.dash / 2 + i * DASH_PERIOD,
        centreLine.y,
        centreLine.z,
      )
      // Face up. A plane stands in XY; −90° about X lays it on the ground.
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  return (
    <instancedMesh
      name="street:centreLine"
      ref={attach}
      args={[DASH_GEOMETRY, centreLineMaterial, DASH_COUNT]}
    />
  )
}

/* ── The far building's ground-floor panels ─────────────────────────────────── */

/** One unit quad, scaled per instance — the three size classes cycle by index. */
const PANEL_GEOMETRY = new PlaneGeometry(1, 1)
/**
 * §4's ratio over twenty-two: 12 / 6 / 3 / 1. This is the first count in the world large
 * enough for blue to round *in* rather than away, and it lands on the most distant lit
 * surface there is — which is exactly what §4 means by *rare, distance signs only*,
 * arrived at by the ratio rather than by an exception made for it.
 */
const PANEL_COLORS = colorRun(panels.count)
/** Allocated once at module scope; `setColorAt` copies out of it. */
const tint = new Color()

function GroundPanels() {
  const attach = useCallback((mesh: InstancedMesh | null) => {
    if (mesh === null) return
    panels.x.forEach((x, i) => {
      const size = panels.classes[i % panels.classes.length] as
        (typeof panels.classes)[number]
      dummy.position.set(
        x,
        size.baseY + size.height / 2,
        farBuilding.faceZ - groundBand.proud - panels.proud,
      )
      // A plane faces +Z; the building looks back down the alley, so it turns to face −Z.
      dummy.rotation.set(0, Math.PI, 0)
      dummy.scale.set(size.width, size.height, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      /* §8.1's 1.80, as a linear gain rather than a fraction of the token — and the
         difference is the whole reason the far side is visible at all. A basic material
         at colour tops out at white, and §5's fog mixes toward `fogColor`, so from
         mid-alley at 0.14 transmittance the brightest board this material can hold still
         arrives as grey. The ceiling was the problem, not the setting. `instanceColor`
         carries values above 1 perfectly well, which is what lets twenty-two boards in
         twenty-two colours stay a single draw call. */
      tint.set(PALETTE[PANEL_COLORS[i] as ColorToken]).multiplyScalar(panels.gain)
      mesh.setColorAt(i, tint)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  return (
    <instancedMesh
      name="street:panels"
      ref={attach}
      args={[PANEL_GEOMETRY, panelMaterial, panels.count]}
    />
  )
}

/* ── The far building's window bays ─────────────────────────────────────────── */

/** §3.3's own rule, applied to this wall's height: 14.0 gives three floors. */
const FAR_FLOORS = facadeWindowFloors(farBuilding.height)
const BAY_WIDTH = FACADE_WINDOWS.bay.width
const FIRST_BAY_X = farBuilding.x[0] + BAY_WIDTH / 2
const BAY_CENTRES_X = Array.from(
  { length: farBuilding.bays },
  (_, i) => FIRST_BAY_X + i * BAY_WIDTH,
)

function BayRow({
  variant,
  geometry,
  material,
}: {
  variant: number
  geometry: BufferGeometry
  material: Material
}) {
  const indices = useMemo(
    () => BAY_CENTRES_X.map((_, i) => i).filter((i) => i % FACADE_WINDOWS.variants === variant),
    [variant],
  )
  const centreY = FACADE_WINDOWS.bandBaseY + (FAR_FLOORS * FACADE_WINDOWS.floorHeight) / 2

  const attach = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      dummy.scale.set(1, 1, 1)
      indices.forEach((bayIndex, slot) => {
        dummy.position.set(
          BAY_CENTRES_X[bayIndex] as number,
          centreY,
          farBuilding.faceZ - FACADE_WINDOWS.offset,
        )
        dummy.rotation.set(0, Math.PI, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(slot, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [indices, centreY],
  )

  return <instancedMesh ref={attach} args={[geometry, material, indices.length]} />
}

export default function CrossStreet() {
  const tier = resolveTier()

  /** §3.3's materials, verbatim — same rung, same three cached canvases, no new memory. */
  const bayMaterials = useMemo(
    () =>
      Array.from({ length: FACADE_WINDOWS.variants }, (_, variant) => {
        const texture = facadeWindowTexture(variant, tier)
        return new MeshStandardMaterial({
          map: texture,
          emissiveMap: texture,
          emissive: 0xffffff,
          emissiveIntensity: FACADE_WINDOWS.emissiveIntensity,
          roughness: MATERIALS.facade.roughness,
          metalness: MATERIALS.facade.metalness,
          envMapIntensity: MATERIALS.facade.envMapIntensity,
        })
      }),
    [tier],
  )

  const geometry = useMemo(() => bayGeometry(FAR_FLOORS), [])

  return (
    <>
      <Pavements />
      <CentreLine />

      {/* §3.1's end-wall rule: a cap never opens a strip of sky, so it takes the taller
          of the two facades. This one is the far side of a road rather than a cap, and
          the rule is the same — without it the opening hands back the horizon §1 spent
          the whole world removing. */}
      <mesh
        name="street:farBuilding"
        geometry={UNIT_BOX}
        material={facadeMaterial}
        position={[
          (farBuilding.x[0] + farBuilding.x[1]) / 2,
          farBuilding.height / 2,
          farBuilding.faceZ + farBuilding.thickness / 2,
        ]}
        scale={[
          farBuilding.x[1] - farBuilding.x[0],
          farBuilding.height,
          farBuilding.thickness,
        ]}
      />

      {/* §3.3's band base, held to the same line — 0.10 proud, so the window bays above
          it start where the band stops rather than sitting on the same plane. */}
      <mesh
        name="street:groundBand"
        geometry={UNIT_BOX}
        material={bandMaterial}
        position={[
          (farBuilding.x[0] + farBuilding.x[1]) / 2,
          groundBand.height / 2,
          farBuilding.faceZ - groundBand.proud / 2,
        ]}
        scale={[
          farBuilding.x[1] - farBuilding.x[0],
          groundBand.height,
          groundBand.proud,
        ]}
      />

      <GroundPanels />

      {bayMaterials.map((material, variant) => (
        <BayRow key={variant} variant={variant} geometry={geometry} material={material} />
      ))}
    </>
  )
}
