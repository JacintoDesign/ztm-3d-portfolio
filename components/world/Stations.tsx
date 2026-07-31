'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  DoubleSide,
  type InstancedMesh as ThreeInstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RectAreaLight,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { registerBoxes } from '@/lib/collision'
import type { Contact } from '@/lib/contact'
import { expose } from '@/lib/debug'
import { resolveTier } from '@/lib/device'
import { isTap } from '@/lib/clickGuard'
import { cartStation, mailboxStation, stationAudit, stopReport } from '@/lib/guidedPath'
import { setHoverWithCursor } from '@/lib/hover'
import { stationLightsFor } from '@/lib/lights'
import { openProject } from '@/lib/openProject'
import { openAbout, openContact } from '@/lib/overlays'
import { registerStation } from '@/lib/stations'
import { LABEL_REGION, stationLabels, uvRect } from '@/lib/textures/stationLabels'
import { grainParams } from '@/lib/textures/surfaceGrain'
import {
  BIO_STATION,
  CONTACT_STATION,
  EMISSIVE,
  INTERACT,
  MATERIALS,
  PALETTE,
  PROPS,
} from '@/lib/world'

/**
 * §2.2 / §2.3 — the two stations that are not the board.
 *
 * **One file for two objects, because they share a texture.** §2.3's mailbox bank is built
 * here in full; §2.2's cart is not — its body, wheels, canopy, stools and counter are
 * §3.7's, built in `lib/props.ts` and merged by `Props.tsx`. What is here is the cart's two
 * *lit, textured* faces, and they are here because they sample the same atlas as the six
 * mailbox plates. All fourteen lit surfaces on both stations are **one geometry, one
 * material, one draw call** — which is what made a detail pass affordable inside §15's
 * three calls of headroom on mobile.
 *
 * **Both registrations are here too**, and neither authors a position: §12.5's stations read
 * `lib/guidedPath.ts`, which reads the cart out of `lib/props.ts` and the bank out of
 * `lib/world.ts`. A station written as its own coordinate beside the thing it is a station
 * for drifts the moment that thing moves — §7.1's rule, and §12.5 has now been bitten by it
 * three times.
 */

/* Hoisted: built once, never in a render body. */
const UNIT_BOX = new BoxGeometry(1, 1, 1)
const root = new Object3D()

/** Opts a mesh out of raycasting entirely. Hoisted so it is one function, not one per render. */
const NO_RAYCAST = () => {}

/** A unit quad in the XY plane with its UVs remapped into one of the atlas's regions. */
function litQuad(
  region: readonly [number, number, number, number],
  place: (o: Object3D) => void,
): BufferGeometry {
  const geometry = new PlaneGeometry(1, 1)
  const { u0, v0, u1, v1 } = uvRect(region)
  const uv = geometry.getAttribute('uv')

  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i))
  }
  uv.needsUpdate = true

  place(root)
  root.updateMatrix()
  geometry.applyMatrix4(root.matrix)
  return geometry
}

/**
 * §2.3 — how many rows the channel list needs, and where each box goes.
 *
 * **Row count is derived, not authored.** `boxesPerRow` is a property of the wall (2.10 m of
 * usable width against a 0.44 m box); how many rows there are is `CONTENT.md`'s business.
 * Six channels fill two rows exactly today and a seventh starts a third — which is the thing
 * §17 checks by adding one and taking it away again.
 */
function bankLayout(count: number) {
  const { boxesPerRow, columnPitch, rowPitch, firstRowY, box, wallX } = CONTACT_STATION
  const rows = Math.max(1, Math.ceil(count / boxesPerRow))
  const perRow = Math.min(count, boxesPerRow)

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / boxesPerRow)
    const column = i % boxesPerRow
    /* Reading order: first channel top-left. Rows are laid out downward in the list and
       upward in the world, so the *last* row sits at `firstRowY`. */
    const inThisRow = Math.min(count - row * boxesPerRow, boxesPerRow)
    return {
      index: i,
      /**
       * Centred on the bank whatever the row's length, so a half-full last row is not
       * left-aligned against a full one above it.
       *
       * **Negated, because the visitor reads this wall from the other side.** They stand east
       * of it facing `-X`, and at that yaw `+Z` is to their *left* — so laying the first
       * channel out at the lowest `z` put `Email` on the right and the list ran backwards.
       * Reading order is a property of where the reader stands, not of the axis.
       */
      z: CONTACT_STATION.z - (column - (inThisRow - 1) / 2) * columnPitch,
      y: firstRowY + (rows - 1 - row) * rowPitch,
      x: wallX + box.depth / 2,
      rows,
      perRow,
    }
  })
}

function buildBank(channels: Contact['channels']) {
  const { box, backPlate, label, flag, wallX } = CONTACT_STATION
  const places = bankLayout(channels.length)

  const lit: BufferGeometry[] = []

  /**
   * **Boxes, plate and bolts are all instances of one unit box, in one `InstancedMesh`.**
   *
   * The boxes have to be instanced, because each opens a different link and `instanceId` is
   * the only thing that says *which one*. The plate and its bolts do not — but a second mesh
   * for them cost a draw call, and mobile measured **90 of 90** with one. They are boxes too,
   * so they join the set: **the boxes take indices `0…n-1`**, which is the channel's index in
   * `CONTENT.md`, and everything after that is fixtures. `openChannel` looks the index up in
   * the channel list and finds nothing for the plate, so clicking it does nothing — the guard
   * that makes this safe was already there for a bad index.
   *
   * The bolts stop being hex heads and become square rivet pads, turned 45° so they read as
   * diamonds. At 0.056 m from 1.60 m that is a difference nobody can see, and it is worth one
   * draw call on the tier that has none to spare.
   */
  const rows = places[0]?.rows ?? 1
  const perRow = places[0]?.perRow ?? 1
  const plateHeight = (rows - 1) * CONTACT_STATION.rowPitch + box.height + backPlate.margin * 2
  const plateWidth = (perRow - 1) * CONTACT_STATION.columnPitch + box.width + backPlate.margin * 2
  const plateCentreY = CONTACT_STATION.firstRowY + ((rows - 1) * CONTACT_STATION.rowPitch) / 2

  const instances: Matrix4[] = []
  const instance = (place: (o: Object3D) => void): void => {
    place(root)
    root.updateMatrix()
    instances.push(root.matrix.clone())
  }

  /* The boxes first: index === channel index. Nothing may be inserted before them. */
  for (const place of places) {
    instance((o) => {
      o.position.set(place.x, place.y, place.z)
      o.rotation.set(0, 0, 0)
      o.scale.set(box.depth, box.height, box.width)
    })
  }

  /**
   * The plate, sized from the grid.
   *
   * **It was authored 2.00 × 1.00 for about an hour.** Standing on §3.4's plinth line its top
   * was `y = 1.22` and the top row of boxes sits at `1.29–1.55` — so the row the plate exists
   * to carry was hanging off it with bare wall behind, and a seventh channel would have left
   * two rows in the air. A dimension that has to agree with a count out of `CONTENT.md`
   * cannot be a literal.
   */
  instance((o) => {
    o.position.set(wallX + backPlate.proud / 2, plateCentreY, CONTACT_STATION.z)
    o.rotation.set(0, 0, 0)
    o.scale.set(backPlate.proud, plateHeight, plateWidth)
  })

  /**
   * A bolt in each corner.
   *
   * **The bolts are what make it a plate rather than a rectangle.** §2.1 found the same for
   * the studio sign and §3.5 for the bracket arms: at this distance a fixing is the only cue
   * that says *installed*, and six boxes on an unfixed slab read as six boxes floating in
   * front of a wall.
   */
  const { bolt } = backPlate
  for (const sy of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      instance((o) => {
        o.position.set(
          wallX + backPlate.proud + bolt.depth / 2,
          plateCentreY + sy * (plateHeight / 2 - bolt.inset),
          CONTACT_STATION.z + sz * (plateWidth / 2 - bolt.inset),
        )
        /* Turned about its own out-of-wall axis, so a square pad reads as a diamond head. */
        o.rotation.set(Math.PI / 4, 0, 0)
        o.scale.set(bolt.depth, bolt.radius * 2, bolt.radius * 2)
      })
    }
  }

  for (const place of places) {
    /* The label, on the alley face. A plane's normal is `+Z`, so it is turned to face `+X`. */
    lit.push(
      litQuad(LABEL_REGION.label(place.index), (o) => {
        o.position.set(wallX + box.depth + label.proud, place.y, place.z)
        o.rotation.set(0, Math.PI / 2, 0)
        o.scale.set(label.width, label.height, 1)
      }),
    )

    /* The flag: a lit cube on the top outer corner. Six quads would be a cube; one facing
       the alley and one facing up is what a visitor can actually see, and it is a third of
       the triangles. */
    const flagZ = place.z + (box.width / 2 - flag.size)
    const flagY = place.y + box.height / 2
    lit.push(
      litQuad(LABEL_REGION.flag(place.index), (o) => {
        o.position.set(wallX + box.depth + 0.001, flagY - flag.size / 2, flagZ)
        o.rotation.set(0, Math.PI / 2, 0)
        o.scale.set(flag.size, flag.size, 1)
      }),
      litQuad(LABEL_REGION.flag(place.index), (o) => {
        o.position.set(wallX + box.depth - flag.size / 2, flagY + 0.001, flagZ)
        o.rotation.set(-Math.PI / 2, 0, 0)
        o.scale.set(flag.size, flag.size, 1)
      }),
    )
  }

  return { lit, instances, places }
}

/**
 * §2.2 — the cart's lit sign band, in the cart's *world* frame.
 *
 * The cart faces `-X` from the east wall, so the quad does too. Its `z` is the cart's, read
 * from `lib/props.ts` through `lib/guidedPath.ts`, never written down here.
 *
 * **The stats board is gone.** §2.2 argued the three stats onto the outside as the hook that
 * makes a stranger press `E`; in the world it read as a poster stuck on a food cart, and the
 * cart already says what it is. The stats are in the overlay, where §2.2's original rule —
 * *no text on the exterior beyond decorative kana* — always had them.
 */
function buildCartFaces() {
  const cart = cartStation()
  const { signBand } = BIO_STATION

  /**
   * **The bar's front face, not the cart's footprint face.**
   *
   * `cart.depth` is §3.7's *footprint* — 1.00, sized to the canopy, which overhangs. The deck
   * is 0.78, so its front is 0.11 m further back, and a plate placed off the footprint floats
   * that far in front of the counter it is supposed to be bolted to. Read off the thing it is
   * mounted on, which is the whole of §7.1's rule.
   */
  const barFaceX = cart.x - PROPS.foodCart.deck.depth / 2

  return [
    litQuad(LABEL_REGION.signBand, (o) => {
      o.position.set(barFaceX - 0.014, signBand.y, cart.z)
      o.rotation.set(0, -Math.PI / 2, 0)
      o.scale.set(signBand.width, signBand.height, 1)
    }),
  ]
}

export default function Stations({ contact }: { contact: Contact }) {
  const tier = resolveTier()

  const atlas = useMemo(() => stationLabels(tier, contact.channels), [tier, contact.channels])

  const built = useMemo(() => {
    const bank = buildBank(contact.channels)
    const lit = [...bank.lit, ...buildCartFaces()]
    return {
      lit: mergeGeometries(lit, false),
      instances: bank.instances,
      places: bank.places,
    }
  }, [contact.channels])

  /* Written once when the mesh attaches — nothing here moves. `computeBoundingSphere` after,
     or the set culls against a sphere at the origin and all six vanish together. */
  const attachBoxes = useCallback(
    (mesh: ThreeInstancedMesh | null) => {
      if (mesh === null) return
      built.instances.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [built.instances],
  )

  /**
   * §2.3 — a box opens **its own** channel. `instanceId` is the index in `CONTENT.md`.
   *
   * `mailto:` goes through `openProject` like every other href: it is one `window.open` with
   * the same guard, and special-casing the scheme here would be a second place to get the
   * blank-target rules wrong.
   */
  const openChannel = useCallback(
    (instanceId: number | undefined) => {
      const channel = instanceId === undefined ? undefined : contact.channels[instanceId]
      if (channel === undefined) return
      openProject(channel.href)
    },
    [contact.channels],
  )

  const material = useMemo(() => {
    const bodies = new MeshStandardMaterial({
      color: PALETTE.metalDark,
      roughness: MATERIALS.paintedMetal?.roughness ?? 0.42,
      metalness: MATERIALS.paintedMetal?.metalness ?? 0.15,
      ...grainParams('metal', tier),
    })

    /**
     * **One material, one intensity, three rungs** — the ratios are painted into the atlas.
     * Running at §8.1's brightest of the group and letting albedo scale the rest is the same
     * move `lib/textures/vendingFront.ts` made for legibility, used here for brightness.
     *
     * `MeshBasicMaterial` rather than `Standard`: these surfaces emit and are never lit, so
     * a standard material would compute lighting for fourteen quads and then add the emissive
     * term on top of it. Basic is the emissive term on its own.
     */
    const labels = new MeshBasicMaterial({
      map: atlas ?? null,
      color: new Color(0xffffff).multiplyScalar(EMISSIVE.mailboxFlag),
      toneMapped: true,
      side: DoubleSide,
      fog: true,
    })

    return { bodies, labels }
  }, [tier, atlas])

  /* §12.4 — the bank is solid. One box for the whole bank rather than one per mailbox: the
     resolver takes the nearest face and six coplanar faces resolve identically. */
  useEffect(() => {
    const { backPlate, box, boxesPerRow, columnPitch, wallX } = CONTACT_STATION
    const perRow = Math.min(contact.channels.length, boxesPerRow)
    const half = ((perRow - 1) * columnPitch + box.width + backPlate.margin * 2) / 2
    return registerBoxes([
      {
        minX: wallX,
        maxX: wallX + box.depth,
        minZ: CONTACT_STATION.z - half,
        maxZ: CONTACT_STATION.z + half,
      },
    ])
  }, [contact.channels.length])

  /* §12.5 — both registrations. Neither authors a coordinate. */
  useEffect(() => {
    const cart = cartStation()
    const removeBio = registerStation({
      /* `about`, not `bio` — the same word as §12.6's stop, §12.7's nav label and
         `lib/overlays.ts`'s key. `stationAudit` matches stops to stations by id and its first
         run found this exact mismatch, which is a small thing that would have made the
         guided path's second stop silently unverifiable. */
      id: 'about',
      x: cart.x,
      z: cart.z,
      radius: INTERACT.bio.radius,
      prompt: INTERACT.bio.prompt,
      open: openAbout,
    })

    const bank = mailboxStation()
    const removeContact = registerStation({
      id: 'contact',
      x: bank.x,
      z: bank.z,
      radius: INTERACT.contact.radius,
      prompt: INTERACT.contact.prompt,
      open: openContact,
    })

    return () => {
      removeBio()
      removeContact()
    }
  }, [])

  useEffect(() => {
    const count = contact.channels.length
    expose('stations', {
      bio: cartStation(),
      contact: mailboxStation(count),
      channels: count,
      rows: built.places[0]?.rows ?? 0,
    })
    expose('stationAudit', () => stationAudit(count))
    expose('guidedStops', () => stopReport(count))
  }, [contact.channels.length, built.places])

  const lights = useMemo(() => stationLightsFor(tier), [tier])

  /**
   * §7 #4 — a `rectAreaLight` has no declarative `lookAt`, so it is aimed when it mounts.
   *
   * **The position is set here too, and that is not redundant.** A ref callback runs *before*
   * R3F has applied the element's `position` prop, so `lookAt` off `light.position` aimed
   * from the origin — 19 m down the alley, pointing at nothing. The light was mounted, in the
   * scene, at the right place, with the right intensity, and contributing **exactly zero**:
   * measured 25.8 at 6 cd/m² and 25.8 at 65, which is what found it. A light that does
   * nothing looks the same as a light that is too dim, and only the sweep tells them apart.
   */
  const bioLight = lights.bio
  const aimBio = useCallback(
    (light: RectAreaLight | null) => {
      if (light === null) return
      light.position.set(bioLight.position[0], bioLight.position[1], bioLight.position[2])
      /* Emits toward whatever it looks at. Straight down, under the canopy — see §7 #4. */
      light.lookAt(bioLight.position[0], bioLight.position[1] - 1, bioLight.position[2])
    },
    [bioLight],
  )

  return (
    <>
      {/**
       * §2.3 — the whole bank: six boxes, the plate and four bolts, **one draw call.** The
       * boxes take indices `0…n-1` so `instanceId` is the channel's index in `CONTENT.md`;
       * the fixtures come after and resolve to no channel, so clicking the plate does nothing.
       *
       * `onPointerMove` rather than `onPointerOver`: R3F fires `over` once for the mesh, and
       * the mesh is all six boxes. Moving from GitHub to Medium is not an enter/leave pair —
       * it is a move within one object — so `over` would leave the prompt saying GitHub.
       * `setHoverWithCursor` early-returns when the label has not changed, so calling it on
       * every move costs nothing.
       */}
      <instancedMesh
        ref={attachBoxes}
        args={[UNIT_BOX, material.bodies, Math.max(1, built.instances.length)]}
        onPointerMove={(event) => {
          event.stopPropagation()
          const channel =
            event.instanceId === undefined ? undefined : contact.channels[event.instanceId]
          setHoverWithCursor(
            channel === undefined ? null : { label: channel.label, hint: channel.handle },
          )
        }}
        onPointerOut={() => setHoverWithCursor(null)}
        onClick={(event) => {
          if (!isTap(event)) return
          event.stopPropagation()
          openChannel(event.instanceId)
        }}
      />

      {/**
       * §2.2 + §2.3 — every lit label on both stations. One mesh, one atlas.
       *
       * **It does not take the raycast**, and that is deliberate rather than an oversight. A
       * label plate stands 0.012 m proud of the box it names, so it is between the pointer and
       * the thing the pointer wants — and it is a merged mesh, which cannot say *which* label
       * was hit. Opting it out sends every click and every hover through to the box behind,
       * which can.
       */}
      <mesh geometry={built.lit} material={material.labels} raycast={NO_RAYCAST} />

      {/**
       * §7 #4 — the cart's canopy. **Both tiers get a light; only the type changes.**
       *
       * Dropping it outright on mobile measured 14.4 mean frame at §12.6's about stop against
       * desktop's 51.6, because the cart is a content surface with nothing but emissive on it.
       * A `pointLight` in the same place is a loop iteration rather than a pair of LTC lookups
       * per fragment, and it keeps §7's rule that each of the three throws light.
       */}
      {lights.bioAsPoint ? (
        <pointLight
          color={PALETTE[lights.bio.color]}
          intensity={lights.bio.mobileFallback.intensity}
          distance={lights.bio.mobileFallback.distance}
          decay={lights.bio.mobileFallback.decay}
          position={[lights.bio.position[0], lights.bio.position[1], lights.bio.position[2]]}
        />
      ) : (
        <rectAreaLight
          ref={aimBio}
          width={lights.bio.size[0]}
          height={lights.bio.size[1]}
          color={PALETTE[lights.bio.color]}
          intensity={lights.bio.intensity}
          position={[lights.bio.position[0], lights.bio.position[1], lights.bio.position[2]]}
        />
      )}

      {lights.contact !== null && (
        <pointLight
          color={PALETTE[lights.contact.color]}
          intensity={lights.contact.intensity}
          distance={lights.contact.distance}
          decay={lights.contact.decay}
          position={[
            lights.contact.position[0],
            lights.contact.position[1],
            lights.contact.position[2],
          ]}
        />
      )}
    </>
  )
}
