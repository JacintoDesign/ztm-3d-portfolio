/**
 * §7.1 — where the alley's five dynamic lights actually go.
 *
 * Pure data, the same split as `lib/signs.ts` and `lib/props.ts`: this resolves each
 * light onto the sign that emits it; `components/world/Lights.tsx` mounts them.
 *
 * **A light is written as a sign index, never as a coordinate.** §3.5's nine signs are
 * generated — wall, `z`, mount height and projection are all resolved at load — so a
 * light written as a position drifts the moment that generator moves, and drifts
 * silently, because a light two metres from its sign still looks like a light. Position
 * and colour both come off the sign, through the same `signPanelCentre` that places the
 * panel itself.
 */

import { NEON_SIGN_LIST, signPanelCentre } from './signs'
import {
  ALLEY_LIGHTS,
  BUDGET,
  GATE_LIGHT,
  LIGHTS,
  LIGHT_SURRENDER_ORDER,
  STATION_PLATE,
  STATION_PLATE_PANEL,
  lightIntensityFor,
  type ColorToken,
  type Tier,
} from './world'

export type SeatedLight = {
  /** §7's number, kept so the brief and the scene graph can be read against each other. */
  id: number
  /** §3.5's sign index. */
  sign: number
  color: ColorToken
  position: readonly [number, number, number]
  intensity: number
  distance: number
  decay: number
}

/**
 * Dynamic lights owned by sections other than §7.1.
 *
 * Two: §5's hemisphere and §7's light 11 on §3.1's station plate. §7's lights 2 to 5 belong
 * to §2.1, §2.2 and §2.3 and arrive with them — **when they do this becomes 6 and the mobile
 * cap starts to bite**, which is exactly the arithmetic §7 always intended and
 * `LIGHT_SURRENDER_ORDER` carries out.
 *
 * Counting the gate light here rather than in `ALLEY_LIGHTS` is what keeps it out of the
 * surrender order: §17's opening beat is the visitor turning round to a lit gate, so it is
 * the last light in the world that should be given up to a cap.
 */
const MOUNTED_ELSEWHERE = 2

/**
 * §7 lights 2 and 3 — §2.1's, mounted by `Showcase.tsx` rather than here.
 *
 * They were authored in §7 when §2.1 was designed and **never mounted**, which is §7.1's
 * complaint from the other side: that section deleted four lightformers for being light
 * with no emitter, and these were two emitters with no light. The alley's one content
 * surface was lit by whichever §3.5 sign happened to be nearest.
 *
 * `null` where the tier drops one. Light 2 is a `rectAreaLight` — the most expensive light
 * three has, two 64² LTC tables and a shader permutation — and §7 marks it `drop` on mobile
 * for that reason rather than for the count.
 *
 * **Returned rather than mounted here, because a light seated on an object belongs with the
 * object.** `Showcase.tsx` has the bend's frame and this file does not; a coordinate written
 * here would drift the moment `BEND` moved, silently, because a light two metres off its
 * emitter still looks like a light.
 */
export function showcaseLightsFor(tier: Tier): {
  screen: (typeof LIGHTS)[1] | null
  sign: (typeof LIGHTS)[2] | null
} {
  const screen = LIGHTS[1]
  const sign = LIGHTS[2]
  const surrendered = surrenderedFor(tier)

  return {
    /* Both tiers. See §7 #2 on why this one has no cheap substitute. */
    screen,
    sign: surrendered.has(sign.id) ? null : sign,
  }
}

/**
 * How many of §7's lights the world is over the tier's cap by, and which ids give way.
 *
 * **Counted across the whole world, not per file.** §7's cap is a renderer limit and the
 * lights are mounted from three different components; a cap applied inside one of them
 * would let the other two walk past it. The count is: §5's hemisphere, §3.1's gate light,
 * §2.1's two, and `ALLEY_LIGHTS`.
 */
function surrenderedFor(tier: Tier): Set<number> {
  const cap = BUDGET[tier].dynamicLights
  /* **All four of §2's lights now occupy a slot on both tiers.** Light 2 is kept as a
     `rectAreaLight` everywhere, because its contribution *is* §6's specular reflection and a
     point light cannot stand in for that; light 4 is dropped to a `pointLight` on mobile but
     still occupies its slot. This used to branch on the tier, which was arithmetic about
     which lights were mounted rather than a preference. */
  const showcaseCount = 2
  const stationCount = 2
  const overBy =
    MOUNTED_ELSEWHERE + showcaseCount + stationCount + ALLEY_LIGHTS.length - cap

  return new Set<number>(overBy > 0 ? LIGHT_SURRENDER_ORDER.slice(0, overBy) : [])
}

/**
 * §7 lights 4 and 5 — §2.2's and §2.3's, mounted by `Stations.tsx` rather than here.
 *
 * **They moved rather than being retired**, and §7 has the argument: *what makes the three
 * content surfaces dominant is that each throws light*. Light 4 was authored for a vending
 * machine and light 5 for a payphone; both objects were replaced before either light was
 * ever mounted, and retiring them would have left two of the three stations illuminating
 * nothing but themselves.
 *
 * Same shape as `showcaseLightsFor`, for the same reason: a light seated on an object
 * belongs with the object, and `Stations.tsx` is where those two objects' frames are.
 */
export function stationLightsFor(tier: Tier): {
  bio: (typeof LIGHTS)[3]
  /** True when §7 #4's `rectAreaLight` is swapped for its cheap stand-in. */
  bioAsPoint: boolean
  contact: (typeof LIGHTS)[4] | null
} {
  const bio = LIGHTS[3]
  const contact = LIGHTS[4]
  const surrendered = surrenderedFor(tier)

  return {
    /* Never null. §7 #4's `mobile: 'drop'` drops the *type*, not the light — see the note
       beside it, and the 28% measurement that found the difference mattered. */
    bio,
    bioAsPoint: tier === 'mobile' && bio.mobile === 'drop',
    contact: surrendered.has(contact.id) ? null : contact,
  }
}

/**
 * §7 / §15 — the alley's lights for a tier, with the cap applied.
 *
 * The cap is a count, not a flag on individual lights. §7 used to mark 8, 9 and 10
 * `drop` on mobile, which is how ten lights became §15's seven; applied to a world with
 * six built lights it dropped half of them and left a phone with two lit points in
 * forty-four metres of alley. Here the world is counted first and lights are surrendered
 * only if it is over — highest id first, per `LIGHT_SURRENDER_ORDER`.
 *
 * Lights 6 and 7 are still halved on mobile, which is a §7 value and unrelated to the cap.
 */
export function alleyLightsFor(tier: Tier): SeatedLight[] {
  const surrendered = surrenderedFor(tier)
  const seated: SeatedLight[] = []

  for (const light of ALLEY_LIGHTS) {
    if (surrendered.has(light.id)) continue

    const sign = NEON_SIGN_LIST[light.sign]
    /* Not reachable while §3.5 generates nine signs and every index above is under nine.
       It is a guard rather than a `!` because the count lives in the brief: if §3.5 ever
       ships fewer signs, an unlit alley is a better failure than a crash at mount. */
    if (sign === undefined) continue

    seated.push({
      id: light.id,
      sign: light.sign,
      color: sign.color,
      position: signPanelCentre(sign),
      intensity: lightIntensityFor(light, tier),
      distance: light.distance,
      decay: light.decay,
    })
  }

  return seated
}

/**
 * Dev only — the reach of each pool along the alley, which is the whole reason signs
 * 0, 1, 4, 6 and 8 were chosen over an evenly-walled set. §7.1 claims the five run
 * continuously with no gap; this is how that claim is checked rather than asserted.
 */
export function reachReport(tier: Tier): {
  id: number
  sign: number
  z: number
  from: number
  to: number
  /** Distance to the previous light's far edge. Positive means an unlit stretch. */
  gap: number
}[] {
  const sorted = alleyLightsFor(tier)
    .map((light) => ({
      id: light.id,
      sign: light.sign,
      z: light.position[2],
      from: light.position[2] - light.distance,
      to: light.position[2] + light.distance,
    }))
    .sort((a, b) => a.z - b.z)

  return sorted.map((light, i) => ({
    ...light,
    gap: i === 0 ? 0 : light.from - (sorted[i - 1] as (typeof sorted)[number]).to,
  }))
}

/**
 * §7 light 11 / §3.1 — the station gate, seated on its own `終電` plate.
 *
 * **The plate is the source, so the light comes off the plate's own geometry** — the same rule
 * §7.1 applies to the five sign lights, and for the same reason: a light written as a
 * coordinate drifts the moment the thing it belongs to moves, and drifts silently, because a
 * light two metres from its emitter still looks like a light.
 *
 * **The clearance is 1.0 m and 0.2 was measured as wrong.** The plate is mounted flush to the
 * gate, so a light 0.2 m in front of it sits 0.26 m off a flat wall and inverse-square turns it
 * into a hotspot the size of the plate — a bright blob, not a lit wall. A metre out throws the
 * same 70 cd across the shutter and reaches the gate machines below it. Physically this is the
 * spill from a backlit plate rather than the filament inside it, which is the thing that
 * actually lights a station entrance.
 *
 * **Not in `ALLEY_LIGHTS` and therefore not in the surrender order.** It is counted in
 * `MOUNTED_ELSEWHERE`, so it is inside the cap arithmetic without being a candidate for being
 * dropped by it. §17's first line is the visitor turning round to this wall.
 */
export function gateLightFor(tier: Tier): SeatedLight & { plate: readonly [number, number, number] } {
  const clearance = 1.0
  const [x, y, z] = STATION_PLATE_PANEL.centre

  return {
    id: GATE_LIGHT.id,
    /* No §3.5 sign under this one. -1 rather than 0, which is a real sign index. */
    sign: -1,
    color: GATE_LIGHT.color,
    position: [x, y, z + STATION_PLATE.thickness / 2 + clearance] as const,
    intensity: lightIntensityFor(GATE_LIGHT, tier),
    distance: GATE_LIGHT.distance,
    decay: GATE_LIGHT.decay,
    plate: [x, y, z] as const,
  }
}
