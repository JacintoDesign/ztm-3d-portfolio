'use client'

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three'
import { type PreparedCar, prepareCar } from '@/lib/carModels'
import { expose } from '@/lib/debug'
import { resolveTier } from '@/lib/device'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { roadGlowTexture } from '@/lib/textures/roadGlow'
import { TRAFFIC_LANES, VEHICLES, laneClearances, trackX } from '@/lib/traffic'
import { MATERIALS, PALETTE, TRAFFIC, type VehicleVariant } from '@/lib/world'

/**
 * §3.6 — the six vehicles on the cross street.
 *
 * **The cars are glTF models from `public/`**, merged per material by `lib/carModels.ts`
 * and mounted as one `InstancedMesh` per merged part. Nine parts across the three models,
 * each carrying its two copies: the alternative is 57 draw calls, which §15's mobile
 * budget cannot pay.
 *
 * **The lamps are still this file's, and deliberately.** None of the three models carries
 * an emissive light — the RX-7 has a material named for one, the other two have nothing —
 * and headlights are the only part of a car this world can actually see: through 40 m of
 * §5's fog a dark body is a silhouette and the lamps are the whole event. They are placed
 * from each model's *measured* box rather than from authored dimensions, so a hatchback
 * and a Range Rover each get them at their own height.
 *
 * **Nothing here is a light.** §7 caps the world at ten dynamic lights and all ten are
 * spent inside the alley. The lamps are emissive material feeding §9's bloom and the
 * light on the road is three painted quads lying on it.
 *
 * **Nothing here is solid** (§3.6). The whole street lies past z = 24.60 against §3's
 * clamp at z ≤ 21.40, so §12.4's registry gets nothing.
 *
 * **Every vehicle is rigid and only ever translates along X.** That is what lets the
 * frame loop write one float per instance instead of composing a matrix: the full
 * transform is built once at mount with the vehicle sitting at x = 0, and each frame only
 * element 12 of each matrix — its world x — is rewritten. No allocation, no `setState`.
 */

/* Hoisted and shared. A geometry built in a render body is the allocation CLAUDE.md
   rules out; these live for the page, which is the correct lifetime for them. */
const UNIT_BOX = new BoxGeometry(1, 1, 1)
const UNIT_QUAD = new PlaneGeometry(1, 1)

/** Used only at mount, to compose the fixed part of each instance transform. */
const dummy = new Object3D()

const { models, lampPlacement, headlight, tailLamp, glow } = TRAFFIC

const MODEL_KEYS = Object.keys(models) as VehicleVariant[]
/** Spaces in a filename are legal and `fetch` is not the place to find out. */
const modelUrl = (key: VehicleVariant) => encodeURI(models[key].file)

// Fetching starts with the module rather than with the first render.
for (const key of MODEL_KEYS) useGLTF.preload(modelUrl(key))

/* ── Materials ──────────────────────────────────────────────────────────────── */

/**
 * §3.4's rule, and it applies to every emissive surface in the world: the diffuse is
 * `void` and the colour lives in the emissive term alone. Putting the accent in both
 * stacks a fully-lit surface under the glow and the lamp arrives at twice the intensity
 * §8.1 asked for — invisible in the numbers, obvious on the road.
 */
const lampMaterial = (color: keyof typeof PALETTE, emissive: number) =>
  new MeshStandardMaterial({
    color: PALETTE.void,
    emissive: PALETTE[color],
    emissiveIntensity: emissive,
    roughness: MATERIALS.neonTube.roughness,
    metalness: MATERIALS.neonTube.metalness,
  })

const headlightMaterial = lampMaterial(headlight.color, headlight.emissive)
const tailLampMaterial = lampMaterial(tailLamp.color, tailLamp.emissive)

/* ── Instance layout ────────────────────────────────────────────────────────── */

type PartInstance = {
  vehicle: number
  /** `x` is the offset from the vehicle's own centre; `y` and `z` are world, and fixed. */
  base: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

type PartGroup = {
  key: string
  geometry: BufferGeometry
  material: Material
  instances: PartInstance[]
}

type GlowMaterials = { under: Material; pool: Material; smear: Material }

function buildGroups(
  cars: Map<VehicleVariant, PreparedCar>,
  glowMaterials: GlowMaterials,
): PartGroup[] {
  const lamps: Record<'headlights' | 'tailLamps' | 'under' | 'pool' | 'smear', PartInstance[]> = {
    headlights: [],
    tailLamps: [],
    under: [],
    pool: [],
    smear: [],
  }
  /** One bucket per merged model part; every vehicle of that model lands in it. */
  const modelParts = new Map<string, PartGroup>()

  for (const vehicle of VEHICLES) {
    const car = cars.get(vehicle.variant)
    if (car === undefined) continue

    const { lane } = vehicle
    const { length, width, height } = car.size
    /**
     * The whole of the direction handling. A −X-bound vehicle is the same vehicle turned
     * round, so every offset measured along its nose and across its body flips sign
     * together — which is what the π rotation on the body does, written out for the parts
     * that are placed rather than modelled.
     */
    const f = lane.direction
    const z = lane.centreZ

    car.parts.forEach((part, index) => {
      const key = `${vehicle.variant}:${index}`
      let group = modelParts.get(key)
      if (group === undefined) {
        group = { key, geometry: part.geometry, material: part.material, instances: [] }
        modelParts.set(key, group)
      }
      group.instances.push({
        vehicle: vehicle.index,
        base: [0, 0, z],
        // The model is baked nose-to-+X; this is the only place it is ever turned.
        rotation: [0, lane.rotationY, 0],
        scale: [1, 1, 1],
      })
    })

    /**
     * The lamps sit on the corners of the model's measured box, wrapping from the nose
     * onto the side. Both offsets are from the bodywork rather than from the centreline:
     * placed by an inset from the centre a lamp ends up inside the car, showing only the
     * sliver that clears the nose — and the alley sees this street broadside, never from
     * in front, so that sliver is edge-on and there are no lights on the street at all.
     */
    for (const side of [1, -1]) {
      lamps.headlights.push({
        vehicle: vehicle.index,
        base: [
          (length / 2 + headlight.noseProud - headlight.depth / 2) * f,
          height * lampPlacement.headlightYFraction,
          z + side * (width / 2 + headlight.sideProud - headlight.lateral / 2) * f,
        ],
        rotation: [0, 0, 0],
        scale: [headlight.depth, headlight.height, headlight.lateral],
      })
      lamps.tailLamps.push({
        vehicle: vehicle.index,
        base: [
          -(length / 2 + tailLamp.noseProud - tailLamp.depth / 2) * f,
          height * lampPlacement.tailLampYFraction,
          z + side * (width / 2 + tailLamp.sideProud - tailLamp.lateral / 2) * f,
        ],
        rotation: [0, 0, 0],
        scale: [tailLamp.depth, tailLamp.height, tailLamp.lateral],
      })
    }

    /**
     * The three quads on the road.
     *
     * A plane stands in XY with its texture's far edge at local +Y. Spinning it in its
     * own plane by `−f · 90°` and then laying it flat points that edge along the vehicle's
     * direction of travel, which is the only orientation the headlight beam can be built
     * at — the other three of the four are a beam shining sideways or backwards, and all
     * three look deliberate.
     */
    const flat: [number, number, number] = [-Math.PI / 2, 0, (-f * Math.PI) / 2]

    lamps.under.push({
      vehicle: vehicle.index,
      base: [0, glow.under.y, z],
      rotation: flat,
      scale: [glow.under.width, length * glow.under.lengthScale, 1],
    })
    lamps.pool.push({
      vehicle: vehicle.index,
      base: [(length / 2 + glow.headlightPool.length / 2) * f, glow.headlightPool.y, z],
      rotation: flat,
      scale: [glow.headlightPool.width, glow.headlightPool.length, 1],
    })
    lamps.smear.push({
      vehicle: vehicle.index,
      base: [-(length / 2 + glow.tailSmear.length / 2) * f, glow.tailSmear.y, z],
      rotation: flat,
      scale: [glow.tailSmear.width, glow.tailSmear.length, 1],
    })
  }

  return [
    ...modelParts.values(),
    { key: 'headlights', geometry: UNIT_BOX, material: headlightMaterial, instances: lamps.headlights },
    { key: 'tailLamps', geometry: UNIT_BOX, material: tailLampMaterial, instances: lamps.tailLamps },
    { key: 'under', geometry: UNIT_QUAD, material: glowMaterials.under, instances: lamps.under },
    { key: 'pool', geometry: UNIT_QUAD, material: glowMaterials.pool, instances: lamps.pool },
    { key: 'smear', geometry: UNIT_QUAD, material: glowMaterials.smear, instances: lamps.smear },
  ].filter((group) => group.instances.length > 0)
}

/* ── The parts, and the one frame loop that moves them ──────────────────────── */

/** What the frame loop needs about a mounted part, and nothing more. */
type MountedPart = {
  mesh: InstancedMesh
  /** Each instance's x offset from its vehicle's centre. */
  baseX: Float32Array
  /** Which vehicle each instance belongs to. */
  owner: Uint8Array
}

/**
 * The mounted parts, at module scope alongside everything else the frame loop touches.
 *
 * A ref would be the instinct, and the lint rule is right to refuse it: a ref read during
 * render is a bug in general. This list is not render state — it is the frame loop's
 * working set, filled by ref callbacks and read by `useFrame`, exactly like `dummy` and
 * `carX` below it. There is one `<Traffic />` in the world, for the same reason there is
 * one `<Canvas>`.
 */
const MOUNTED: MountedPart[] = []

/** Hoisted: one world x per vehicle, rewritten in place every frame. */
const carX = new Float32Array(VEHICLES.length)
/** How far each lane has run. Never advanced under §13. */
const travelled = new Float64Array(TRAFFIC_LANES.length)
/** True once the held frame has been written, so §13 costs nothing per frame after it. */
let settled = false

/**
 * §3.6's claims are numbers, and several of them cannot be checked by looking: whether a
 * lane's clearances stay positive, where a car actually is, what it looks like with the
 * street held at a chosen moment. `travelled` is writable on purpose — scrubbing it is
 * how a passing car gets photographed. Dead code in a production bundle.
 */
expose('traffic', {
  vehicles: VEHICLES,
  lanes: TRAFFIC_LANES,
  carX,
  travelled,
  clearances: laneClearances,
})

function Part({
  name,
  geometry,
  material,
  instances,
}: {
  name: string
  geometry: BufferGeometry
  material: Material
  instances: PartInstance[]
}) {
  const attach = (mesh: InstancedMesh) => {
    const baseX = new Float32Array(instances.length)
    const owner = new Uint8Array(instances.length)

    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i] as PartInstance
      dummy.position.set(...instance.base)
      dummy.rotation.set(...instance.rotation)
      dummy.scale.set(...instance.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      baseX[i] = instance.base[0]
      owner[i] = instance.vehicle
    }

    mesh.instanceMatrix.needsUpdate = true

    const part: MountedPart = { mesh, baseX, owner }
    MOUNTED.push(part)
    settled = false

    return () => {
      const at = MOUNTED.indexOf(part)
      if (at >= 0) MOUNTED.splice(at, 1)
    }
  }

  return (
    <instancedMesh
      name={`traffic:${name}`}
      ref={attach}
      args={[geometry, material, instances.length]}
    />
  )
}

export default function Traffic() {
  const tier = resolveTier()
  const gltfs = useGLTF(MODEL_KEYS.map(modelUrl))

  /**
   * Merged and normalised once per model. Not per vehicle: two RX-7s share one set of
   * merged geometries and one set of materials, which is the entire point of the
   * `InstancedMesh` beneath them.
   */
  const cars = useMemo(() => {
    const prepared = new Map<VehicleVariant, PreparedCar>()
    MODEL_KEYS.forEach((key, i) => {
      const scene = gltfs[i]?.scene
      if (scene === undefined) return
      prepared.set(key, prepareCar(scene, models[key].targetLength, models[key].yawOffset))
    })
    return prepared
  }, [gltfs])

  /**
   * §3.6 — alpha-blended, never additive. Additive is the obvious blend for a glow and
   * it breaks under `FogExp2`: three mixes the fragment toward `fogColor` before the
   * blend, so at this distance an additive quad adds most of `#0A0F1A` across its whole
   * rectangle and the glow arrives inside a visible dark-blue box.
   */
  const glowMaterials = useMemo((): GlowMaterials => {
    const quad = (map: ReturnType<typeof roadGlowTexture>, color: string, opacity: number) =>
      new MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        depthWrite: false,
        ...(map !== null ? { map } : {}),
      })

    const pool = roadGlowTexture('pool', tier)
    return {
      under: quad(pool, '#ffffff', glow.under.opacity),
      pool: quad(
        roadGlowTexture('beam', tier),
        PALETTE[glow.headlightPool.color],
        glow.headlightPool.opacity,
      ),
      smear: quad(pool, PALETTE[glow.tailSmear.color], glow.tailSmear.opacity),
    }
  }, [tier])

  /**
   * One frame callback for the whole street.
   *
   * Everything it touches is hoisted and mutated in place: two typed arrays and the
   * instance matrix buffers. Nothing is allocated, nothing reaches React, and the only
   * value written per instance is element 12 — the world x — because that is the only
   * thing about a vehicle on a straight road that ever changes.
   */
  const groups = useMemo(() => buildGroups(cars, glowMaterials), [cars, glowMaterials])

  useFrame((_, delta) => {
    /* §13 — the traffic stops, it does not slow: a slower car reads as broken in the
       same way the brief says slower rain does. Once the held frame is written there is
       nothing left to do, so the loop costs one boolean read. */
    const frozen = prefersReducedMotion()
    if (frozen && settled) return

    if (!frozen) {
      for (let i = 0; i < TRAFFIC_LANES.length; i++) {
        travelled[i] += (TRAFFIC_LANES[i] as (typeof TRAFFIC_LANES)[number]).speed * delta
      }
    }

    for (let i = 0; i < VEHICLES.length; i++) {
      const vehicle = VEHICLES[i] as (typeof VEHICLES)[number]
      carX[i] = trackX(vehicle.lane, vehicle.offset + (travelled[vehicle.lane.index] as number))
    }

    for (let p = 0; p < MOUNTED.length; p++) {
      const { mesh, baseX, owner } = MOUNTED[p] as MountedPart
      const array = mesh.instanceMatrix.array
      for (let i = 0; i < baseX.length; i++) {
        array[i * 16 + 12] = (baseX[i] as number) + (carX[owner[i] as number] as number)
      }
      mesh.instanceMatrix.needsUpdate = true

      /* Culling has to be re-earned every frame, and it is worth earning. These matrices
         are written with the vehicle at x = 0 and then translated up to 120 m either way,
         so the bounds computed at mount describe six cars stacked in the middle of the
         road and the street would empty itself as you looked at it. Left uncullable
         instead, all 136 k triangles of car are submitted every frame including the ones
         behind the station wall. `computeBoundingSphere` on an `InstancedMesh` walks the
         instance matrices — twelve of them at most here — and allocates nothing. */
      mesh.computeBoundingSphere()
    }

    settled = frozen
  })

  return (
    <>
      {groups.map((group) => (
        <Part
          key={group.key}
          name={`car:${group.key}`}
          geometry={group.geometry}
          material={group.material}
          instances={group.instances}
        />
      ))}
    </>
  )
}
