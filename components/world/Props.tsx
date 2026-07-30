'use client'

import { Suspense, useCallback, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type InstancedMesh,
  type Material,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  Object3D,
  PlaneGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { prepareCar } from '@/lib/carModels'
import { registerBoxes } from '@/lib/collision'
import { expose } from '@/lib/debug'
import { resolveTier } from '@/lib/device'
import {
  CONE_TAPERS,
  PROP_BOXES,
  PROP_TOKENS,
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
import { grainParams } from '@/lib/textures/surfaceGrain'
import { vendingFront } from '@/lib/textures/vendingFront'
import { CONTACT_AO_DECAL, MATERIALS, PALETTE, PROPS, type Tier } from '@/lib/world'

/**
 * §3.7 — the street props. The band between §3.4's wall and §3.5's overhead layer, and
 * the only layer in this world the visitor can walk into.
 *
 * The layout — what stands where, how it is turned, what each one is made of — is decided
 * in `lib/props.ts` and read here. This file knows how to draw a list of parts and
 * nothing about how that list was chosen, which is the same split §3.4 and §3.6 use.
 *
 * **Drawn by material, and now genuinely by material.** Two hundred and twenty-five parts
 * used to come out as twelve `InstancedMesh`es bucketed on `(geometry, material)` — so a
 * crate and a vending machine body shared one, while the *same surface on a cylinder*
 * needed a second. §15 named the remaining lever three sections ago and this spends it:
 * the transforms bake into the vertices, one merged mesh per material family, and where
 * two surfaces differ only in colour the colour bakes into a vertex attribute. **Twelve
 * becomes eight.**
 *
 * **What baking costs, stated rather than assumed.** A box is 24 vertices, so 225 baked
 * parts is roughly 250 kB of buffer where instancing stored one geometry and 225 matrices.
 * Triangles do not move — an instance draws its geometry once either way. Culling does not
 * move either: these meshes span 44 m of alley and were never being culled. **What changes
 * is that four crate shades and the cone's three surfaces are now free**, because a vertex
 * colour is not a material.
 *
 * **Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against.
 */

/* Written once at mount and never in a frame loop — nothing in this file moves. */
const root = new Object3D()
const child = new Object3D()
const composed = new Matrix4()

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

/* ────────────────────────────────────────────────────────────────────────────
 * §15 — the material families
 *
 * A family is a set of surfaces that agree on everything a material carries except the
 * colour. That is the whole test, and it is what the old `(geometry, material)` bucketing
 * could not express: `metalDark`, `signWhite` and `roadOrange` have had identical
 * roughness, metalness and `envMapIntensity` since §3.7 was written and differed only in a
 * hex, which is a vertex attribute, not a draw call.
 * ──────────────────────────────────────────────────────────────────────────── */

type Family = 'paintedMetal' | 'matte' | 'crate' | 'shutter' | 'binDrum' | 'vendingFront' | 'cartLamp' | 'lanternGlow'

/**
 * Which family each surface belongs to.
 *
 * **`void` sits in `matte` and that is the one entry worth defending.** Its parts are four
 * coin flaps and two cart tyres — six near-black objects a few centimetres across, at 0.4%
 * reflectance. `matte` gives them roughness 0.72 where `void` asked for 0.95 and puts
 * §3.4's grain on them, and neither is visible on a surface that returns four parts in a
 * thousand of the light that hits it. It is a draw call for a difference that cannot be
 * seen, and §15's cap is a real constraint.
 */
const FAMILY: Record<SurfaceKey, Family> = {
  metalDark: 'paintedMetal',
  signWhite: 'paintedMetal',
  roadOrange: 'paintedMetal',
  concrete: 'matte',
  void: 'matte',
  crateKraft: 'crate',
  crateTimber: 'crate',
  shutter: 'shutter',
  binDrum: 'binDrum',
  vendingFront: 'vendingFront',
  cartLamp: 'cartLamp',
  lanternGlow: 'lanternGlow',
}

/** Families whose members differ only in colour, so the colour goes in the geometry. */
const TINTED: ReadonlySet<Family> = new Set<Family>(['paintedMetal', 'matte', 'crate'])

/**
 * Eight materials for two hundred and twenty-five parts.
 *
 * Built per tier rather than at module scope, because three of them carry §3.4's grain and
 * the grain is tier-split — `resolveTier()` cannot be called from module scope.
 */
function buildMaterials(tier: Tier): Record<Family, Material> {
  /* Tinted families take white and let the vertex colour carry §4. `color × vertexColor`
     is a multiply, so anything but white here would darken every member of the family at
     once, silently, in a way that looks like a palette change. */
  const tintable = (extra: MeshStandardMaterialParameters) =>
    standard('#ffffff', { vertexColors: true, ...extra })

  return {
    paintedMetal: tintable({
      roughness: MATERIALS.paintedMetal.roughness,
      metalness: MATERIALS.paintedMetal.metalness,
      envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
    }),
    matte: tintable({
      roughness: MATERIALS.concrete.roughness,
      metalness: MATERIALS.concrete.metalness,
      envMapIntensity: MATERIALS.concrete.envMapIntensity,
      ...grainParams('concrete', tier),
    }),
    /* §3.7 — the crates' own repeat. One grain tile across a 0.52 m face, which is the
       scale a cardboard box is; the `concrete` class at 3 would put aggregate speckle on a
       carton. A cloned texture shares its Source, so this costs no memory (§3.4). */
    crate: tintable({
      roughness: MATERIALS.concrete.roughness,
      metalness: MATERIALS.concrete.metalness,
      envMapIntensity: MATERIALS.concrete.envMapIntensity,
      ...grainParams('crate', tier),
    }),
    shutter: standard(PALETTE.shutter, {
      roughness: MATERIALS.rollerShutter.roughness,
      metalness: MATERIALS.rollerShutter.metalness,
    }),
    /* §3.7 — `metalDark` carrying the grain at the `metal` class, for galvanised speckle.
       It is the same colour as `paintedMetal`'s commonest member and still earns its own
       material: that one is shared with thirty-nine other cylinders in this alley, and a
       grain map on all of them is §3.4's rule applied where §3.4 says not to. */
    binDrum: standard(PALETTE[PROPS.rubbishPoint.drumColor], {
      roughness: MATERIALS.paintedMetal.roughness,
      metalness: MATERIALS.paintedMetal.metalness,
      envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
      ...grainParams('metal', tier),
    }),
    /* §3.7 — the painted drinks rack. **White, because the map *is* the albedo**: every
       other surface here multiplies a §4 token by a texture, and this one has no token to
       multiply. No emissive term — §3.7's rule that the bio station is the only lit
       machine stands, and what was wrong was the panel's reflectance, not its light. */
    vendingFront: standard('#ffffff', {
      map: vendingFront(tier),
      roughness: MATERIALS.rollerShutter.roughness,
      metalness: 0.0,
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
       inside and its far wall is part of what you see. §3.7's painted paper goes in
       `emissiveMap`: the diffuse is `void` per the rule above, so a `map` would modulate a
       near-black surface and change nothing, while `emissiveMap` multiplies
       `emissive × emissiveIntensity` per texel — which is what "the frame behind the paper
       is blocking the light here" actually is. */
    lanternGlow: standard(PALETTE.void, {
      emissive: PALETTE[PROPS.paperLantern.color],
      emissiveIntensity: PROPS.paperLantern.emissive,
      emissiveMap: lanternPaper(tier),
      roughness: MATERIALS.paperLantern.roughness,
      metalness: MATERIALS.paperLantern.metalness,
      side: DoubleSide,
    }),
  }
}

/** Lies flat, so the decal quad is one shared geometry with no per-instance rotation. */
const DECAL_GEOMETRY = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)

/* ────────────────────────────────────────────────────────────────────────────
 * §3.7 — the scooters, which are a glTF model rather than a part list
 * ──────────────────────────────────────────────────────────────────────────── */

// Fetching starts with the module rather than with the first render. §3.6's precedent.
useGLTF.preload(PROPS.scooter.model.file)

/**
 * The model's five authored materials, folded onto §4's three.
 *
 * It ships a light body, a near-black, a dark grey, an 8-triangle gold and a 12-triangle
 * chrome. The gold is the headlamp lens and has a rung of its own; **the chrome goes to the
 * body rather than to the frame**, because on a pale scooter the mirror stalks are what make
 * the silhouette read, and on a black one they were correctly invisible.
 *
 * Keyed on the model's own material names, so a swapped model announces itself by coming
 * out entirely in `metalColor` rather than by silently keeping its own colours.
 */
type ScooterToken = 'bodyColor' | 'darkColor' | 'metalColor' | 'lamp'

const SCOOTER_TOKEN: Record<string, ScooterToken> = {
  'Material.001': 'bodyColor',
  'Material.002': 'darkColor',
  'Material.003': 'metalColor',
  /* §3.7 — the headlamp lens, which was folded into the frame when it was always off. */
  [PROPS.scooter.lamp.material]: 'lamp',
  /* §4.2 — the chrome. It followed the frame while the body was `shutter`; on
     `scooterPaint` it belongs with the paint. */
  'Material.005': 'bodyColor',
}

const SCOOTER_SURFACE: Record<ScooterToken, Material> = {
  bodyColor: standard(PALETTE[PROPS.scooter.bodyColor], {
    roughness: MATERIALS.paintedMetal.roughness,
    metalness: MATERIALS.paintedMetal.metalness,
    envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
  }),
  darkColor: standard(PALETTE[PROPS.scooter.darkColor], { roughness: 0.95, metalness: 0.0 }),
  metalColor: standard(PALETTE[PROPS.scooter.metalColor], {
    roughness: MATERIALS.paintedMetal.roughness,
    metalness: MATERIALS.paintedMetal.metalness,
    envMapIntensity: MATERIALS.paintedMetal.envMapIntensity,
  }),
  /* §3.4's rule, which every emissive surface in this world obeys: the diffuse stays
     `void` and the colour lives in the emissive term alone. In both would stack a fully
     lit surface under the glow and arrive at roughly twice §8.1's figure. */
  lamp: standard(PALETTE.void, {
    emissive: PALETTE[PROPS.scooter.lamp.color],
    emissiveIntensity: PROPS.scooter.lamp.emissive,
    roughness: MATERIALS.neonTube.roughness,
    metalness: MATERIALS.neonTube.metalness,
  }),
}

/**
 * Four parked scooters, as one `InstancedMesh` per merged material.
 *
 * `lib/carModels.ts` does the work — node transforms baked into the vertices, merged by
 * material, scaled to `targetLength` with the nose turned to `+X`, then measured. **That
 * file was written for §3.6 with one caller and took this one with no changes**, which is
 * the only real test of whether the split between *what a model is* and *where it stands*
 * was drawn in the right place.
 *
 * Instanced rather than baked like the rest of this file, and deliberately: four copies of
 * a 1 665-triangle mesh is 6 660 triangles either way, but baked it is four copies in the
 * buffer instead of one. The prop parts are 24-vertex boxes where that trade does not
 * matter; a model is where it starts to.
 */
function Scooters() {
  const { scene } = useGLTF(PROPS.scooter.model.file)

  const parts = useMemo(() => {
    const { targetLength, yawOffset } = PROPS.scooter.model
    const prepared = prepareCar(scene, targetLength, yawOffset)

    /* §3.7 — the footprint in `lib/props.ts` is authored, because §12.4's boxes are built
       at module load and no glTF has loaded by then. This is the only place the authored
       figure can be checked against the mesh it stands in for, so it is checked here
       rather than trusted. */
    if (process.env.NODE_ENV !== 'production') {
      const [length, depth, height] = PROPS.scooter.size
      const drift = Math.max(
        Math.abs(prepared.size.length - length),
        Math.abs(prepared.size.width - depth),
        Math.abs(prepared.size.height - height),
      )
      if (drift > 0.05) {
        console.warn(
          `[props] PROPS.scooter.size ${[length, depth, height].join(' × ')} has drifted from the model's ` +
            `${prepared.size.length.toFixed(2)} × ${prepared.size.width.toFixed(2)} × ${prepared.size.height.toFixed(2)} — ` +
            'the §12.4 collision box no longer describes the mesh.',
        )
      }
    }

    /* Re-materialled onto §4 and merged **again**, by token this time, so a scooter is
       four draw calls whatever the model's own material count happens to be. `prepareCar`
       merges by the model's materials and returns five parts; two of those weigh 8 and 12
       triangles and have no business being draw calls of their own. */
    const byToken = new Map<string, BufferGeometry[]>()
    for (const part of prepared.parts) {
      const token = SCOOTER_TOKEN[part.material.name] ?? 'metalColor'
      const bucket = byToken.get(token)
      if (bucket === undefined) byToken.set(token, [part.geometry])
      else bucket.push(part.geometry)
    }

    return [...byToken.entries()].flatMap(([token, geometries]) => {
      const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false)
      if (merged === null || merged === undefined) return []
      return [{
        key: token,
        geometry: merged,
        material: SCOOTER_SURFACE[token as keyof typeof SCOOTER_SURFACE],
      }]
    })
  }, [scene])

  /**
   * One matrix per scooter, composed exactly as `bake` composes a prop's own transform —
   * `YXZ`, so the lean is taken about the *yawed* X axis, which is the scooter's length.
   * Under three's default `XYZ` a leaning scooter pulls a wheelie.
   *
   * **One list, because all four are lit now.** It was split into `all` and `lit` while two
   * of the four had their headlamp on; §3.7 records why that stopped being two.
   */
  const matrices = useMemo(() => {
    const out: Matrix4[] = []
    for (const prop of STREET_PROPS) {
      if (prop.kind !== 'scooter') continue
      root.position.set(prop.position[0], prop.position[1], prop.position[2])
      root.rotation.set(prop.lean, prop.yaw, 0, 'YXZ')
      root.updateMatrix()
      out.push(root.matrix.clone())
    }
    return out
  }, [])

  return (
    <>
      {parts.map((part) => (
        <Instanced
          key={part.key}
          name={`prop:scooter:${part.key}`}
          geometry={part.geometry}
          material={part.material}
          matrices={matrices}
        />
      ))}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Baking
 * ──────────────────────────────────────────────────────────────────────────── */

/** Hoisted; `bake` runs once at mount but it is still a loop over 225 parts. */
const tint = new Color()

/**
 * Every part of every prop, composed into world space and merged into its family.
 *
 * The composition is `propTransform × partTransform`, and the prop's own euler order is
 * **`YXZ`**: the yaw turns it to face its wall, and the lean is then taken about the
 * *yawed* X axis, which is the scooter's own length. Under three's default `XYZ` the lean
 * would be applied first and a leaning scooter would come out pitched nose-down instead.
 *
 * A prop's `position[1]` is **the surface it stands on** — §3's kerb top for anything on
 * the pavement — so the whole part list rides up with it and nothing here needs to know
 * about kerbs.
 */
function bake(): { meshes: { family: Family; geometry: BufferGeometry }[]; decals: Matrix4[] } {
  const byFamily = new Map<Family, BufferGeometry[]>()
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

      const family = FAMILY[part.surface]
      const geometry = (GEOMETRY[part.primitive] as BufferGeometry).clone()
      geometry.applyMatrix4(composed.multiplyMatrices(root.matrix, child.matrix))

      if (TINTED.has(family)) {
        /* `Color` converts the §4 hex out of sRGB into the linear space the shader works
           in — the same conversion `material.color` does, done here instead because this
           value is travelling as a vertex attribute rather than as a uniform. */
        tint.set(PALETTE[PROP_TOKENS[part.surface]])
        const count = geometry.getAttribute('position').count
        const colors = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          colors[i * 3] = tint.r
          colors[i * 3 + 1] = tint.g
          colors[i * 3 + 2] = tint.b
        }
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
      }

      const bucket = byFamily.get(family)
      if (bucket === undefined) byFamily.set(family, [geometry])
      else bucket.push(geometry)
    }

    if (!prop.decal) continue

    /* §7's decal, at §3.7's multiplier of the prop's own footprint. It takes the prop's
       yaw so an oblong prop gets an oblong shadow, and sits 0.010 above **the surface the
       prop stands on** — which for anything on §3's kerb used to be 11 cm underneath it. */
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

  const meshes: { family: Family; geometry: BufferGeometry }[] = []
  for (const [family, geometries] of byFamily) {
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false)
    if (merged === null || merged === undefined) continue
    merged.computeBoundingSphere()
    meshes.push({ family, geometry: merged })
  }
  return { meshes, decals }
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
  const { meshes, decals } = useMemo(() => bake(), [])
  const materials = useMemo(() => buildMaterials(tier), [tier])

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
      {/* One mesh per family. `bake` calls `computeBoundingSphere` on each merged
          geometry, so these cull correctly against the frustum even though each spans a
          good part of the alley — the same thing the instanced meshes needed, for the
          same reason, arrived at from the other direction. */}
      {meshes.map(({ family, geometry }) => (
        <mesh key={family} name={`prop:${family}`} geometry={geometry} material={materials[family]} />
      ))}

      {decalMaterial !== null ? (
        <Instanced
          name="prop:contactDecal"
          geometry={DECAL_GEOMETRY}
          material={decalMaterial}
          matrices={decals}
        />
      ) : null}

      {/* §3.7 — the scooters are a glTF file, so they suspend. The boundary is around them
          alone, exactly as `World.tsx` does for §3.6's traffic: everything else in this
          section is static geometry that has no reason to wait for a download, and the
          collision registry above must not be torn down and re-registered while it does.
          `null` is the honest fallback — four scooters missing from an alley, and nothing
          else about the world different. */}
      <Suspense fallback={null}>
        <Scooters />
      </Suspense>
    </>
  )
}
