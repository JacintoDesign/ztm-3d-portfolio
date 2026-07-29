'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  type InstancedMesh,
  type Material,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  Object3D,
} from 'three'
import { type Box, registerBoxes } from '@/lib/collision'
import { expose } from '@/lib/debug'
import {
  STOREFRONT_UNITS,
  type StorefrontUnit,
  apertureWidth,
  apertureZ,
  doorwayZ,
  shutterDrop,
} from '@/lib/storefronts'
import { LAYOUT, MATERIALS, PALETTE, STOREFRONT, type ColorToken } from '@/lib/world'

/**
 * §3.4 — the lower 4.00 m of both facades. What the visitor actually walks past.
 *
 * Boxes and cylinders only. The layout — where the fourteen units are, how wide, which
 * are open, which carry a sign — is decided in `lib/storefronts.ts` and read here; this
 * file turns that list into geometry and knows nothing about how it was chosen.
 *
 * **The recess is faked by standing everything else proud.** The facades are solid boxes
 * and nothing here cuts a hole in them: the piers and the fascia stand 0.35 in front of
 * the wall, the shutter sits almost on it, and the depth between them is what reads as a
 * shopfront. A real recess would need a boolean, and a boolean would need a mesh library.
 *
 * **Carries nothing** (§2.4). No project names, nothing clickable, nothing raycast.
 */

/** Reused for every instance matrix. Written at mount, never in a frame loop. */
const dummy = new Object3D()

/** Unit primitives, scaled per instance. Hoisted; they live as long as the page. */
const UNIT_BOX = new BoxGeometry(1, 1, 1)
/** Radius 1, height 1, axis Y — rotated to lie along the alley at each instance. */
const UNIT_CYLINDER = new CylinderGeometry(1, 1, 1, 10, 1)

const { aperture, doorway, signBox, awning, plinth, slatPitch, slatDepth } = STOREFRONT

/** Into the alley: +X off the west wall, −X off the east. */
const facing = (unit: StorefrontUnit) => (unit.wall === 'west' ? 1 : -1)
const faceX = (unit: StorefrontUnit) =>
  unit.wall === 'west' ? LAYOUT.alley.x[0] : LAYOUT.alley.x[1]

/** How far the piers and fascia stand in front of the wall — the depth of the shopfront. */
const FRAME_DEPTH = aperture.recess
const APERTURE_HEIGHT = aperture.headY - aperture.baseY

type Placement = {
  position: [number, number, number]
  scale: [number, number, number]
  /** Cylinders only; boxes are all axis-aligned because the walls are. */
  rotationX?: number
}

/* `MeshStandardMaterialParameters`, not `Partial<MeshStandardMaterial>`: the class types
   `emissive` as a live `Color` object, while the constructor accepts the hex string the
   §4 palette is authored in. Only the parameters type describes what is actually passed. */
function standard(color: string, extra: MeshStandardMaterialParameters = {}) {
  return new MeshStandardMaterial({
    color,
    roughness: MATERIALS.facade.roughness,
    metalness: MATERIALS.facade.metalness,
    envMapIntensity: MATERIALS.facade.envMapIntensity,
    ...extra,
  })
}

/**
 * One InstancedMesh. Matrices are written once in a ref callback — nothing here moves —
 * and `computeBoundingSphere` follows, because an InstancedMesh otherwise culls against
 * the geometry at the origin and a run spread over 44 m disappears as one unit.
 */
function Instanced({
  name,
  geometry,
  material,
  placements,
}: {
  /** Named so the overlap check can tell a pier from a sign box in the scene graph. */
  name: string
  geometry: BufferGeometry
  material: Material
  placements: readonly Placement[]
}) {
  const attach = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      placements.forEach((placement, i) => {
        dummy.position.set(...placement.position)
        dummy.rotation.set(placement.rotationX ?? 0, 0, 0)
        dummy.scale.set(...placement.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [placements],
  )

  if (placements.length === 0) return null
  return (
    <instancedMesh name={name} ref={attach} args={[geometry, material, placements.length]} />
  )
}

/**
 * Every placement in the band, sorted into the meshes that will draw them.
 *
 * Built once. The whole storefront run is static geometry decided at module load, so
 * this runs a single time and the result outlives every render.
 */
function buildPlacements() {
  const plinths: Placement[] = []
  const piers: Placement[] = []
  const fascias: Placement[] = []
  const backings: Placement[] = []
  const rolls: Placement[] = []
  const doors: Placement[] = []
  const jambs: Placement[] = []
  const lintels: Placement[] = []
  const spills: Placement[] = []
  const awningSlabs: Placement[] = []
  const awningBars: Placement[] = []
  const darkSigns: Placement[] = []
  const litSigns = new Map<ColorToken, Placement[]>()
  const slats: Placement[][] = Array.from({ length: STOREFRONT.variants }, () => [])
  const boxes: Box[] = []

  for (const unit of STOREFRONT_UNITS) {
    const dir = facing(unit)
    const wall = faceX(unit)
    /** x of the centre of something `depth` deep whose back sits on the wall. */
    const proud = (depth: number) => wall + dir * (depth / 2)

    const apWidth = apertureWidth(unit)
    const apZ = apertureZ(unit)
    const doorZ = doorwayZ(unit)

    // Plinth — a step at the base of the whole unit, sitting on the kerb.
    plinths.push({
      position: [proud(plinth.depth), plinth.height / 2, unit.z],
      scale: [plinth.depth, plinth.height, unit.width],
    })

    // Two piers framing the unit, floor to the aperture head.
    for (const side of [-1, 1] as const) {
      piers.push({
        position: [
          proud(FRAME_DEPTH),
          aperture.headY / 2,
          unit.z + side * (unit.width / 2 - aperture.sideInset / 2),
        ],
        scale: [FRAME_DEPTH, aperture.headY, aperture.sideInset],
      })
    }

    // Fascia — the bulkhead from the aperture head to the top of the band.
    fascias.push({
      position: [
        proud(FRAME_DEPTH),
        (aperture.headY + STOREFRONT.bandHeight) / 2,
        unit.z,
      ],
      scale: [FRAME_DEPTH, STOREFRONT.bandHeight - aperture.headY, unit.width],
    })

    // The dark interior behind the shutter. 5 mm proud of the wall, so the slat gaps
    // read as gaps rather than as facade.
    backings.push({
      position: [wall + dir * 0.005, aperture.baseY + APERTURE_HEIGHT / 2, apZ],
      scale: [0.01, APERTURE_HEIGHT, apWidth],
    })

    // The shutter roll, at the head of the aperture.
    rolls.push({
      position: [wall + dir * STOREFRONT.rollRadius, aperture.headY, apZ],
      scale: [STOREFRONT.rollRadius, apWidth, STOREFRONT.rollRadius],
      rotationX: Math.PI / 2,
    })

    // Slats, stacked down from the head. A fixed 0.09 world pitch on every unit and
    // every state — the reason §3.4 spends geometry here instead of §8's normal map.
    const drop = shutterDrop(unit)
    const count = Math.max(0, Math.floor(drop / slatPitch))
    const bank = slats[unit.variant] as Placement[]
    for (let i = 0; i < count; i++) {
      bank.push({
        position: [
          wall + dir * (slatDepth / 2 + 0.01),
          aperture.headY - (i + 0.5) * slatPitch,
          apZ,
        ],
        // 0.9 of the pitch, so the 10% left over is the groove between slats.
        scale: [slatDepth, slatPitch * 0.9, apWidth],
      })
    }

    // Spill from anything not shut — the light under a half-down shutter is the whole
    // reason `ajar` exists as a state.
    if (unit.state !== 'closed') {
      /* A band on the shop floor, not the whole opening. Ajar shows nearly all of its
         0.62 slot; open shows 0.55 of floor under 1.75 of dark interior, which is what
         a lit room behind a raised shutter actually looks like from the street. */
      const clearance = Math.min(APERTURE_HEIGHT - drop, STOREFRONT.spillBandHeight)
      spills.push({
        position: [wall + dir * 0.02, aperture.baseY + clearance / 2, apZ],
        scale: [0.01, clearance, apWidth * 0.94],
      })
    }

    // Doorway: a dark panel on the wall, with jambs and a lintel standing 0.45 proud.
    // The depth between them is the recess.
    doors.push({
      position: [wall + dir * 0.01, doorway.height / 2, doorZ],
      scale: [0.02, doorway.height, doorway.width],
    })
    for (const side of [-1, 1] as const) {
      jambs.push({
        position: [
          proud(doorway.recess),
          doorway.height / 2,
          doorZ + side * (doorway.width / 2 + 0.06),
        ],
        scale: [doorway.recess, doorway.height, 0.12],
      })
    }
    lintels.push({
      position: [proud(doorway.recess), doorway.height + 0.06, doorZ],
      scale: [doorway.recess, 0.12, doorway.width + 0.24],
    })

    /* Sign box, centred over the doorway — unless a §3.5 neon sign already claims this
       stretch of wall. The projecting sign carries a §11.4 string and this box carries
       nothing, so where they stack the box is the one that goes. */
    if (unit.signBox) {
      const sign: Placement = {
        position: [
          wall + dir * (FRAME_DEPTH + signBox.proud / 2),
          signBox.baseY + signBox.height / 2,
          doorZ,
        ],
        scale: [signBox.proud, signBox.height, signBox.width],
      }
      if (unit.signColor === null) {
        darkSigns.push(sign)
      } else {
        const bucket = litSigns.get(unit.signColor)
        if (bucket === undefined) litSigns.set(unit.signColor, [sign])
        else bucket.push(sign)
      }
    }

    if (unit.awning) {
      awningSlabs.push({
        position: [
          wall + dir * (awning.depth / 2),
          awning.undersideY + awning.thickness / 2,
          unit.z,
        ],
        scale: [awning.depth, awning.thickness, unit.width - 0.2],
      })
      awningBars.push({
        position: [wall + dir * awning.depth, awning.undersideY, unit.z],
        scale: [awning.barRadius, unit.width - 0.2, awning.barRadius],
        rotationX: Math.PI / 2,
      })
    }

    /* §12.4 — a box on the shutter and a box on the doorway, as the unit goes up.
       Both are inert against the §3 clamp (see §3.4) and go on anyway: this is the
       registry the §3.2 items standing *in* the alley will resolve against. */
    const spanX = (depth: number) =>
      dir === 1 ? { minX: wall, maxX: wall + depth } : { minX: wall - depth, maxX: wall }

    boxes.push({
      ...spanX(slatDepth + 0.02),
      minZ: apZ - apWidth / 2,
      maxZ: apZ + apWidth / 2,
    })
    boxes.push({
      ...spanX(doorway.recess),
      minZ: doorZ - doorway.width / 2 - 0.12,
      maxZ: doorZ + doorway.width / 2 + 0.12,
    })
  }

  return {
    plinths,
    piers,
    fascias,
    backings,
    rolls,
    doors,
    jambs,
    lintels,
    spills,
    awningSlabs,
    awningBars,
    darkSigns,
    litSigns,
    slats,
    boxes,
  }
}

export default function Storefronts() {
  const placements = useMemo(() => buildPlacements(), [])

  const materials = useMemo(() => {
    /** §3.2 — three shutter variants. Three tints of the one `shutter` token, which is
     *  what keeps a wall of them from reading as three different materials. */
    const shutterTints = [PALETTE.shutter, PALETTE.metalDark, PALETTE.concrete]

    return {
      concrete: standard(PALETTE.concrete, {
        roughness: MATERIALS.concrete.roughness,
        envMapIntensity: MATERIALS.concrete.envMapIntensity,
      }),
      fascia: standard(PALETTE.facade),
      backing: standard(PALETTE.void, { roughness: 0.95 }),
      metal: standard(PALETTE.metalDark, {
        roughness: MATERIALS.paintedMetal.roughness,
        metalness: MATERIALS.paintedMetal.metalness,
        envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
      }),
      shutters: shutterTints.map((tint) =>
        standard(tint, {
          roughness: MATERIALS.rollerShutter.roughness,
          metalness: MATERIALS.rollerShutter.metalness,
        }),
      ),
      /* Diffuse `void`, accent in the emissive term only. Putting the accent in both
         stacks a fully-lit surface on top of a glow and the panel reads as coloured
         paint rather than as a light — and it lands at roughly twice the intensity
         §8.1 asked for, which is not visible as an error anywhere in the numbers.
         §8.1 — 1.10, over the knee so it glows, under the lanterns at 1.30 and under
         every content surface. §4 calls `sodium` the convenience-store spill. */
      spill: standard(PALETTE.void, {
        emissive: PALETTE[STOREFRONT.spillColor],
        emissiveIntensity: STOREFRONT.spillEmissive,
      }),
      /* §8.1 — 0.85, under the 0.90 threshold. Fourteen of these; on the bloom side
         they would out-glow the shopfront and break §17. */
      litSigns: new Map(
        [...placements.litSigns.keys()].map((token) => [
          token,
          standard(PALETTE.void, {
            emissive: PALETTE[token],
            emissiveIntensity: STOREFRONT.signEmissive,
          }),
        ]),
      ),
      darkSign: standard(PALETTE[STOREFRONT.unlitSignColor]),
      awning: standard(PALETTE.shutter, {
        roughness: MATERIALS.norenFabric.roughness,
        metalness: MATERIALS.norenFabric.metalness,
      }),
    }
  }, [placements])

  // §12.4 — boxes go on as the objects are placed, and come off with them.
  useEffect(() => registerBoxes(placements.boxes), [placements])

  // Dev only. The layout is generated, so the check that it honours the reserved slots
  // and the §4 ratio is a check on this list, not on a screenshot.
  useEffect(() => {
    expose('storefronts', STOREFRONT_UNITS)
  }, [])

  return (
    <>
      <Instanced name="storefront:plinth" geometry={UNIT_BOX} material={materials.concrete} placements={placements.plinths} />
      <Instanced name="storefront:pier" geometry={UNIT_BOX} material={materials.concrete} placements={placements.piers} />
      <Instanced name="storefront:fascia" geometry={UNIT_BOX} material={materials.fascia} placements={placements.fascias} />
      <Instanced name="storefront:backing" geometry={UNIT_BOX} material={materials.backing} placements={placements.backings} />
      <Instanced name="storefront:door" geometry={UNIT_BOX} material={materials.backing} placements={placements.doors} />
      <Instanced name="storefront:jamb" geometry={UNIT_BOX} material={materials.metal} placements={placements.jambs} />
      <Instanced name="storefront:lintel" geometry={UNIT_BOX} material={materials.metal} placements={placements.lintels} />
      <Instanced name="storefront:roll"
        geometry={UNIT_CYLINDER}
        material={materials.metal}
        placements={placements.rolls}
      />

      {placements.slats.map((bank, variant) => (
        <Instanced
          key={`slats:${variant}`}
          name={`storefront:slat:${variant}`}
          geometry={UNIT_BOX}
          material={materials.shutters[variant] as Material}
          placements={bank}
        />
      ))}

      <Instanced name="storefront:spill" geometry={UNIT_BOX} material={materials.spill} placements={placements.spills} />

      <Instanced name="storefront:signBox" geometry={UNIT_BOX} material={materials.darkSign} placements={placements.darkSigns} />
      {[...placements.litSigns].map(([token, bucket]) => (
        <Instanced
          key={`sign:${token}`}
          name={`storefront:signBox:${token}`}
          geometry={UNIT_BOX}
          material={materials.litSigns.get(token) as Material}
          placements={bucket}
        />
      ))}

      <Instanced name="storefront:awning"
        geometry={UNIT_BOX}
        material={materials.awning}
        placements={placements.awningSlabs}
      />
      <Instanced name="storefront:awningBar"
        geometry={UNIT_CYLINDER}
        material={materials.metal}
        placements={placements.awningBars}
      />
    </>
  )
}
