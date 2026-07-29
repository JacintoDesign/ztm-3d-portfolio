'use client'

import {
  Box3,
  type BufferGeometry,
  BufferAttribute,
  Matrix4,
  type Material,
  Mesh,
  type Object3D,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * §3.6 — turning a loaded glTF car into something this world can afford to draw six of.
 *
 * **Merged by material, and that is the whole reason this file exists.** The three models
 * in `public/` carry 18, 34 and 5 primitives; mounted as authored they are 57 draw calls
 * for six vehicles, against §15's mobile budget of 90 with 80 already spent. Baked to
 * world space and merged per material they are **nine** — six for the RX-7, two for the
 * Range Rover, one for the AE86 — and each of those nine is then one `InstancedMesh`
 * carrying both copies of its car. The merge is what makes real models affordable here;
 * without it this section could not ship on a phone at all.
 *
 * **Normalised on the way through.** A glTF states no units and no facing, so the model
 * arrives at whatever scale and heading its author left it in. Everything downstream —
 * lane centres 2.70 apart, gaps that must clear a 4.97 m car, lamps placed on a corner —
 * is metres and assumes the nose points `+X`. That is settled here, once, rather than
 * being worked around at every use.
 */

export type CarPart = {
  geometry: BufferGeometry
  material: Material
}

export type PreparedCar = {
  parts: CarPart[]
  /** Measured after normalisation, so these describe the mesh rather than predict it. */
  size: { length: number; width: number; height: number }
}

/** Hoisted — prepare runs once per model at load, but there is no reason to allocate. */
const box = new Box3()
const size = new Vector3()
const centre = new Vector3()
const transform = new Matrix4()

/**
 * `mergeGeometries` refuses a set whose attributes disagree, and a glTF happily mixes
 * primitives that carry UVs with primitives that do not. Reducing every geometry to the
 * same three attributes is cheaper than discovering the refusal at runtime, and the
 * attributes it drops — tangents, second UV sets, colours — are not read by anything in
 * this world.
 */
function conform(geometry: BufferGeometry, count: number): BufferGeometry {
  const kept = geometry.clone()
  for (const name of Object.keys(kept.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') kept.deleteAttribute(name)
  }
  if (kept.attributes.normal === undefined) kept.computeVertexNormals()
  if (kept.attributes.uv === undefined) {
    kept.setAttribute('uv', new BufferAttribute(new Float32Array(count * 2), 2))
  }
  kept.morphAttributes = {}
  return kept
}

export function prepareCar(scene: Object3D, targetLength: number, yawOffset: number): PreparedCar {
  scene.updateWorldMatrix(true, true)

  /* Baked to world space first. A glTF's transforms live on its nodes, and an
     `InstancedMesh` has no room for them: its per-instance matrix is the only transform
     it carries, so anything the node hierarchy was doing has to be in the vertices. */
  const byMaterial = new Map<string, { material: Material; geometries: BufferGeometry[] }>()

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const material = (Array.isArray(object.material) ? object.material[0] : object.material) as Material
    const geometry = conform(object.geometry, object.geometry.attributes.position?.count ?? 0)
    geometry.applyMatrix4(object.matrixWorld)

    const bucket = byMaterial.get(material.uuid)
    if (bucket === undefined) byMaterial.set(material.uuid, { material, geometries: [geometry] })
    else bucket.geometries.push(geometry)
  })

  const parts: CarPart[] = []
  for (const { material, geometries } of byMaterial.values()) {
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false)
    if (merged === null || merged === undefined) continue
    parts.push({ geometry: merged, material })
  }

  /* Turned to face +X before it is measured, because the measurement that matters is
     which axis is the car's length and that is only true once it is pointing the right
     way. Models exported nose-down-Z are the common case and this is where that is
     resolved — nothing downstream ever sees a car facing anywhere but +X. */
  if (yawOffset !== 0) {
    transform.makeRotationY(yawOffset)
    for (const part of parts) part.geometry.applyMatrix4(transform)
  }

  box.makeEmpty()
  for (const part of parts) {
    part.geometry.computeBoundingBox()
    if (part.geometry.boundingBox !== null) box.union(part.geometry.boundingBox)
  }
  box.getSize(size)
  box.getCenter(centre)

  /* Scale from the model's own length, then sit it on the road with its centre over the
     origin: every instance matrix downstream is a translation along X and nothing else,
     so a model that is not already centred and grounded would drive at an offset from
     its own lane and float above or sink into the tarmac. */
  const scale = size.x > 0 ? targetLength / size.x : 1
  transform.makeScale(scale, scale, scale)
  transform.multiply(
    new Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z),
  )
  for (const part of parts) {
    part.geometry.applyMatrix4(transform)
    part.geometry.computeBoundingBox()
  }

  return {
    parts,
    size: {
      length: size.x * scale,
      width: size.z * scale,
      height: size.y * scale,
    },
  }
}
