'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  type InstancedMesh,
  type Material,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  Object3D,
  PlaneGeometry,
} from 'three'
import { registerBoxes } from '@/lib/collision'
import { expose } from '@/lib/debug'
import { resolveTier } from '@/lib/device'
import {
  CONE_TAPERS,
  PROP_BOXES,
  STREET_PROPS,
  type Part,
  type PrimitiveKey,
  type Prop,
  type SurfaceKey,
  audit,
  clampReport,
} from '@/lib/props'
import { lanternPaper } from '@/lib/textures/lanternPaper'
import { roadGlowTexture } from '@/lib/textures/roadGlow'
import { CONTACT_AO_DECAL, MATERIALS, PALETTE, PROPS } from '@/lib/world'

/**
 * §3.7 — the street props. The band between §3.4's wall and §3.5's overhead layer, and
 * the only layer in this world the visitor can walk into.
 *
 * The layout — what stands where, how it is turned, what each one is made of — is decided
 * in `lib/props.ts` and read here. This file knows how to draw a list of parts and
 * nothing about how that list was chosen, which is the same split §3.4 and §3.6 use.
 *
 * **Everything is drawn by material, not by object.** Sixty-four props made of 225 parts
 * come out as **twelve** `InstancedMesh`es plus one decal pass, because a bucket is keyed
 * on `(geometry, material)` and a crate, a scooter cowl and a vending machine body are
 * all the same box in the same dark. Drawn per object this section would be sixty-four
 * draw calls on its own and could not ship on a phone at all (§15).
 *
 * **Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against.
 */

/* Written once at mount and never in a frame loop — nothing in this file moves. The two
   dummies are reused across all 225 parts; the composed matrices cannot be, since each
   one is kept until its InstancedMesh exists to receive it. */
const root = new Object3D()
const child = new Object3D()

/**
 * The four shapes.
 *
 * **Boxes and cylinders share one convention: `scale` is the full extent**, so a cylinder
 * is authored at radius 0.5 and scaled by its diameter. Storefronts.tsx uses radius 1 and
 * scales by the radius; mixing the two inside one part list is a class of bug that halves
 * or doubles a single object and looks like a typo in the brief.
 *
 * The two cones are the exception and have to be: a taper is baked into the geometry and
 * no per-instance scale can reach it, which is why §3.7's cone band is its own geometry
 * carrying radii read off the cone it wraps. Both are one unit tall and scaled in Y only.
 */
const GEOMETRY: Record<PrimitiveKey, BufferGeometry> = {
  box: new BoxGeometry(1, 1, 1),
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 12, 1),
  cone: new CylinderGeometry(CONE_TAPERS.cone.top, CONE_TAPERS.cone.bottom, 1, 12, 1),
  coneBand: new CylinderGeometry(CONE_TAPERS.coneBand.top, CONE_TAPERS.coneBand.bottom, 1, 12, 1),
}

function standard(color: string, extra: MeshStandardMaterialParameters = {}) {
  return new MeshStandardMaterial({ color, ...extra })
}

/**
 * Eight surfaces for the whole prop set.
 *
 * Every one of these is a draw call per geometry it appears on (§15), so the set is kept
 * deliberately short — a colour earns its own material only where no existing one does
 * its job. `void` is the exception worth naming: it is a full 1.5 stops darker than
 * `shutter` and it is what makes a vending machine front read as glass rather than as
 * more machine.
 */
const SURFACE: Record<SurfaceKey, Material> = {
  concrete: standard(PALETTE.concrete, {
    roughness: MATERIALS.concrete.roughness,
    metalness: MATERIALS.concrete.metalness,
    envMapIntensity: MATERIALS.concrete.envMapIntensity,
  }),
  metalDark: standard(PALETTE.metalDark, {
    roughness: MATERIALS.paintedMetal.roughness,
    metalness: MATERIALS.paintedMetal.metalness,
    envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
  }),
  shutter: standard(PALETTE.shutter, {
    roughness: MATERIALS.rollerShutter.roughness,
    metalness: MATERIALS.rollerShutter.metalness,
  }),
  void: standard(PALETTE.void, { roughness: 0.95, metalness: 0.0 }),
  signWhite: standard(PALETTE.signWhite, {
    roughness: MATERIALS.paintedMetal.roughness,
    metalness: MATERIALS.paintedMetal.metalness,
    envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
  }),
  roadOrange: standard(PALETTE[PROPS.cone.color], {
    roughness: MATERIALS.paintedMetal.roughness,
    metalness: MATERIALS.paintedMetal.metalness,
  }),
  /* §3.4's rule, which applies to every emissive surface in the world: the accent lives
     in the emissive term and the diffuse stays `void`. Putting it in both stacks a fully
     lit surface under the glow, so the panel reads as orange paint instead of as a lamp
     and arrives at roughly twice the intensity §8.1 asked for. */
  cartLamp: standard(PALETTE.void, {
    emissive: PALETTE[PROPS.foodCart.lamp.color],
    emissiveIntensity: PROPS.foodCart.lamp.emissive,
  }),
  /* §8 — `side: DoubleSide` on the paper lantern, because a paper shade is lit from
     inside and its far wall is part of what you see. §3.7's painted paper is attached in
     the component, not here: this object is module scope and the tier is not known until a
     component can call `resolveTier()`. */
  lanternGlow: standard(PALETTE.void, {
    emissive: PALETTE[PROPS.paperLantern.color],
    emissiveIntensity: PROPS.paperLantern.emissive,
    roughness: MATERIALS.paperLantern.roughness,
    metalness: MATERIALS.paperLantern.metalness,
    side: DoubleSide,
  }),
}

/** Lies flat, so the decal quad is one shared geometry with no per-instance rotation. */
const DECAL_GEOMETRY = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)

type Bucket = { key: string; primitive: PrimitiveKey; surface: SurfaceKey; matrices: Matrix4[] }

/**
 * Every part of every prop, composed into world space and sorted into its bucket.
 *
 * The composition is `propTransform × partTransform`, and the prop's own euler order is
 * **`YXZ`**: the yaw turns it to face its wall, and the lean is then taken about the
 * *yawed* X axis, which is the scooter's own length. Under three's default `XYZ` the lean
 * would be applied first and a leaning scooter would come out pitched nose-down instead.
 */
function buildBuckets(): { buckets: Bucket[]; decals: Matrix4[] } {
  const byKey = new Map<string, Bucket>()
  const decals: Matrix4[] = []

  for (const prop of STREET_PROPS) {
    root.position.set(prop.position[0], prop.position[1], prop.position[2])
    root.rotation.set(prop.lean, prop.yaw, 0, 'YXZ')
    root.updateMatrix()

    for (const part of prop.parts as readonly Part[]) {
      child.position.set(part.position[0], part.position[1], part.position[2])
      const rotation = part.rotation ?? [0, 0, 0]
      child.rotation.set(rotation[0] as number, rotation[1] as number, rotation[2] as number, 'XYZ')
      child.scale.set(part.scale[0], part.scale[1], part.scale[2])
      child.updateMatrix()

      const key = `${part.primitive}:${part.surface}`
      let bucket = byKey.get(key)
      if (bucket === undefined) {
        bucket = { key, primitive: part.primitive, surface: part.surface, matrices: [] }
        byKey.set(key, bucket)
      }
      bucket.matrices.push(new Matrix4().multiplyMatrices(root.matrix, child.matrix))
    }

    if (!prop.decal) continue

    /* §7's decal, at §3.7's multiplier of the prop's own footprint. It takes the prop's
       yaw so an oblong prop gets an oblong shadow, and sits at 0.010 — over §6.1's
       reflector strip at 0.004 and under §3.6's road glow at 0.014. */
    child.position.set(0, PROPS.contactDecal.y, 0)
    child.rotation.set(0, 0, 0, 'XYZ')
    child.scale.set(
      prop.footprint[0] * PROPS.contactDecal.spread,
      1,
      prop.footprint[1] * PROPS.contactDecal.spread,
    )
    child.updateMatrix()
    decals.push(new Matrix4().multiplyMatrices(root.matrix, child.matrix))
  }

  return { buckets: [...byKey.values()], decals }
}

/**
 * One InstancedMesh. Matrices are written in a ref callback and `computeBoundingSphere`
 * follows — an InstancedMesh otherwise culls against its geometry at the origin, and a
 * run spread over 44 m of alley vanishes as one unit the moment the origin leaves frame.
 */
function Instanced({
  name,
  geometry,
  material,
  matrices,
}: {
  name: string
  geometry: BufferGeometry
  material: Material
  matrices: readonly Matrix4[]
}) {
  const attach = useCallback(
    (mesh: InstancedMesh | null) => {
      if (mesh === null) return
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [matrices],
  )

  if (matrices.length === 0) return null
  return <instancedMesh name={name} ref={attach} args={[geometry, material, matrices.length]} />
}

export default function Props() {
  const tier = resolveTier()
  const { buckets, decals } = useMemo(() => buildBuckets(), [])

  /**
   * §3.7 — the lantern's painted paper, attached to the shared material once the tier is
   * known. `SURFACE` is module scope and cannot call `resolveTier()`; the painter caches, so
   * this runs one canvas for the page however many times the component re-renders.
   *
   * **`emissiveMap`, not `map`.** The shade's diffuse is `void` per §3.4's rule, so a `map`
   * would modulate a near-black surface and change nothing. `emissiveMap` multiplies
   * `emissive × emissiveIntensity` per texel, which is exactly what "the frame behind the
   * paper is blocking the light here" is. Greyscale for the same reason: the colour is
   * `lantern` and the map only says how much gets through.
   *
   * In `useMemo` rather than `useEffect` so the map is on the material before the first
   * frame — an effect would show one frame of unribbed lanterns on every mount.
   */
  useMemo(() => {
    const paper = lanternPaper(tier)
    if (paper === null) return
    const shade = SURFACE.lanternGlow as MeshStandardMaterial
    if (shade.emissiveMap === paper) return
    shade.emissiveMap = paper
    shade.needsUpdate = true
  }, [tier])

  /**
   * §3.6's painted radial pool, reused rather than repainted: it is already a smoothstep
   * falloff to a transparent edge, which is exactly a contact shadow. §15's texture
   * budget does not move — the painter caches per tier at module scope.
   *
   * **It goes in `map`, not in `alphaMap`, and that is not interchangeable.** This
   * texture is painted white with its whole shape in the **alpha** channel, and three's
   * `alphaMap` samples the **green** channel — which is 255 across every pixel of it. As
   * an alpha map it therefore reads as a constant 1.0 and every decal in the world was a
   * hard-edged opaque rectangle, at exactly the right size and the right colour, in
   * exactly the right place. §3.6 already uses `map` for the same texture; a `map`'s
   * alpha multiplies `opacity` and its white RGB multiplies `color`, which is the whole
   * effect in one slot.
   */
  const decalMaterial = useMemo(() => {
    const map = roadGlowTexture('pool', tier)
    if (map === null) return null
    return new MeshBasicMaterial({
      color: PALETTE[CONTACT_AO_DECAL.color],
      map,
      transparent: true,
      opacity: CONTACT_AO_DECAL.opacity,
      // Ground decals must not occlude each other where two props stand close together.
      depthWrite: false,
      toneMapped: false,
    })
  }, [tier])

  // §12.4 — boxes go on as the objects are placed, and come off with them. These are the
  // first in the world that are not inert against §3's clamp; see §3.7.
  useEffect(() => registerBoxes(PROP_BOXES), [])

  /* Dev only. The placements are authored, so *"no collisions"* is a property to be
     checked rather than claimed — `audit()` moved three of them before this file drew
     anything, and none of the three was visible in the numbers. */
  useEffect(() => {
    expose('props', STREET_PROPS as readonly Prop[])
    expose('propAudit', audit)
    expose('propClamps', clampReport)
  }, [])

  return (
    <>
      {buckets.map((bucket) => (
        <Instanced
          key={bucket.key}
          name={`prop:${bucket.key}`}
          geometry={GEOMETRY[bucket.primitive]}
          material={SURFACE[bucket.surface]}
          matrices={bucket.matrices}
        />
      ))}

      {decalMaterial !== null ? (
        <Instanced
          name="prop:contactDecal"
          geometry={DECAL_GEOMETRY}
          material={decalMaterial}
          matrices={decals}
        />
      ) : null}
    </>
  )
}
