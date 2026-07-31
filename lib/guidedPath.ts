'use client'

import { look } from '@/components/player/Camera'
import { position } from '@/components/player/Player'
import { resolveTier } from '@/lib/device'
import { lockTo, releaseLock } from '@/lib/lockedView'
import { openContact } from '@/lib/overlays'
import { type Pose, poseActive } from '@/lib/pose'
import { STREET_PROPS } from '@/lib/props'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { nearestInRange, registeredStations } from '@/lib/stations'
import {
  BIO_STATION,
  CAMERA,
  CONTACT_STATION,
  GUIDED_PATH,
  LAYOUT,
  SHOWCASE_LOCK,
  STATION_GATE,
  showcaseLockPosition,
} from '@/lib/world'

/**
 * §12.6 — the guided path, and where the two wall stations actually are.
 *
 * **Nothing in this file is a coordinate anybody typed.** §7.1's rule: a stop written as its
 * own number beside the thing it is a stop for drifts the moment that thing moves, and drifts
 * *silently*, because a camera two metres off still looks like a camera. §12.5 has been bitten
 * by that three times now — the board's radius twice, and the bank's stop once before either
 * object existed.
 *
 * So the cart is read out of `lib/props.ts` and the bank out of `lib/world.ts`, and both the
 * §12.5 registrations and the §12.6 stops read *this*. One derivation, three consumers.
 */

const deg = (radians: number): number => (radians * 180) / Math.PI
const rad = (degrees: number): number => (degrees * Math.PI) / 180

/** §2.2's station — §3.7's food cart, found by key rather than by position. */
export function cartStation(): { x: number; z: number; depth: number; aimY: number } {
  const cart = STREET_PROPS.find((prop) => prop.key === BIO_STATION.propKey)
  /* A missing prop is a build error, not a runtime state — but returning a wall coordinate
     beats throwing inside a frame loop, and `stationAudit` will say so out loud. */
  if (cart === undefined) return { x: 3.8, z: 19.0, depth: 1.0, aimY: 1.32 }

  return {
    x: cart.position[0],
    z: cart.position[2],
    depth: cart.footprint[1],
    /**
     * **Halfway between the cart's two lit things — the sign band and the canopy panels.**
     *
     * It aimed at the counter alone, at 1.10 from 1.90 m out, which filled the frame with
     * worktop; then at the midpoint of the deck top and the sign band, which was right while
     * the band was on the canopy at 2.02. §2.2 has since moved the band down onto the bar at
     * 0.72 — **below the deck** — so that midpoint fell to 0.91 and the camera tipped down at
     * the wheels. A midpoint is only a framing if the two things bracket what you want in
     * frame; these two do, and the standoff of 2.90 gives them room.
     */
    aimY: (BIO_STATION.signBand.y + BIO_STATION.canopyPanels.y) / 2,
  }
}

/** §2.3's station — the mailbox faces, and the middle of however many rows there are. */
export function mailboxStation(channelCount = 6): { x: number; z: number; aimY: number } {
  const { boxesPerRow, rowPitch, firstRowY, box, wallX, z } = CONTACT_STATION
  const rows = Math.max(1, Math.ceil(channelCount / boxesPerRow))

  return {
    x: wallX + box.depth,
    z,
    /** The middle of the stack, so the stop looks at the bank rather than at one row of it. */
    aimY: firstRowY + ((rows - 1) * rowPitch) / 2,
  }
}

/**
 * A wall station's stop: `standoff` metres out, facing the wall, pitched at the object.
 *
 * **The pitch is derived and that is the whole reason this function exists.** §12.6 used to
 * author `-6°` and `-8°`; §2.2 then grew a stats board at 0.62 m and §2.3 became a bank
 * centred at 1.22 m, and authored pitches would have delivered the visitor to two objects the
 * camera was pointing over the top of.
 */
function wallStop(
  station: { x: number; z: number; aimY: number },
  standoff: number,
  side: 1 | -1,
): Pose {
  return {
    x: station.x - side * standoff,
    z: station.z,
    /* §12.1's convention: yaw 0 faces `+Z`, `+90°` faces `+X`. Facing an east wall means
       looking toward `+X`, which is `+90°`. */
    yaw: rad(side * 90),
    pitch: -Math.atan2(CAMERA.eyeHeight - station.aimY, standoff),
  }
}

export type Stop = { name: string; pose: Pose }

/** The five stops, in §12.6's order, resolved at call time. */
export function stops(channelCount?: number): Stop[] {
  const board = showcaseLockPosition()

  return [
    {
      name: 'spawn',
      pose: {
        x: GUIDED_PATH.spawn.position[0],
        z: GUIDED_PATH.spawn.position[2],
        yaw: rad(GUIDED_PATH.spawn.yawDeg),
        pitch: rad(GUIDED_PATH.spawn.pitchDeg),
      },
    },
    { name: 'about', pose: wallStop(cartStation(), GUIDED_PATH.standoff.about, 1) },
    {
      name: 'work',
      pose: {
        x: board[0],
        z: board[2],
        yaw: rad(SHOWCASE_LOCK.yawDeg),
        pitch: rad(SHOWCASE_LOCK.pitchDeg),
      },
    },
    {
      name: 'contact',
      pose: wallStop(mailboxStation(channelCount), GUIDED_PATH.standoff.contact[resolveTier()], -1),
    },
    /**
     * §3.1's station gate — **the tour's one stop that is not a content surface.**
     *
     * §17's first line is *you spawn facing an empty alley; you turn round and the shutter is
     * down*, and a visitor who takes the tour instead of walking never turned round. The tour
     * ended on contact and looped straight back past it. So the loop now closes through the
     * gate: contact → gate → spawn → about. You are brought back up the alley to face the
     * last train you missed, then turned to face the alley again, which is the same beat §17
     * opens with, arrived at rather than spawned into.
     *
     * `aimY` is §3.1's closure notice, not the plate above it: the notice is at 2.10 and that
     * section says outright it is *the only height on this wall a visitor reads at 3.0 m
     * without looking up*. The standoff is that 3.0.
     */
    {
      name: 'gate',
      pose: {
        x: 0,
        z: LAYOUT.ends.north.z + GUIDED_PATH.standoff.gate,
        /* §12.1: yaw 0 faces `+Z`. The gate is the north wall, so this looks back up `-Z`. */
        yaw: rad(180),
        pitch: -Math.atan2(
          CAMERA.eyeHeight - STATION_GATE.notice.centreY,
          GUIDED_PATH.standoff.gate,
        ),
      },
    },
  ]
}

/**
 * How long a leg takes.
 *
 * **`legDurationSec` was a duration and durations do not survive a stop moving.** §12.6's
 * legs are 38.6, 5.9 and 2.1 m now; 38.6 m in the authored 2.6 s is 14.8 m/s, which is the
 * precise fault that section rejected once already, arrived at from the other side. 2.6 s was
 * only ever right for the 26 m leg it was measured against, so it is read as what it always
 * was — a speed — with a floor so the short leg is a move rather than a snap.
 */
export function legSeconds(from: Pose, to: Pose): number {
  const distance = Math.hypot(to.x - from.x, to.z - from.z)
  return Math.max(GUIDED_PATH.minLegSec, distance / GUIDED_PATH.glideSpeedMps)
}

/* ── The tour ─────────────────────────────────────────────────────────────────
 *
 * **Reuses §2.1.1's locked view rather than driving the camera itself**, which is what
 * `CLAUDE.md` asks for and what `lib/pose.ts` was built general for. `lockTo` already owns
 * the mode transition, `Escape`, and release-on-movement-input; a second camera owner would
 * have to reimplement all three and would fight the first one for the same frame.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * **Starts at 1, and now wraps to 0.**
 *
 * It used to wrap to 1, because spawn was where the tour *began* rather than somewhere it
 * went — the first press would have moved the visitor from spawn to spawn, which reads as a
 * dead button. Starting at 1 already prevents that; the wrap did not need to.
 *
 * With §3.1's gate added after contact, spawn is a real destination: the loop runs contact →
 * gate → **spawn** → about, so after turning round to the shutter you are turned back to face
 * the alley. That turn is a stop, and skipping it would leave the visitor pointed at a wall
 * with the next press flinging them thirty-eight metres.
 */
let next = 1

/** Which stop `Next` will go to. Read directly; never subscribed to. */
export const nextStopIndex = (): number => next

/**
 * Advance to the next stop.
 *
 * **It does not resume from where the tour left off; it resumes from where the visitor is.**
 * §12.6 releases control on arrival and on any movement input, so between two presses the
 * visitor may have walked anywhere. `lockTo` starts every move from the live camera, which
 * is why that works without this file tracking anything but an index.
 */
export function nextStop(nowMs: number, channelCount?: number): void {
  const list = stops(channelCount)
  const target = list[next]
  if (target === undefined) return

  next = next + 1 >= list.length ? 0 : next + 1
  travel(target, nowMs)
}

/**
 * **What arriving at a stop *does*, in one place, for both ways of getting there.**
 *
 * §12.7's nav and §12.6's `Next stop` reach the same three destinations, and they disagreed:
 * the nav opened the overlays on arrival and the tour did not, so a guided visitor landed at
 * About and got a view of a food cart with no About in sight. Two routes to one place should
 * not have two behaviours — so the behaviour belongs to the *stop*.
 *
 * | Stop | On arrival |
 * |---|---|
 * | `about` | nothing opens — §12.5's prompt says `E — About`, and the visitor opens it |
 * | `work` | locks as `'showcase'`, so §2.1.2's pager and *open* appear — that **is** the projects view, and arriving is the whole action |
 * | `contact` | **on desktop** nothing opens; §2.3's six boxes each go somewhere different and the prompt says to click one. **On mobile the overlay opens**, because there the boxes are not a usable target |
 * | `gate`, `spawn` | nothing to open — neither is a station |
 *
 * **Contact splits by tier, and it is §2.1.2's argument again.** On a phone the tour parks
 * the visitor 1.60 m from six 0.44 m boxes in a portrait frame; the outer columns are at the
 * edges, the labels are 0.10 m tall, and the view is locked so they cannot step back or turn
 * to line one up. That is the fault §2.1.2 already fixed once by taking the project controls
 * off the wall and onto the screen — **a hit target in the world is only a hit target if the
 * visitor can get in front of it.** The overlay's rows are real ones. Desktop keeps the boxes,
 * because there a pointer reaches any of the six without moving.
 *
 * **About auto-opened for one round and it was a workaround, not a decision.** The overlay
 * was made to open on arrival because §12.5's prompt was rendering *blank* at every stop —
 * so arriving at About showed a food cart and no way to tell what it was for. The blank
 * prompt is fixed; with the prompt saying `E — About` the auto-open is a panel the visitor
 * did not ask for, thrown over a world they were just brought through. **Arriving somewhere
 * and being shown what is there are two different things**, and only the second is the
 * visitor's to trigger.
 */
function travel(target: Stop, nowMs: number): void {
  /* Already gliding: the visitor pressed twice. Drop the current move and take the new one —
     queueing would make the second press feel ignored for up to eight seconds. */
  if (poseActive()) releaseLock()

  const from: Pose = { x: position.x, z: position.z, yaw: look.yaw, pitch: look.pitch }
  const seconds = prefersReducedMotion() ? 0 : legSeconds(from, target.pose)

  if (target.name === 'work') {
    lockTo(target.pose, nowMs, seconds * 1000, 'showcase')
    return
  }

  const openOnArrival =
    target.name === 'contact' && resolveTier() === 'mobile' ? openContact : undefined

  lockTo(target.pose, nowMs, seconds * 1000, 'guidedPath', openOnArrival)
}

/** Puts the tour back to the top. The gate and a full loop both want this. */
export function resetTour(): void {
  next = 1
}

/**
 * §12.7 — go to one named stop.
 *
 * **The nav takes you there rather than teleporting the content to you**, which is what §2.1's
 * `Work` button has always done and what the other two now do. A portfolio whose About button
 * opens a panel over a world you never moved through has a world for decoration.
 *
 * `Work` is the exception and not by omission: §2.1.1's locked view *is* the destination, so
 * arriving is the whole action — and it locks as `'showcase'` so §2.1.2's pager appears with
 * it. The other two lock as `'guidedPath'`, which keeps that pager away from a food cart.
 */
export function goTo(name: 'about' | 'work' | 'contact', nowMs: number, channelCount?: number): void {
  const list = stops(channelCount)
  const index = list.findIndex((stop) => stop.name === name)
  const target = list[index]
  if (target === undefined) return

  /* Keep `Next stop` sensible after a jump: continue the tour from where the visitor is. */
  next = index + 1 >= list.length ? 0 : index + 1

  travel(target, nowMs)
}

/* ── §12.5's invariant, as a check ────────────────────────────────────────────
 *
 * **Three times is when a rule stops being prose.** §12.5 has said since it was written that
 * *a radius that does not contain its own stop is a station you cannot open from where the
 * world puts you*, and it has been broken three times: the board's radius twice as §2.1's
 * pose moved out, and §2.3's bank once — before either object existed, by two numbers that
 * were each correct on their own.
 *
 * `lib/props.ts`'s `audit()` shape, deliberately: returns `[]` or a list of findings, is
 * exposed on `window.__world`, and is checked by walking rather than by assertion.
 * ────────────────────────────────────────────────────────────────────────────── */

export type StationFinding = { rule: string; detail: string }

export function stationAudit(channelCount?: number): StationFinding[] {
  const findings: StationFinding[] = []

  for (const stop of stops(channelCount)) {
    /* Spawn and §3.1's gate are viewpoints, not stations — nothing is meant to be in
       range of either, and §12.5's manager has nothing to open at them. */
    if (stop.name === 'spawn' || stop.name === 'gate') continue

    const id = stop.name === 'work' ? 'showcase' : stop.name
    const station = registeredStations().find((entry) => entry.id === id)

    if (station === undefined) {
      findings.push({ rule: 'stop-without-station', detail: `no station registered as '${id}'` })
      continue
    }

    const distance = Math.hypot(stop.pose.x - station.x, stop.pose.z - station.z)
    if (distance > station.radius) {
      findings.push({
        rule: 'stop-outside-radius',
        detail: `${id}'s stop is ${distance.toFixed(2)} m out against a radius of ${station.radius}`,
      })
    }

    /* The one that found §2.3's fault. Two stations can each contain their own stop and still
       be wrong together, because the *nearest* is what §12.5's manager opens. */
    const nearest = nearestInRange(stop.pose.x, stop.pose.z, stop.pose.yaw)
    if (nearest !== null && nearest.id !== id) {
      findings.push({
        rule: 'wrong-station-at-stop',
        detail: `standing at ${id}'s stop, '${nearest.id}' is nearer and would claim the prompt`,
      })
    }
  }

  return findings
}

/** Dev-facing: the stops in degrees, for reading in a console. */
export function stopReport(channelCount?: number) {
  return stops(channelCount).map((stop) => ({
    name: stop.name,
    at: [+stop.pose.x.toFixed(3), +stop.pose.z.toFixed(3)],
    yawDeg: +deg(stop.pose.yaw).toFixed(2),
    pitchDeg: +deg(stop.pose.pitch).toFixed(2),
  }))
}
