'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type InstancedMesh,
  Matrix4,
  NormalBlending,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'
import { resolveTier } from '@/lib/device'
import { usePrefersReducedMotion } from '@/lib/reducedMotion'
import { puddleWetnessAt } from '@/lib/textures/puddleMask'
import { rippleFragmentShader, rippleVertexShader } from '@/shaders/ripple'
import { PALETTE, REFLECTOR_STRIP, RIPPLES, type Tier } from '@/lib/world'

/**
 * §10 / §10.0 — rain landing on the puddles.
 *
 * **The emitters are placed from §6.2's mask, not scattered**, and that is the whole of what
 * makes this read as water rather than as decals. §6.2 already decides where the puddles are:
 * 60% coverage in blobs of overlapping ellipses, biased to the alley centre and the gutter
 * lines, thinning against the kerbs. A ring expanding on a dry island would contradict, in
 * the most visible way available, the one document that says where the water is.
 *
 * Sampling is against the **painted canvas** rather than the weight function that generated
 * it — the function gives the bias, the canvas gives the blobs, and a ring has to land inside
 * a blob. One `getImageData`, at mount, in `lib/textures/puddleMask.ts`.
 *
 * One instanced draw call. Nothing allocates per frame and nothing reaches React state: the
 * only thing that changes is a clock uniform, and the ring's whole animation is derived from
 * it in the shader. Positions are static, so the instance matrices are written once.
 */

/** Flat quad, lying in XY. The mesh is rotated -90° about X, so it ends up on the ground. */
const QUAD = new PlaneGeometry(1, 1)

/** Hoisted for composing the static instance matrices at mount — a loop, so the rule holds. */
const TMP_POSITION = new Vector3()
const TMP_QUATERNION = new Quaternion()
const TMP_SCALE = new Vector3()

/** §11.1's precedent — the same seed puts the emitters in the same puddles on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Emitter = { x: number; z: number; phase: number; jitter: number }

/**
 * §10.0.1 — how far this emitter's ring centre may travel between cycles, in metres.
 *
 * **Measured against this emitter's own puddle, not assumed.** A ring that moves is the whole of
 * *"not in exactly the same spot"*, but a blind offset walks rings onto dry asphalt and
 * contradicts §10.0's placement rule. So each rung of §10.0.1's ladder is probed at eight points
 * around the emitter and the largest radius still wet on all eight wins.
 *
 * A global bound honest enough for the *worst* emitter is about 0.07 m and invisible; measuring
 * per emitter earns most of them five times that. An emitter in a narrow blob earns 0.05 or
 * nothing, which is correct — that is the one that would have strayed.
 *
 * The sampler returns dry for out-of-range coordinates, so probes past the strip read dry and the
 * jitter shrinks on its own at the sample-region boundary. No clamping needed.
 */
function safeJitter(
  wetnessAt: (x: number, z: number) => number,
  x: number,
  z: number,
): number {
  for (const radius of RIPPLES.jitterLadder) {
    let clear = true
    for (let i = 0; i < 8 && clear; i++) {
      const a = (i / 8) * Math.PI * 2
      clear = wetnessAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius) <= RIPPLES.wetThreshold
    }
    if (clear) return radius
  }
  return 0
}

/**
 * §10.0 — rejection-sample emitter positions until they are all in water, inside the alley,
 * and not on top of each other. Three conditions, and the first build had only the first.
 *
 * **The mask is the wetness half of the specification, not the whole of it.** It is painted
 * across the full 12 × 52 strip and biased to the alley centre, so sampled naively it places
 * rings behind the station gate (§6.1 runs the strip 3 m past each end wall, hidden geometry)
 * and stacks them on the centre line. Measured on the first build: two of twelve behind the
 * north wall, and four inside 2.4 m with a 15 m stretch of alley empty.
 *
 * The attempt cap is a guard, not a tuning knob. If it runs out, the emitters it did place
 * still work — a thinner scattering of rings is a better failure than a blank floor or a
 * frozen page, which is the same call §10.1 made about the rain.
 */
function placeEmitters(tier: Tier): Emitter[] {
  const wetnessAt = puddleWetnessAt(tier)
  if (wetnessAt === null) return []

  const random = mulberry32(RIPPLES.seed)
  const minGapSq = RIPPLES.minSeparation ** 2
  const out: Emitter[] = []

  /**
   * §10.0 — **two regions, and it was one rectangle wrong at both ends.**
   *
   * The alley region stops at §3's kerb inner edge rather than at the walls, so no ring
   * expands on the pavement — a surface 12 cm above the water, and four times as wide since
   * §3 widened the kerb. The carriageway region is new: §6.0 ran the reflector out to
   * `z = 33` and put the far building and the traffic in that road as reflections, while
   * the emitters still stopped at 23, so rain fell visibly into a mirror-flat street.
   *
   * The separation test runs across **all** emitters rather than per region, so a ring in
   * the alley and one on the road cannot land on top of each other in the 3.2 m of ground
   * the two regions face across.
   */
  for (const region of RIPPLES.sampleRegions) {
    const wanted = region[tier]
    const [xMin, xMax] = region.x
    const [zMin, zMax] = region.z
    let placed = 0

    for (
      let attempt = 0;
      attempt < RIPPLES.maxSampleAttempts && placed < wanted;
      attempt++
    ) {
      const x = xMin + random() * (xMax - xMin)
      const z = zMin + random() * (zMax - zMin)

      // §6.2 stores roughness, so *low* is wet. §10.0's threshold sits inside the water
      // rather than on the 14 px blurred transition, so no ring straddles a puddle edge.
      if (wetnessAt(x, z) > RIPPLES.wetThreshold) continue

      // §10.0 — clear of every emitter already placed. Squared, so no square roots in a
      // loop that may run thousands of times at mount.
      let tooClose = false
      for (const other of out) {
        if ((other.x - x) ** 2 + (other.z - z) ** 2 < minGapSq) {
          tooClose = true
          break
        }
      }
      if (tooClose) continue

      out.push({ x, z, phase: random(), jitter: safeJitter(wetnessAt, x, z) })
      placed++
    }
  }

  return out
}

export default function Ripples() {
  const tier = resolveTier()
  const reduced = usePrefersReducedMotion()

  const emitters = useMemo(() => placeEmitters(tier), [tier])

  /**
   * The geometry carries one extra instanced attribute, `aPhase`, so the twelve rings are
   * staggered through the cycle instead of pulsing together.
   *
   * A fresh `InstancedBufferGeometry` per tier rather than mutating `QUAD`: the quad is
   * module scope and shared, and attaching instance attributes to it would leak them into
   * anything else that ever reuses it.
   */
  const geometry = useMemo(() => {
    const geo = new InstancedBufferGeometry()
    geo.index = QUAD.index
    geo.attributes = QUAD.attributes
    geo.instanceCount = emitters.length

    const phases = new Float32Array(emitters.length)
    const jitters = new Float32Array(emitters.length)
    emitters.forEach((emitter, i) => {
      phases[i] = emitter.phase
      jitters[i] = emitter.jitter
    })
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1))
    /* §10.0.1 — measured at mount, constant thereafter. Two floats per instance is 8 bytes;
       the alternative was writing instance matrices every frame to move the rings. */
    geo.setAttribute('aJitter', new InstancedBufferAttribute(jitters, 1))
    return geo
  }, [emitters])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: rippleVertexShader,
        fragmentShader: rippleFragmentShader,
        /**
         * **`UniformsLib.fog` is not optional here, and leaving it out does not look like a
         * missing uniform.** `fog: true` below makes three define `USE_FOG` and compile the
         * `<fog_fragment>` chunk into the shader — but for a `ShaderMaterial` three does not
         * supply the uniforms that chunk needs. Every frame it runs `refreshFogUniforms`,
         * which reaches straight into `material.uniforms.fogColor.value`, and without this
         * merge that is `undefined.value`: a `TypeError` thrown once per frame from inside
         * the renderer, which blanks the whole canvas. Nothing in it mentions fog.
         *
         * §5's fog is not decoration on these — a ring at the far end of a 46 m alley has to
         * recede like the floor it sits on, or it arrives at full strength in front of a wall
         * that has faded out.
         */
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uLifeSec: { value: RIPPLES.ringLifeSec },
            uIntervalSec: { value: RIPPLES.ringIntervalSec },
            uColor: { value: new Color(PALETTE[RIPPLES.color]) },
            uPeakOpacity: { value: RIPPLES.peakOpacity },
            uThickness: { value: RIPPLES.ringThickness },
            /* §10.0.1 — the shader converts aJitter from metres into quad-local units, so it
               needs the decal size the instance matrix was scaled by. */
            uDecalDiameter: { value: RIPPLES.decalDiameter },
            uSizeVariation: { value: RIPPLES.sizeVariation },
            uWobble: { value: RIPPLES.wobble },
            uBirthFrac: { value: RIPPLES.birthFrac },
          },
        ]),
        transparent: true,
        /* §10 / §3.6 — alpha-blended, never additive. FogExp2 mixes toward `fogColor`
           before the blend, so an additive decal at range sits in a visible dark box. */
        blending: NormalBlending,
        depthWrite: false,
        /* The rings sit 1 mm over the reflector strip. Writing depth would have them
           occlude the rain behind them, and they are water on water. */
        side: DoubleSide,
        fog: true,
      }),
    [],
  )

  const matrices = useMemo(
    () =>
      emitters.map((emitter) =>
        new Matrix4().compose(
          TMP_POSITION.set(emitter.x, REFLECTOR_STRIP.y + 0.001, emitter.z),
          TMP_QUATERNION.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
          TMP_SCALE.set(RIPPLES.decalDiameter, RIPPLES.decalDiameter, 1),
        ),
      ),
    [emitters],
  )

  const meshRef = useRef<InstancedMesh | null>(null)

  const attach = useCallback(
    (mesh: InstancedMesh | null) => {
      meshRef.current = mesh
      if (mesh === null) return
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    },
    [matrices],
  )

  useFrame((state) => {
    const uniforms = material.uniforms.uTime
    if (uniforms !== undefined) uniforms.value = state.clock.elapsedTime
  })

  /* §13 — removed, not stilled. A ring's radius is its only state, so a frozen one is a
     bullseye painted on the road. §10.0 has the reasoning; the resting surface is still
     entirely there in §6.2's puddles, the ripple normal and the reflection. */
  if (reduced || emitters.length === 0) return null

  return (
    <instancedMesh
      name="ripples"
      ref={attach}
      args={[geometry, material, emitters.length]}
    />
  )
}
