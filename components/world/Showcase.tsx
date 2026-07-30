'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, Color, MeshStandardMaterial, PlaneGeometry } from 'three'
import { expose } from '@/lib/debug'
import { resolveTier } from '@/lib/device'
import { flickerLevel } from '@/lib/flicker'
import { showcaseLightsFor } from '@/lib/lights'
import { lockTo } from '@/lib/lockedView'
import type { Project } from '@/lib/projects'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import {
  pollShowcase,
  setShowcaseCount,
  showcaseDisplayIndex,
  transitionLevel,
  useShowcaseDisplayIndex,
} from '@/lib/showcase'
import { registerStation } from '@/lib/stations'
import { projectTitleTexture } from '@/lib/textures/projectTitle'
import { requestScreenshot, retainScreenshots } from '@/lib/textures/screenshot'
import {
  BEND,
  EMISSIVE,
  INTERACT,
  MATERIALS,
  NEON_FLICKER,
  PALETTE,
  SHOWCASE,
  SHOWCASE_LOCK,
  bendFacePoint,
  degToRad,
  showcaseLockPosition,
  yawToThreeRotationY,
} from '@/lib/world'

/**
 * §2.1 — the showcase surface. One renderer, one project at a time, everything from
 * `CONTENT.md`.
 *
 * **A billboard bolted to the wall, and a lightbox sign under it.** Two objects, each standing
 * proud of §3.1's bend face on its own. It was four, and before that a single carcass with
 * everything painted on its face — which at the size the screen needs stopped being a board
 * and became a wall covered in one texture. The prose went to §2.1.2's overlay, where it is
 * screen-space and legible at any distance, and the door went with it.
 *
 * **Nothing here names a project.** The index selects from the props and every surface is
 * repainted from whatever it selects, which is what makes §17's *a project added to
 * `CONTENT.md` appears with no component edited* true rather than aspirational.
 *
 * **The 20° yaw is applied once, on the group.** `yawToThreeRotationY(BEND.angleRad)` puts
 * the group's local `+Z` on §3.1's inward face normal and its local `+X` on the visitor's
 * right, so every child below is authored in a plain local XY plane and **no child carries an
 * angle**. The board's facing and §2.1.1's locked yaw are the same number through the same
 * helper — get the convention wrong and it all faces into the wall, which looks like a layout
 * bug and is not.
 *
 * **Nothing out here is clickable.** §2.1.2 took paging, the description, *open* and GitHub
 * onto the screen, so §12.2's click guard has no consumer in this component — the one place
 * §2.4's *nothing in the backdrop responds to a click* is now true of the content surface too.
 */

/** Hoisted: §2.1's tint, copied out of during the transition rather than re-parsed. */
const SCREENSHOT_TINT = new Color(SHOWCASE.screenshot.tint)
/** §2.1's resting state, held until a decode actually succeeds. */
const RESTING = new Color(SHOWCASE.restingColor)

const UNIT_BOX = new BoxGeometry(1, 1, 1)
const UNIT_PLANE = new PlaneGeometry(1, 1)

/**
 * §8's `boardCase` row, not `paintedMetal`, and the difference is area. `paintedMetal` is
 * metalness 0.55 at `envMapIntensity` 1.0 — fine on a bracket, a mirror across square metres
 * of panel, which is what §7.1's light 9 was reflecting off before this row existed.
 */
const CASE_MATERIAL = new MeshStandardMaterial({
  color: PALETTE.metalDark,
  roughness: MATERIALS.boardCase.roughness,
  metalness: MATERIALS.boardCase.metalness,
  envMapIntensity: MATERIALS.boardCase.envMapIntensity,
})



export default function Showcase({ projects }: { projects: readonly Project[] }) {
  const tier = resolveTier()
  const index = useShowcaseDisplayIndex()
  const project = projects[index]

  useEffect(() => {
    setShowcaseCount(projects.length)
  }, [projects.length])

  const [groupX, , groupZ] = bendFacePoint(SHOWCASE.t, 0)
  const groupRotationY = yawToThreeRotationY(BEND.angleRad)
  const showcaseLights = useMemo(() => showcaseLightsFor(tier), [tier])

  /**
   * §2.1 — the screenshot **glows and still never blooms.**
   *
   * It was a `meshBasicMaterial` at emissive 0, which does not merely stop it blooming — it
   * stops it being *lit*, and a dark rectangle of interface on a dark wall at 3am reads as a
   * photograph of a screen rather than as a screen. §8.1's rung is 0.78, under the 0.90 knee,
   * so §9's bloom never touches it and the ceiling that protects the scene is unchanged.
   *
   * **Built in the resting state with no map**, `#0E121A`. That is not a fallback; it is what
   * this material *is* until a screenshot succeeds. §2.1: no spinner, no error, no white
   * plane — and no error path, because there is nothing to catch.
   */
  const screenshotMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: SHOWCASE.restingColor,
        emissive: 0xffffff,
        emissiveIntensity: SHOWCASE.screenshot.emissive,
        toneMapped: SHOWCASE.screenshot.toneMapped,
        roughness: MATERIALS.boardCase.roughness,
        metalness: 0,
      }),
    [],
  )

  /**
   * §3.4's lightbox: the painted map is **greyscale** and the colour lives here, in the
   * emissive term. A coloured map would multiply the accent by itself — and it is also what
   * lets one painter serve this sign and §3.6's brand sign in two different colours.
   */
  const titleMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        emissive: PALETTE[SHOWCASE.titleSign.color],
        color: PALETTE.void,
        emissiveIntensity: EMISSIVE.lightboxSign,
        roughness: MATERIALS.boardCase.roughness,
        metalness: MATERIALS.boardCase.metalness,
        envMapIntensity: MATERIALS.boardCase.envMapIntensity,
      }),
    [],
  )

  /* ── Repaint on project change. §11.1: on mount and on project change, never per frame. ── */

  useEffect(() => {
    if (project === undefined) return
    const title = projectTitleTexture(project.name, tier)
    if (title !== null) {
      titleMaterial.emissiveMap = title
      titleMaterial.needsUpdate = true
    }
  }, [project, tier, titleMaterial])

  /**
   * §2.1 / §15 — three screenshots resident: this one and its two neighbours. The retain list
   * is built here rather than inside the cache because paging is what knows which are
   * neighbours. With four projects the evicted one is always two pages away.
   */
  useEffect(() => {
    if (projects.length === 0) return
    const wrap = (i: number): number => ((i % projects.length) + projects.length) % projects.length
    const neighbours = [index, wrap(index + 1), wrap(index - 1)]
      .map((i) => projects[i]?.screenshot ?? '')
      .filter((path) => path.length > 0)

    retainScreenshots(neighbours, tier)

    requestScreenshot(projects[index]?.screenshot ?? '', tier, (texture) => {
      /* Only the maps. The tint is the frame loop's now — it rides §2.1's transition — and a
         material built with the tint already on it would show a *failed* load as a pale
         grey-blue plane rather than §2.1's `#0E121A`. Failure with a colour is worse than
         failure, so the resting colour stays until a decode actually succeeds. */
      screenshotMaterial.map = texture
      screenshotMaterial.emissiveMap = texture
      screenshotMaterial.needsUpdate = true
    })

    for (const path of neighbours.slice(1)) requestScreenshot(path, tier, () => {})
  }, [index, projects, tier, screenshotMaterial])

  /* ── §12.5 — registration. The station is the wall; `open()` is the lock. ── */

  useEffect(() => {
    const pose = showcaseLockPosition()
    return registerStation({
      id: 'showcase',
      x: groupX,
      z: groupZ,
      radius: INTERACT.board.radius,
      prompt: INTERACT.board.prompt,
      open: () =>
        lockTo(
          {
            x: pose[0],
            z: pose[2],
            yaw: degToRad(SHOWCASE_LOCK.yawDeg),
            pitch: degToRad(SHOWCASE_LOCK.pitchDeg),
          },
          performance.now(),
        ),
    })
  }, [groupX, groupZ])

  useEffect(() => {
    expose('showcase', {
      lockPose: showcaseLockPosition(),
      lockYawDeg: SHOWCASE_LOCK.yawDeg,
      lockPitchDeg: SHOWCASE_LOCK.pitchDeg,
      groupAt: [groupX, groupZ],
      projectCount: projects.length,
      index: showcaseDisplayIndex,
    })
  }, [groupX, groupZ, projects.length])

  useFrame((state) => {
    const nowMs = performance.now()
    pollShowcase(nowMs)

    /* §2.1's transition, applied by mutating the materials directly — sixty React renders a
       second to dim a board costs more than the board does. Both surfaces move together, so
       the name and the work never disagree about which project is showing. */
    const level = transitionLevel(nowMs)
    screenshotMaterial.emissiveIntensity = SHOWCASE.screenshot.emissive * level
    /* The diffuse rides the same level, or the screen dims to a lit-but-black rectangle
       instead of going dark. Copied from a hoisted colour — parsing a hex string sixty times
       a second is the frame-loop allocation this file is careful about everywhere else.
       **Only once a map exists**: without the guard the loop would paint the tint over the
       resting colour on the first frame, and a screenshot that never loads would show as pale
       grey-blue rather than as §2.1's `#0E121A`. Failure with a colour is worse than failure. */
    screenshotMaterial.color
      .copy(screenshotMaterial.map === null ? RESTING : SCREENSHOT_TINT)
      .multiplyScalar(level)

    if (prefersReducedMotion()) {
      // §13 — constant on. Not dimmed and not frozen mid-sequence.
      titleMaterial.emissiveIntensity = EMISSIVE.lightboxSign
      return
    }

    titleMaterial.emissiveIntensity =
      EMISSIVE.lightboxSign *
      level *
      flickerLevel(state.clock.elapsedTime, NEON_FLICKER.phase.shopfront)
  })

  if (project === undefined) return null

  const { screen, titleSign, faceOffset } = SHOWCASE
  const screenY = screen.baseY + screen.height / 2
  const signY = titleSign.baseY + titleSign.height / 2
  /* §7 — resolved against the tier's cap in `lib/lights.ts`, where the whole world is
     counted at once. A cap applied inside one component lets the other two walk past it. */
  const { screen: light2, sign: light3 } = showcaseLights


  return (
    <group name="showcase" position={[groupX, 0, groupZ]} rotation={[0, groupRotationY, 0]}>
      {/* ── The billboard: a deep metal frame with the screen recessed into it ── */}
      <mesh
        name="showcase:frame"
        geometry={UNIT_BOX}
        material={CASE_MATERIAL}
        position={[0, screenY, faceOffset + screen.depth / 2]}
        scale={[screen.width + screen.frame * 2, screen.height + screen.frame * 2, screen.depth]}
      />
      <mesh
        name="showcase:screenshot"
        geometry={UNIT_PLANE}
        material={screenshotMaterial}
        position={[0, screenY, faceOffset + screen.depth + 0.002]}
        scale={[screen.width, screen.height, 1]}
      />

      {/* ── The title, as a §3.4 lightbox: a case and a lit face ──
          A box carries its material on all six sides, and an emissive underside pointing at a
          1.68 m eye reads as a blown wash — which is what the sign did before it was split. */}
      <mesh
        name="showcase:titleCase"
        geometry={UNIT_BOX}
        material={CASE_MATERIAL}
        position={[titleSign.x, signY, faceOffset + titleSign.depth / 2]}
        scale={[titleSign.width, titleSign.height, titleSign.depth]}
      />
      <mesh
        name="showcase:title"
        geometry={UNIT_PLANE}
        material={titleMaterial}
        position={[titleSign.x, signY, faceOffset + titleSign.depth + 0.002]}
        scale={[titleSign.width * 0.94, titleSign.height * 0.86, 1]}
      />

      {/* ── §7 lights 2 and 3, seated on the two things above ──
          Authored in §7 since §2.1 was designed and never mounted, which is the fault §7.1
          spent a section on in the other direction: a light with no emitter. These are two
          emitters that had no light, and the alley's one content surface was lit by the
          §3.5 sign nearest to it.

          **Inside the group, so neither carries a coordinate.** The group already puts local
          +Z on §3.1's inward face normal; a light written in world space here would drift the
          moment `BEND` moves, silently, because a light two metres off its emitter still
          looks like a light. */}
      {light2 !== null ? (
        <rectAreaLight
          name={`light:${light2.id}:showcaseScreen`}
          color={PALETTE[light2.color]}
          intensity={light2.intensity}
          width={light2.size[0]}
          height={light2.size[1]}
          position={[0, screenY, faceOffset + screen.depth + 0.01]}
          /* §7 — a `rectAreaLight` emits along its own **−Z**, and the group's +Z is the
             direction the board faces, so it is turned to face out of the wall. Without this
             it lights the inside of the bend, which is a solid box: the light is mounted, the
             uniforms are initialised, and the alley is exactly as dark as it was. */
          rotation={[0, Math.PI, 0]}
        />
      ) : null}

      {light3 !== null ? (
        <pointLight
          name={`light:${light3.id}:showcaseSign`}
          color={PALETTE[light3.color]}
          intensity={light3.intensity}
          position={[titleSign.x, signY, faceOffset + titleSign.depth + light3.standoff]}
          distance={light3.distance}
          decay={light3.decay}
        />
      ) : null}
    </group>
  )
}
