# CLAUDE.md — The Walkable World

A walkable 3D world, moved through in first person at eye level, that doubles as a portfolio. Small on purpose: crossable in under a minute, with something closing the far edge so there is no horizon to build.

---

## The three content surfaces

Content lives in exactly three places, and nowhere else. These are roles — the objects that fill them are defined in `WORLD_BRIEF.md`.

| Role | Carries |
|---|---|
| **Showcase surface** | The projects — one at a time, from `CONTENT.md`, each with a door to its live deployment |
| **Bio station** | About — a walk-up overlay, also reachable from the top nav |
| **Contact station** | The channels — a walk-up overlay, also reachable from the top nav |
| **Surroundings** | Nothing. Pure atmosphere. |

Whatever the objects are: one project at a time · everything generated from `CONTENT.md` · doors open the real deployment · contact always in the nav as well as in the world · **surroundings carry nothing** — no names on scenery, nothing clickable in the backdrop.

---

## Source of truth

| Document | Governs |
|---|---|
| `WORLD_BRIEF.md` | Every atmospheric, material, light and scale value; layout; what the three content surfaces are; navigation |
| `CONTENT.md` | The projects — name, description, tech, live URL, GitHub, screenshot path |

> **Atmospheric values are never invented and never hardcoded inline.** Every colour, fog density, emissive intensity, roughness, post-processing setting, reflection strength and scale figure comes from `WORLD_BRIEF.md`, read through a typed `lib/world.ts` that mirrors it.

If a value is needed and the brief does not contain it, **stop and say so** rather than choosing one. The brief gets updated deliberately; the build follows it.

**Project content is never invented either.** Names, descriptions, links and screenshots come from `CONTENT.md`. No placeholders, no lorem, no invented URLs.

---

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (strict)
- **three** + **@react-three/fiber** + **@react-three/drei** + **@react-three/postprocessing**
- **Tailwind** — 2D overlay UI only (nav, overlays, gate, hint). Never inside the Canvas.
- **Vercel**

Install the four 3D packages together so they resolve as a set. Then **pin `three` to an exact version and write the reason beside it** — these packages peer-depend in narrow ranges, and a mismatch surfaces weeks later on an unrelated `npm update`, looking like application code is at fault. A pin without a stated reason gets deleted by whoever reads it next. Pin `@types/three` to match: `three` ships no declarations of its own and DefinitelyTyped tracks its version 1:1, so a floating `@types/three` is the same mismatch at compile time.

**Never import drei's `<StatsGl>`.** It pulls `stats-gl`, which nests *its own copy of `three`* — a second engine in the bundle, defeating the pin and the chunk split at once. The duplicate is already in the dependency tree and is harmless only for as long as nothing imports it. Read `gl.info.render` directly, or use drei's `<Stats>` (stats.js, no three dependency).

Never add a dependency without asking.

---

## React Three Fiber

Each of these exists because breaking it produces a failure that does not resemble its cause.

- **Client components only.** Every file importing `three`, `@react-three/fiber`, `drei` or `postprocessing` begins with `'use client'`.
- **The Canvas never server-renders.** Load it through `next/dynamic` with `ssr: false`; SSR throws on `window` and the error points nowhere useful.
- **One Canvas** for the whole world. A second one carries its own renderer and scene graph and halves the frame rate for nothing.

**Frame-loop discipline** — the rule most likely to cost an evening:

- Per-frame work goes in `useFrame`.
- **Never `setState` inside `useFrame`.** Sixty React renders a second consumes the frame budget, and the symptom looks like a problem with whatever is most visible on screen.
- **Never allocate inside a frame loop.** Hoist `Vector3`, `Color`, `Matrix4` to module scope and mutate in place.
- Animate by mutating refs, not by re-rendering.
- Read UI state in the loop with a **direct store read**, not a subscription.

```tsx
const tmp = new THREE.Vector3()          // hoisted once

useFrame((state, delta) => {
  tmp.set(0, Math.sin(state.clock.elapsedTime), 0)
  meshRef.current.position.lerp(tmp, delta)   // mutate, don't setState
})
```

**`react-hooks/immutability` is off for the scene-graph files**, and must stay off. React Compiler's rule assumes values flowing through a component are immutable data; R3F's scene graph is a live tree of three.js objects where animation *is* mutation of it. The rule forbids exactly what the paragraph above requires. The suppression is scoped in `eslint.config.mjs` to `components/world/**`, `components/player/**` and `lib/textures/**`, so it keeps protecting the 2D overlay code where it is correct — **do not widen it, and do not satisfy it by allocating**.

**Allocation and reuse.** Geometries and materials are created once and reused, never constructed in a render body. Repeated geometry uses `InstancedMesh` or drei's `<Instances>` — with any density this is not optional. Prefer declarative primitives so disposal is handled; anything constructed manually must be disposed manually.

**Shaders.** GLSL lives in its own files under `shaders/`, never as strings scattered through components. Uniforms update through a ref inside `useFrame`, never through React state. Anything covering the full screen every frame is the first thing to eat the budget — keep it cheap.

**Text.** Use canvas textures, not 3D type. `Text3D` and troika mean shipping a font and paying for glyph geometry; a painted canvas is crisper at distance and costs one texture.

---

## State and interaction

The world and the DOM are two layers joined by one store.

**The mode machine.** One store holds the mode; one selector answers whether the visitor may move.

```ts
export type Mode = 'loading' | 'play' | 'locked' | 'overlay'
export const canControl = (s: State) => s.mode === 'play'
```

**Movement is gated on that selector, with no exceptions.** Otherwise a visitor typing in a contact form walks across the world while doing it — invisible while building, because you never type in your own form.

**One owner of the interact key.** Stations register on mount with a position and radius. A single manager reads the key, finds the **nearest** registered station in range, and opens it. Edge-triggered. Never let each station listen for the key itself — two in overlapping range both fire.

**The click guard.** Look-drag and click share the left mouse button, so a drag ending over an interactive object would otherwise click it on release. R3F reports pointer travel as `delta`; past a few pixels it was a camera turn, not a tap.

**Escape** closes whatever overlay is open. Nothing else may claim it.

---

## Navigation

Defined in `WORLD_BRIEF.md`, and non-negotiable in one respect: **a stranger must be able to reach every surface and open every door, on any device.**

- **Looking** — drag-to-look: pointer events on the canvas, yaw and pitch on refs, pitch clamped short of vertical. **One model on desktop and touch.** Do not use `PointerLockControls`: it contests `Escape` with the overlays, hides the cursor needed for clicking doors, and must be released and recaptured around every locked view.
- **Walking** — camera-relative, flattened to the ground plane. WASD and arrows on desktop, an on-screen stick on touch, both feeding one intent vector.
- **Eye height** from `WORLD_BRIEF.md`.
- **Collision** — bounding boxes on anything solid, added as objects are placed, **plus a hard clamp on the walkable bounds.** Boxes leak at corners; a clamp cannot. Scenery the visitor can pass through is fine and cheaper.
- **The guided path** — a "next stop" route gliding between the showcase surface and the two stations, so a visitor who does not want to walk still reaches everything. Reuses the locked-view camera; keep that general (target pose, ease, release).
- **No physics engine.** A capsule and a clamp are enough.

---

## Reduced motion

Honour `prefers-reduced-motion: reduce` everywhere. A first-person world owes this more than a scroll page does, because the whole camera moves.

- No camera easing, no head bob, no entry sweep — cut straight to control.
- Locked view and guided path move without acceleration, or jump.
- Ambient motion calms; post-processing flourishes come off.
- **Everything remains fully reachable.** Reduced motion never means reduced access.

Build it in with the movement code, not as a retrofit.

---

## The showcase surface

- Generated from `CONTENT.md`, **never hardcoded.** One renderer, rendered per project; nothing on it tied to a particular project.
- Adding, removing or replacing a project in `CONTENT.md` must change it with **no component edits.** If it requires touching a component, the abstraction is wrong.
- A **door** opens the project's live URL in a new tab.
- The screenshot from `CONTENT.md` is the image. **Dim it below the bloom threshold** — a bright image on an emissive surface blows through the knee and becomes a white smear that lights the whole scene.
- Anything live **fails quietly** — a resting state or the fallback image on slow fetch, rate limit or downtime. Never a spinner, an error, or a blank white plane.

---

## Structure

```
app/
  layout.tsx
  page.tsx                  // dynamic import of World, ssr: false
components/
  world/
    World.tsx               // the single <Canvas>
    Ground.tsx
    Atmosphere.tsx          // fog, lights, environment
    Effects.tsx             // post-processing
    Surroundings.tsx        // scenery — carries no content
    Showcase.tsx            // the projects
    Stations.tsx            // bio + contact
  player/
    Player.tsx              // movement + clamp
    Camera.tsx              // drag-to-look, locked view, guided path
  ui/                       // 2D overlay only
    Gate.tsx                // entry gate + audio unlock
    Nav.tsx
    Overlays.tsx
    ControlsHint.tsx
lib/
  world.ts                  // typed mirror of WORLD_BRIEF.md
  store.ts                  // mode machine
  stations.ts               // registry
  audio.ts
  textures/                 // canvas painters
shaders/
```

---

## Build discipline

**Plan Mode when the parts interlock; a direct prompt when the work is linear.** The test is not how big the task is — it is whether getting the order or the boundaries wrong costs an afternoon. A controller where two input paths must converge, or a store other code already gates on, earns a plan. A list of scenery props does not.

**Scope every plan to the task, never to the project.** This file and `WORLD_BRIEF.md` both describe the whole world; an unscoped request returns a plan for the finished site that nobody can review. Name what is in scope, name what is explicitly out, and ask for something checkable — the file list and build order, or the component boundaries and where state lives.

Then one thing at a time, verified in the live preview against the brief before the next begins. One task per conversation.

The order is not arbitrary:

1. **Shell** — ground, atmosphere basics, layout and walkable bounds.
2. **Navigation** — walking, looking, clamp, reduced motion. Built *before* the scenery, so everything after is judged the way a visitor meets it: at eye height, while moving.
3. **Surroundings** — bulk work, reviewed as a diff. Bounding boxes go on as things are placed.
4. **Atmosphere** — the effects pass. Measure the frame budget here, once the scene is visually complete.
5. **Content** — the showcase surface, then the stations. The guided path lands with the stations, since it needs destinations.
6. **Threshold** — gate, sound, controls hint.

Nothing has a look of its own; it has a look in *that* world, next to its neighbour, at eye height — which cannot be judged until all three exist.

---

## Performance

The frame budget lives in `WORLD_BRIEF.md`. **Test on a mid-range phone, not the development machine.**

Turn things down in this order:

1. **Reflection resolution** — the single biggest dial
2. **Post-processing passes**
3. **Full-screen effect density** — halve on mobile as a matter of course
4. **Draw calls** — instance harder before deleting anything
5. **Shadow maps** — off unless the brief calls for them

Also cap device pixel ratio on mobile.

**On weight, be honest.** A 3D world ships megabytes. Split the engine into its own chunk so it caches independently of application code, and let the entry gate cover the wait.

That split comes from the `next/dynamic({ ssr: false })` boundary the Canvas already needs — everything reachable only through it lands in its own async chunk. **Do not write a `splitChunks` block for it:** Next builds with Turbopack, which does not expose webpack's `splitChunks`, so hand-written `cacheGroups` would be config that silently does nothing while looking like it works.

---

## Never

- Never invent or hardcode an atmospheric value — read it from `WORLD_BRIEF.md`
- Never `setState` inside `useFrame`
- Never allocate inside a frame loop
- Never mount a second Canvas, or server-render the Canvas
- Never add a dependency without asking
- Never use placeholder content — names, links and screenshots come from `CONTENT.md`
- Never hardcode a project into the showcase surface
- Never put content in the surroundings
- Never let the visitor move while an overlay is open
- Never let a station listen for the interact key itself
- Never use `PointerLockControls` — `Escape` belongs to the overlays
- Never ship motion that ignores `prefers-reduced-motion`
- Never ship without walking the world on a phone

---

## Definition of done

- **Structural** — showcase surface, both stations and surroundings present and to the brief; every door works
- **Consistency** — this file's rules held throughout; `three` pinned with its reason
- **Visual** — the render matches `WORLD_BRIEF.md`, checked against the document *and* by walking it
- **Content** — every project matches `CONTENT.md`; adding or removing one changes the world with no component edit; nothing has leaked into the surroundings
- **Code** — frame budget met on a real phone, reduced motion honoured, the showcase fails gracefully, collision and clamp hold, the guided path reaches everything

Plus the test that decides whether any of it works: **a stranger, on a phone, finds your contact details in ten seconds without walking anywhere.**