# WORLD_BRIEF.md — 終電 / Last Train

> **Vibe sentence** — 3am in Tokyo. You've just missed the last train. Neon reflections on wet pavement.

This document is the source of truth for every atmospheric, material, light and scale value in the world, for the layout, for what the three content surfaces are, and for navigation. `lib/world.ts` is a typed mirror of this file. Nothing here is invented at the keyboard; if the build needs a number that is not written down here, the build stops and this file gets updated.

Units are **metres** and **radians unless a degree sign is present**. Colours are authored in **sRGB hex** and converted at load (`THREE.ColorManagement` on, `outputColorSpace = SRGBColorSpace`). Y is up. The alley runs along **+Z**.

---

## 1. The world in one paragraph

A single back alley off a Shinjuku side street, forty-six metres end to end, nine metres wide, walled at both ends. Behind you, the station ticket gate with its shutter down — you missed it. Ahead, the alley bends into fog and never resolves. It has been raining for an hour and has just stopped; the asphalt is a mirror and every sign in the alley is in it, upside down and softer. There is no sky: fourteen-metre facades on both sides, a mat of overhead cable, and fog that closes the last fifteen metres. Nobody else is here. Three things in the alley are lit warmer than the rest — a shopfront, a vending machine, a payphone — and those three are the portfolio.

**Crossable in under a minute:** 46 m at 2.6 m/s ≈ 18 seconds end to end.

---

## 2. The three content surfaces

| Role | Object | Where |
|---|---|---|
| **Showcase surface** | **The shopfront** — a recessed lightbox window with a vertical neon sign above it and a noren-curtained door beside it | West wall, `z = -4.0` |
| **Bio station** | **The vending machine** — a lit drinks machine glowing warm in a dark stretch | East wall, `z = +6.0` |
| **Contact station** | **The payphone** — a green NTT box under a small awning | West wall, `z = +14.0` |
| **Surroundings** | The alley. **Carries nothing.** | Everywhere else |

The zigzag is deliberate: showcase left, bio right, contact left, each one visible from the previous, none visible from spawn until you turn.

### 2.1 The shopfront (showcase surface)

One shopfront. One project shown at a time. Everything on it is generated from `CONTENT.md`.

| Part | Value |
|---|---|
| Facade recess | 3.80 w × 4.60 h × 0.55 deep, west wall, centre `z = -4.0` |
| **Lightbox window** | **3.20 × 1.70** (16:8.5 — matches the 1920×1020 screenshots exactly, no crop), sill at `y = 1.02`, glass 0.06 in front of the image plane |
| Vertical neon sign | 0.52 w × 3.40 h, mounted at `x = -4.06`, `z = -4.0`, base at `y = 4.30` — carries the **project name** |
| Info panel | 1.10 × 0.62, right of the window at `z = -5.9`, sill `y = 1.15` — carries **description + tech**, dim backlit, not emissive |
| **Door** | Doorway 1.00 × 2.05 at `z = -2.3`, noren curtain over it. **Opens the project's live URL in a new tab.** |
| Secondary door | A small enamel plate beside the doorframe at `y = 1.45` — **opens the GitHub URL** in a new tab |
| Advance control | Two arrow plates, 0.24 × 0.24, flanking the window at `x = -4.28`, `y = 1.90`, `z = -2.35` and `z = -5.65`. Also `←`/`→`, `[`/`]`, and horizontal swipe when in range |
| Position indicator | N dots, 0.05 dia, 0.12 apart, centred under the sill at `y = 0.88` — N read from `CONTENT.md`, never hardcoded |

**Transition between projects:** the lightbox cuts to black over 140 ms, holds 90 ms, fades up over 260 ms; the neon sign flickers on with the sequence in §11.3. Reduced motion: hard cut, no flicker, 0 ms.

**Brightness of the screenshot — the rule that protects the whole scene.** The image plane is `meshBasicMaterial`, **not emissive**, tinted `#A6B2C6` (a 0.68 multiply) and `toneMapped: true`. Peak luminance must land **below the bloom threshold of 0.90**. The glow around the window comes from the *surround*, not the image: a 0.04 emissive border strip at intensity 1.40 and the RectAreaLight in §7.

**Failure is quiet.** No spinner, no error, no white plane. A screenshot that fails to load leaves the lightbox showing its resting state: flat `#0E121A` with the ripple-glass normal map still catching the neon. The door still works.

### 2.2 The vending machine (bio station)

Reads the About material from `CONTENT.md` — eyebrow, heading, stats, the five story panels, latest course, currently building.

| Part | Value |
|---|---|
| Body | 1.12 w × 0.82 d × 1.94 h, `x = +4.10`, `z = +6.0`, facing `-X` |
| Lit front panel | 0.96 × 1.42, base `y = 0.44`, emissive `#FFD9A0` at intensity **1.60** |
| Selection buttons | 3 × 4 grid of 0.07 lit squares, `#FF6FA5` / `#3BD9FF` alternating, intensity 2.10 |
| Interact | Radius **2.20** — opens the bio overlay |
| Idle | Compressor hum, and a 0.5 Hz × 0.004 brightness breathe on the front panel |

The machine's product rows are painted onto the panel texture as anonymous cans and bottles. **No project names, no headshot, no text on the exterior beyond decorative kana from §11.4.** The content lives in the overlay.

### 2.3 The payphone (contact station)

Reads the contact channels from `CONTENT.md` (`contact@jacinto.design`) plus the social links.

| Part | Value |
|---|---|
| Box | 0.62 w × 0.54 d × 1.36 h on a 0.28 plinth, `x = -4.16`, `z = +14.0`, facing `+X` |
| Awning above | 1.60 × 1.10, underside at `y = 2.60`, underside emissive `#3BD9FF` at 0.85 |
| Handset light | Small internal lamp `#2FE08A`, emissive intensity 1.90 |
| Interact | Radius **2.00** — opens the contact overlay |
| Idle | A single ring every 34 s, −22 dB, if audio is unlocked. Never more often. |

**Contact is also permanently in the top nav**, on every device, from the first frame after the gate. The ten-second test is passed by the nav, not by the walk.

### 2.4 What the surroundings carry

**Nothing.** No project names on scenery. Nothing in the backdrop is clickable, hoverable, or raycast against. Decorative Japanese signage is drawn from the fixed list in §11.4 and is atmosphere only — if a string in the world is not from `CONTENT.md` and not from that list, it does not exist.

---

## 3. Layout

```
                    ↑ +X (east)
   z = -23 ┌───────────────────────────────────────────────┐ z = +23
           │  ▓▓ STATION SHUTTER (closed) ▓▓               │  ▓▓ DEAD BEND ▓▓
   EAST    │        ░░░░░░░  ▣ VENDING (bio) z=+6  ░░░░░░  │
   WALL    │                                               │
           │·······················  ·······················│  ← gutter lines
 walkable  │        ●spawn                                  │
   strip   │        z=-19.5                                 │
           │·······················  ·······················│
   WEST    │  ▤ SHOPFRONT (showcase) z=-4   ☎ PHONE z=+14   │
   WALL    └───────────────────────────────────────────────┘
                    ↓ -X (west)
```

| Dimension | Value |
|---|---|
| Alley length | 46.0 (`z ∈ [-23, +23]`) |
| Alley width | 9.0 (`x ∈ [-4.5, +4.5]`) |
| Facade height | 14.0 west, 12.5 east (asymmetry stops it reading as a corridor) |
| **Wall thickness** | **1.00**, all facades and end walls, inner faces at `x = ±4.5`. Set by the 0.55 shopfront recess in §2.1 — a thinner wall leaves too little behind it. Outer faces are never seen. |
| Ground | `y = 0`, single plane **70 × 70** (overscan hidden by fog, or by a wall). Was 60 × 60 until §3.6 put a road past the bend — see there |
| Kerb | 0.12 high, 0.60 wide, both sides, inner edge at `x = ±3.90` |
| Gutter channel | 0.22 wide at `x = ±3.72`, 0.03 deep — standing water, roughness 0.06. **Expressed through the puddle mask, not as overlay geometry — see below.** |
| **Walkable clamp** | **`x ∈ [-3.60, +3.60]`, `z ∈ [-21.0, +21.4]`** (hard, in addition to AABBs) |
| Player radius | 0.32 |

**The clamp acts on the eye position, and the player radius is not subtracted from it.** The two numbers meet here and it is worth saying which does what: ±3.60 already stands 0.90 m inside the walls at ±4.5, so taking the 0.32 radius off it again would stop the visitor at ±3.28 for no reason this document gives. The radius belongs to the §12.4 box resolution, where it is the distance a capsule keeps from a *solid object*; the clamp is a literal coordinate limit on the camera.

**The gutter is the mask, not a strip.** This section gives the gutter roughness 0.06, and §6.2 gives puddle-wet ground roughness 0.06 and biases the mask toward `x = ±3.72` — the two sections describe one surface. Laying a separate strip over the reflector would invert it, because a plain material on top of the reflector makes the wettest line in the alley the only one that does not reflect. **What remains genuinely unbuilt is the 0.03 recess**, which cannot exist while the floor is a plane; it needs real floor geometry and arrives with the kerb and drain modelling in the surroundings step. Until then the gutter reads as standing water, which at eye height is what 3 cm of depth looks like anyway.

### 3.1 The two ends (there is no horizon)

- **North, `z = -23`** — the station ticket gate. Full-width wall, roller shutter down, a dark backlit `終電` plate above it at 4.2 m, three dead gate machines in silhouette. This is behind you at spawn; turning round is the story beat.
- **South, `z = +23`** — the alley bends left. A 6 m return wall of shuttered doors at 20° to the axis, so no vanishing point is visible, and fog closes it at 0.24 transmittance.
- **Above** — an overhead mat of cable and wire at `y ∈ [6.5, 9.0]`, plus three cross-alley banner wires. There is **no sky dome and no HDRI**: `scene.background` is a flat `#04060B` and the fog eats everything before the facade tops.

**End wall height — 14.0, both ends.** This document gives heights for the two facades and none for the caps. They take the taller of the two, because a cap shorter than its neighbours opens a strip of sky in a world whose whole premise is that there is none. Derived from the constraint, not chosen.

**"20° to the axis" means across the end, not along it.** The phrase admits two readings, and only one does the job the same sentence asks for: a wall swung 20° off the *long* axis runs nearly parallel to the alley and blocks nothing, while a wall across the end swung 20° off square hides the vanishing point. **The second reading is the one that holds.** Its west end meets the west wall and it opens toward `+X` — the visitor's left when facing `+Z`, which is the direction the alley is stated to bend. What lies past the opening is §16.2 and still unmodelled; at 42 m from spawn the fog is at ~0.21 transmittance and closes it unaided.

**Facades run `z ∈ [-24, +24]`** — the alley length plus a wall thickness at each end, so the facades meet the outer faces of both caps and no corner shows a seam.

### 3.2 Surroundings inventory (atmosphere only)

Placed as instanced geometry, reviewed as a diff, bounding boxes added as they go:

| Item | Count | Solid? |
|---|---|---|
| Shuttered storefronts (3 shutter variants) | 14 | yes |
| Dead vending machines (unlit, dark) | 5 | yes |
| Red paper lanterns on brackets | 11 | no |
| Vertical neon signs (decorative, §11.4) | 9 | no |
| Air-con condensers on brackets | 16 | no |
| Standpipes / drainpipes | 22 | yes (12 of them) |
| **Scooters** leaning on side stands | 4 | yes |
| Crates and beer cases stacked | 9 | yes |
| Traffic cone + barrier | 3 | yes |
| Steam vents (grates) | 3 | no |
| Overhead cable spans | 34 | no |
| Utility poles | 6 | yes |
| Puddle decals | 18 | no |
| Ripple emitters | 12 | no |
| Cross-street vehicles (§3.6, past the bend) | 6 | no — unreachable |
| **Food cart** (§3.7) | 1 | yes |
| **Rubbish points** (§3.7) | 2 | yes |
| **Alley-mouth guardrail** (§3.7) | 1 | yes |

**Scooters, not bicycles.** This line read *bicycles leaning* until §3.7 built it, and the change is technical before it is anything else. Everything in this world is boxes and cylinders (§3.4), and a bicycle at that vocabulary is two wire wheels and a lattice of thin tubes — it reads as a mess at any distance the alley offers. A scooter is a floorboard, a cowl, a leg shield, a seat and two fat wheels: five primitives that read as one object at 20 m and still hold up at 2 m. It is the same object in the same place doing the same job, drawn in a vocabulary this world already has.

### 3.3 The upper facade — window bays

Above the shopfront line both facades are flat colour across 48 m, and it is the surface a visitor looking up actually meets. It carries a **window grid painted to a canvas and used as both `map` and `emissiveMap`** — the same pixels in both, so a window cannot be lit in colour and dark in glow.

**This is not a skyline.** §1 and §3.1 stand unchanged: no sky dome, no towers, no horizon. The grid goes on the two walls that already exist, inside the fog, capped at the same heights.

| Value | | From |
|---|---|---|
| Band base | `y = 4.60` | top of the §2.1 shopfront recess — the tallest ground-floor feature |
| **Floor height** | **2.85** | free |
| Floors | `floor((facadeHeight − 4.60) ÷ 2.85)` → **3 west, 2 east** | the wall's own height |
| Band | west `y ∈ [4.60, 13.15]`, east `y ∈ [4.60, 10.30]` | the above |
| Bay | 8.00 wide × 8.55 tall, **6 per wall** | facades run `z ∈ [−24, +24]` = 48.0 |
| **Window pitch** | **1.60** → 5 per floor per bay | free |
| **Window** | **0.95 × 1.35** in a 1.60 × 2.85 cell | free |
| **Lit fraction** | **0.16** | free |
| **Lit colour** | **`rain` `#9FB4D6`** | must be cool — below |
| Unlit colour | `void` `#04060B` | the darkest token; a window is darker than its wall |
| Emissive | **0.55** | below the 0.90 bloom threshold — below |
| Panel offset | 0.004 in front of the wall face | §6.1's depth arithmetic, unchanged |

**Lit windows are cool, and that is a constraint rather than a taste.** §17: *three things are lit warmer than everything else and they are the only three things you can touch.* A hundred and fifty warm windows break that sentence outright. `rain` is the only cool unsaturated token in §4 not already spoken for by a light or a content surface.

**Emissive 0.55, under the knee.** §8.1's dimmest rung that still touches bloom is the station plate at 0.95, against a threshold of 0.90. Windows are the most numerous emissive thing in the world by an order of magnitude; put them anywhere on the bloom side and two 48 m walls flare brighter than the shopfront. 0.55 sits between the info panel backlight at 0.70 and the screenshot at 0 — lit, never flaring.

**They light nothing, and they do not reach the floor.** An emissive material in three.js illuminates nothing but itself, and §7's ten dynamic lights are all allocated with none spent here — so the windows never fall on the alley. §1's *every sign in the alley is in it, upside down and softer* does **not** extend to them either: measured on the built wall, a lit window leaves no trace in the reflection, and forcing the emissive to 12 — twenty-two times the shipped value — changes it no further. Between the §6 blur of 420 × 100 at `mixBlur` 0.85 and a source that starts 4.6 m up, nothing of this size survives the pass. This is stated because it is the tempting fix in the wrong direction: **a wall of windows can never be brightened into the floor**, and any attempt to get them there by climbing §8.1's ladder buys a blown facade and no reflection.

**Three variants, assigned by index, never randomised** — the §3.2 precedent for shutters, the §11.4 precedent for signage. Six bays per wall cycle A B C A B C. One texture set serves both walls: the east wall's two floors sample the bottom two thirds of the same image, so the height classes cost geometry, not memory.

| Texture | Desktop | Mobile |
|---|---|---|
| Bay canvas | 512 × 512 | 256 × 256 |
| Count | 3 | 3 |
| With mipmaps | 4.00 MB | 1.00 MB |

**512, not the §11.1 painter scale.** §11.1's 4 device-px per world cm is a signage figure; applied to an 8 m bay it asks for 3200 px and spends §15's whole 14 MB texture budget on one wall. 512 across 8.00 m is 64 px/m, and the closest a visitor gets to any window is about 4.5 m — from the walkable clamp the §12.2 pitch stop of 62° cannot reach the band base on the near wall at all, so that grid only opens up as you step away from it.

**No collision.** The bays sit flush on walls at `x = ±4.5` and §3's hard clamp already stops the eye at `±3.60`. Bounding boxes are for what protrudes into the alley — the §3.2 standpipes, crates and poles.

**West loses its warmth above 4.60.** One texture for both walls means one base colour, `facade` `#10141D`; the west wall's `facadeWarm` `#151119` stays on the box below the band and behind it. The two differ by about 1% of a channel, and the step falls at 4.6 m through fog.

### 3.4 Storefronts — the lower 4.00 m

The §3.2 inventory line, built out: **14 shuttered storefronts, 7 per wall, 3 shutter variants, solid.** This is the band the visitor actually walks past, and it gets the detail budget accordingly. Everything in it is boxes and cylinders — no sculpted geometry, no alpha maps.

| Value | | From |
|---|---|---|
| Band | `y ∈ [0, 4.00]`, both facades | the band base of §3.3 sits at 4.60, leaving 0.60 of bare spandrel between |
| Units | **14** — 7 per wall | §3.2 |
| **Widths** | **3.60 / 4.20 / 4.80 / 5.40 / 6.20**, five sizes | free |
| Plinth | 0.10 high × 0.20 deep, `concrete` | free |
| Aperture | full unit width less 0.30 each side, `y ∈ [0.10, 2.55]`, recessed **0.35** | free |
| Shutter | slats **0.09** pitch, instanced boxes — see below | free |
| Shutter roll | cylinder r 0.16, at the aperture head | free |
| Doorway | **0.90 × 2.05**, recessed **0.45**, at one end of the unit, side alternating | height from §2.1's door, which this is the ordinary version of |
| Sign box | **1.30 × 0.70** at `y = 2.85`, standing 0.14 proud, **centred over the doorway** | free |
| Fascia | `y ∈ [2.55, 4.00]`, flush | the remainder |
| **Awning** | 5 of 14, depth **1.25**, underside `y = 2.60`, front bar cylinder r 0.05 | clears the 2.55 head, stops under the 2.85 sign box |
| Service gap | **1.80**, one per wall | free |

**States: 9 closed, 3 ajar, 2 open.** Ajar is the shutter down to 0.62 with light under it, which is the shape a half-shut alley shop actually makes; open is the shutter rolled up to the head. Both ajar and open get a **spill plane** recessed in the aperture. Nine of fourteen shut, and nobody in any of them — §1 says nobody else is here, and the count is what keeps that true.

**Slats are geometry, not the §8 normal map.** §8 gives the roller shutter `normalRepeat` 24 × 1, and that value cannot survive this section: unit widths run 3.60 to 6.20, a material's repeat is shared across every instance using it, so one repeat across five widths puts the rib pitch anywhere from 0.15 to 0.26 m — a corrugation that visibly coarsens as you walk. Instanced slat boxes at a fixed **0.09** world pitch hold the same pitch on every unit and on every shutter height, and cost one draw call per variant. The `normalRepeat` figure stays in §8 for surfaces that are one size.

**Colour, and the §4 ratio.** Sign boxes carry the alley's accent, and the ratio in §4 is what assigns them: 55% magenta/pink, 30% sodium/lantern, 12% cyan, 3% blue. **It is measured over the seven *lit* boxes, not over all fourteen** — an unlit box carries no colour at all, so counting it would make the ratio describe something nobody can see. Seven gives **4 / 2 / 1 / 0**; blue rounds away, which is correct for one alley when §4 calls it *rare, distance signs only*. Within a bucket the two tokens alternate. Everything not a sign box or a spill is `shutter`, `concrete`, `metalDark` or `facade`.

**Two new rungs on §8.1**, both placed against §17's rule that the only three things lit warmer than the rest are the three you can touch:

| Element | Emissive | |
|---|---|---|
| Open-shutter spill | **1.10** | above the knee, so it glows — but under the paper lanterns at 1.30 and every content surface |
| Storefront sign box | **0.85** | under the 0.90 threshold. Fourteen of these; on the bloom side they would out-glow the shopfront |

**Seven sign boxes are lit** — the five non-closed units and two of the nine closed. An unlit box is `shutter` and not emissive at all, which is what a shut shop's sign looks like. A unit whose box is suppressed by a §3.5 neon sign is excluded before the seven are dealt, so the count survives the suppression.

**An emissive panel takes `void` as its diffuse colour and carries the accent only in the emissive term.** Putting the accent in both — the obvious way to write it — stacks a fully-lit diffuse surface underneath the glow, so the panel reads as coloured paint instead of as a light and arrives at roughly twice the intensity §8.1 specified. Nothing in the numbers shows this; it is only visible on the wall. It applies to every emissive surface in the world, not just these.

**The spill is a 0.55 band on the shop floor, not the whole opening.** Filling an open aperture makes a 2.55 × 2.30 slab of flat `sodium` — a billboard that beat every content surface in the alley before any of them had been built. Ajar shows nearly all of its 0.62 slot, which is the point of that state; open shows 0.55 of lit floor beneath 1.75 of dark interior, which is what a lit room behind a raised shutter looks like from the street.

**Layout is generated, not placed.** Three slots are reserved for the content surfaces and no unit may enter them: west `z ∈ [−6.60, −1.40]` for §2.1's shopfront, west `[12.90, 15.10]` for §2.3's payphone, east `[5.10, 6.90]` for §2.2's vending machine. What is left is five segments; the seven units per wall are apportioned across them by length (largest remainder), widths are drawn to fit with no two neighbours equal, and the slack is spread evenly as joints. One designated joint per wall widens to the 1.80 service gap.

**Each width aims at its fair share of what is left, not at the largest that fits, and this is not a detail.** Taking the largest feasible size is legal at every step and still wrong: one 6.20 early in a 14.30 m segment leaves nothing but the narrowest size for the two behind it, and the first generated wall came out **eight of fourteen at 3.60** with two adjacent pairs identical. Aiming at `remaining ÷ slots left` and taking a coin between the two nearest sizes spreads them across all five. Five sizes exist so the wall does not read as one shape repeated; a greedy pick defeats them while satisfying every constraint that was actually written down.

**Nothing here is reachable, and the boxes go on anyway.** The deepest solid part of a unit is the doorway jamb at 0.45 proud, putting its face at `x = ±4.05`; §12.4's 0.32 radius resolved against that stops the eye at `±3.73`, and §3's clamp has already stopped it at `±3.60`. The clamp wins by 0.13 m at the worst unit, so no storefront AABB can ever fire. They are registered regardless, because §12.4 asks for boxes on everything solid *as it is placed*, and the registry they go into is the one the vending machines, crates, bicycles and poles will actually need. The resolver is verified with a temporary box in mid-alley rather than by assertion.

**The awning is the one thing that does reach over the visitor**, at 1.25 deep — its outer edge at `x = ±3.25` overhangs the walkable band by 0.35 m. It gets no box: the underside is at 2.60 and the eye is at 1.68, so §12.4's 2D boxes are right to ignore it and a visitor walks under it as intended.

### 3.5 Neon signs and the overhead layer

Two more §3.2 lines built out: **9 decorative neon signs** and **34 overhead cable spans** with §3.1's three cross-alley banner wires. Between them they are most of what an alley like this is made of above eye level, and neither is solid.

**Signs project into the alley, they do not lie on the wall.** A flush panel is a poster; a sign that sticks out at 90° and reads from both directions is signage, and it is the difference between a wall with decals and a street. Every one of the nine is a double-sided box on a bracket.

| Value | | From |
|---|---|---|
| Count | **9** — 6 vertical, 3 horizontal | §3.2 |
| Vertical sign | 0.44 wide, **0.34** per character plus 0.22 of padding | free |
| Horizontal sign | 0.52 high, **0.40** per character plus 0.28 of padding | free |
| Panel | 0.09 thick, both faces carrying the same painted texture | free |
| Projection | face plane **0.55 – 1.15** from the wall, varied | must clear §3.4's frame — below |
| Bracket | 0.05 square, wall to panel, `metalDark` | free |
| Mount | base `y ∈ [2.90, 5.20]` | above §3.4's 2.55 aperture head, below §3.1's 6.50 cable band |
| Tube rim | **0.03** proud all round, `meshBasicMaterial` at full colour | §8's neon tube |
| Face emissive | **2.40** | §8.1, *vertical signs* |
| Strings | §11.4 **by index**, signs take 0–8 | §11.4 |
| Flicker | indices **3 and 7** | §11.3 |
| Colour | §4 ratio over 9 → **5 / 3 / 1 / 0** | §4 |

**A sign must project clear of the shopfront it is mounted on, and where it does, the lightbox under it goes.** Two rules, from one fault. §3.4's frame stands 0.35 proud and its sign box 0.14 further at 0.49, so a projection starting at 0.30 hangs the panel *inside* the fascia — the minimum is 0.55. That stops them intersecting but not stacking: a projecting sign and a flush lightbox on the same stretch of wall still read from the street as one cluttered object with a blank slab hung under it. So **a §3.4 sign box is suppressed wherever a §3.5 neon sign claims its span, plus 0.25 of clear air either side.** The sign wins because it carries a §11.4 string and the box carries nothing.

Five of the fourteen units lose their box this way. **The suppression is resolved before the lit boxes are dealt**, so a suppressed unit does not consume one of §3.4's seven — otherwise the alley quietly ships six while every count in this document still says seven.

**The §8 halo shell is not built, and bloom is why.** §8 gives the neon tube a 0.03 emissive shell at 0.6 to carry its glow. That shell exists to fake what a bloom pass does properly, and §9's bloom pass lands in the next step at threshold 0.90 — with the rim at full colour and the face at 2.40, both sit well over the knee and the glow is real rather than modelled. Building the shell as well would double the sign draw calls to blur something that is about to be blurred correctly. Revisit if bloom comes out too tight.

**Overhead: 34 spans, three of them carrying a banner.** Anchors between `y = 6.50` and `9.00` per §3.1, wall to wall, most of them crossing at an angle rather than square, radius **0.018** in `metalDark`. Each span is **three straight segments** approximating a catenary — a real curve here is a tube geometry per cable, and at 6.5 m up through fog at 0.03 density nobody can tell the difference between three segments and thirty. Sag **0.35 – 0.90**.

The three banner wires hang a **3.20 × 0.62** cloth 0.50 beneath them, carrying §11.4 strings **9, 10 and 11** — the signs already took 0 through 8, and §11.4 says by index. Banners are lit at **0.95**, the same rung as the station plate: they are read-through cloth, not tube.

**A banner is backlit; a sign is not.** §3.4's rule that an emissive panel takes `void` as its diffuse holds for the nine signs — a neon tube is a dark panel with lit strokes on it, and that is all it is. It does not hold for a banner, because **there is no light anywhere near `y = 6.90`**. §7's ten are all at 6.0 or below with finite distance, so cloth lit by the scene is cloth nobody can see: the first build hung three strings in mid-air with no banner under them, and switching the diffuse from `void` to `concrete` did not help, because nothing was illuminating either. A banner's *painted ground* therefore keeps **a sixteenth of its own colour**, carried through the same emissive map that lights the text. A backlit banner is a real object; this is the honest way to build one, rather than climbing §8.1's ladder to make an unlit surface visible.

**Nothing overhead and no sign is solid.** §3.2 marks both `no`, and the lowest sign face is at 2.90 against a 1.68 eye. No boxes are registered.

**This section puts the world over §15's texture budget, and the figure is measured, not estimated.** Nine signs and three banners come to 4.19 MB across twelve 128 × 512 canvases, and the world now holds **14.66 MB against the 14 MB** in §15 — 4.7% over, desktop only. Mobile is at 4.67 of 9 and comfortable.

| Consumer | Desktop |
|---|---|
| §6.2 puddle mask, 512 × 2048 | 5.59 MB |
| §3.3 window bays + §6.2 ripple normal, 4 × 512² | 5.59 MB |
| §3.5 signs and banners, 12 × 128 × 512 | 4.19 MB |

**Every lever here is a value in this document**, which is why it is not quietly fixed: dropping the sign canvases to 64 × 256 saves 3.1 MB and costs the legibility that makes a projecting sign worth projecting; halving the puddle mask saves 4.2 MB and is the §6 turn-down ladder, which exists for frame time rather than for memory. §16 item 6 is the same problem arriving much harder — the screenshots do not fit at all — so **the budget itself is what should be revisited, once.**

### 3.6 The cross street — what the bend opens onto

§16 item 2 held this open: *"what remains open is the modelled form — the shuttered doors, and whatever the opening reveals past it."* This section answers the second half. §3.1's return wall crosses the end at 20°, its west end against the west wall, and its east end lands at `x = 1.14`, `z = 22.47` — so it leaves a **3.36 m opening** between itself and the east facade. Past that opening is a road, and there is traffic on it.

**Traffic is not company.** §1 says nobody else is here and §3.4 keeps nine of fourteen shutters down to hold that. Cars do not break it, they sharpen it: the road is thirty metres away behind a wall, no vehicle stops, no occupant is visible, and nothing on the street can be walked to or clicked. The city goes on without you, which is a lonelier sentence than an empty road.

| Value | | From |
|---|---|---|
| Carriageway | `z ∈ [26.20, 31.60]`, **5.40** wide | clears §6.1's reflector edge at `z = 26` — below |
| Lanes | 2 × **2.70**, centres **27.55** (`+X`-bound) and **30.25** (`−X`-bound) | left-hand traffic — below |
| Near pavement | `y ∈ [0, 0.12]`, `z ∈ [24.60, 26.20]`, `x ∈ [−40, 1.20]` and `[4.60, 40]` | §3's kerb height; the break is the alley mouth |
| Far pavement | `y ∈ [0, 0.12]`, `z ∈ [31.60, 32.90]`, `x ∈ [−40, 40]` | the same |
| Centre line | `z = 28.90`, dash **2.00** / gap **3.00**, 0.12 wide, `y = 0.024` | the carriageway's middle |
| Far building | front face `z = 32.80`, 1.00 thick, **14.0** high, `x ∈ [−40, 40]` | §3's wall thickness; §3.1's end-wall rule |
| Far ground band | `y ∈ [0, 4.60]`, 0.10 proud, `shutter` | §3.3's band base, the same line |
| Far window bays | §3.3's bay verbatim — 8.00 × 8.55, 3 floors, **10 bays** | 80.0 ÷ 8.00 |
| Far side boards | **22**, three size classes cycling — 1.10 × 2.60, 0.80 × 1.60, 1.30 × 3.20 — 0.02 proud, flush, gain **1.25**, no gap over 2.90 | the sightline — below |
| **Ground plane** | **70 × 70**, was 60 × 60 | the opening reveals floor to `z = 32.9` — below |

**The alley mouth is a dropped kerb.** The near pavement stops at `x = 1.20` and picks up again at `x = 4.60`, so the alley floor runs unbroken into the carriageway. A kerb across the mouth would put a 12 cm step in the one part of this street the visitor can actually see the ground of, and it would read as a wall the alley had grown rather than as the place two roads meet.

**The ground plane grows, and it is the opening that grew it.** §3 sized it 60 × 60 for an alley closed at both ends, where the overscan only ever had to reach past a wall. The opening now shows floor out to the far pavement at `z = 32.90` and a 60 × 60 plane centred on the alley stops at 30. 70 × 70 covers it; the extra 5 m at the north end and at both sides is behind walls and is seen by nobody.

**The street starts past `z = 26`, and that is §6.1's edge, not a round number.** The reflector strip ends at `z = 26`, and everything past it is plain matte asphalt. While that boundary sits in the unlit alley mouth nothing shows it; put a headlight pool across it and it becomes a visible line where the road changes material. The carriageway therefore begins at 26.20 and the seam stays in the dark.

**The cross street is not reflective, and that is a decision rather than an omission.** Extending §6.1's strip to cover it would need it wider in `x` as well — the opening sees to `x ≈ −26` at grazing angles, against a strip that stops at `±6` — and §6.2's mask maps 1:1 onto the strip, so widening it stretches every puddle and the gutter bias with them. The alley keeps the mirror. The street gets what a road at 3am with no working streetlight actually has: **nothing lights it but the cars**, and the coloured pools they carry are the whole of its surface treatment.

**Left-hand traffic.** Japan drives on the left, so the `+X`-bound lane is the near one at `z = 27.55` and `−X`-bound is the far one at 30.25. From the alley, facing `+Z`, `+X` is to the left: near-lane cars cross the opening right to left, far-lane cars left to right, and they pass each other. Getting this backwards is invisible to most visitors and wrong to everyone who would notice.

**The far building closes the horizon, and it has to be lit from within to do it.** §1 and §3.1 allow no sky and no vanishing point; a road with an open far side would hand back both. But nothing in §7 reaches `z = 32.80` — the ten dynamic lights are all inside the alley with finite distance — so an unlit wall out there is a wall nobody can see, which is §3.5's banner problem at building scale. It therefore carries §3.3's window bays at §3.3's own rung, plus seven ground-floor panels. The bays cost **no texture memory at all**: they are the same three cached canvases the alley facades already painted.

| Vehicle | | |
|---|---|---|
| Count | **6** — 3 per lane | below |
| Variants | **3** — three glTF models from `public/` | §3.2's precedent, and §3.3's, and §3.4's |
| Track | `x ∈ [−120, +120]`, loop **240.0** | below |
| Speed | near lane **11.0 m/s**, far lane **9.0 m/s** | ≈ 40 and 32 km/h |
| Gaps, near lane | **72 / 95 / 73** = 240 | below — min clearance 67.0 m |
| Gaps, far lane | **88 / 66 / 86** = 240 | below — min clearance 61.0 m |
| Hold positions | near car 0 at `x = +2.60`, far car 0 at `x = +3.40` | §13 — below |

| Variant | Model in `public/` | Length | Measured W × H |
|---|---|---|---|
| `ae86` | Toyota AE86 | **4.18** | 1.82 × 1.30 |
| `rx7` | Mazda RX-7 | **4.30** | 1.79 × 1.27 |
| `rangeRover` | Range Rover | **4.97** | 1.93 × 2.23 |

**The cars are glTF models, and only two things about each is authored.** Which file it is, and how long it is in world metres. Width, height, wheelbase, ride height and every proportion are **measured from the model at load** — writing them down a second time is how a number in this document ends up quietly disagreeing with the mesh it claims to describe. The widths and heights above are recorded as *observations*, not as settings.

**`targetLength` is a normalisation, not a preference.** A glTF states no units, and everything in §3.6 is metres: lane centres 2.70 apart, gaps that must clear the longest car, lamps placed on a corner. A model arriving at a hundred times scale turns a 2.70 m lane into a car park. Each is scaled from its own measured length to the real car's, which puts all three on the same footing whatever they were exported in. **`yawOffset` is `+90°` for all three** — they are modelled nose-along-`−Z` and this world drives along `X`. There is nothing in a glTF that says which end of a car is the front, so it is looked at once and written down.

**Merged per material, and that is what makes real models affordable.** The three files carry **18, 34 and 5 primitives**; mounted as authored that is 57 draw calls for six vehicles against §15's mobile budget of 90 with 80 already spent. Baked to world space and merged by material they are **nine** — six, two and one — and each of those nine is one `InstancedMesh` carrying both copies of its car. Without the merge this section could not ship on a phone.

**Bounds are recomputed every frame, and that is not an optimisation but a correction.** Instance matrices are written with the vehicle at `x = 0` and then translated up to 120 m either way, so bounds computed at mount describe six cars stacked in the middle of the road and the street empties itself as you look at it. Turning culling *off* instead submits all **136 k triangles of car every frame**, including the ones behind the station wall. Recomputing the sphere from twelve instance matrices costs nothing and takes the peak to **110 k triangles and 45 draw calls** at the clamp, **80 calls at spawn**.

**The lamps are still built here, and they are the only part of a vehicle this world can really see.** None of the three models carries an emissive light — the RX-7 has a material named for one, the other two have nothing at all — and through 40 m of §5's fog a dark body is a silhouette while the lamps are the whole event. They are placed from each model's **measured box**: headlights at **0.45** of its height, tail lamps at **0.50**, so a hatchback and a Range Rover each carry them at their own height rather than at one authored number that suits neither. Sizes came down to 0.26 × 0.14 × 0.20 and 0.22 × 0.12 × 0.16, standing **0.01** proud: against modelled bodywork the box-era dimensions read as a white brick glued to the bumper.

**Nothing else is built.** No roof slab, no bumpers, no wheels, no cabin — the model brings all of it. **§8.1's taxi roof-sign rung is now carried by nothing**, because none of the three is a taxi; the rung stays on the ladder because it costs nothing to leave and inventing a roof light for a Range Rover would cost the world something.

**Two of each, and they are not retinted.** `instanceColor` applies to a whole instance, so tinting the paint would tint the glass and the tyres with it. Six cars from three models at 30 m through fog do not read as duplicates, and the alternative is a per-material carve-out for a problem nobody has yet.

**Uneven spacing, equal speed, and the second half is what makes the first half safe.** The gaps are drawn from no pattern and they sum to exactly the loop length, so the wrap point is a gap like any other and no car ever laps into the one ahead. Varying speed *within* a lane would look livelier for about a minute and then produce an overtake, and an overtake on a single-lane track is an overlap — the one thing this must not do. Between lanes the centres are 2.70 apart against a 1.93 widest vehicle, so the two directions clear each other by 0.77 m. The loop is 240 m against a widest sightline through the opening of about 32 m, so **every car appears and disappears far outside anything the visitor can see**, and the wrap is never witnessed.

**Three per lane is a 3am number.** The gaps put a car across the opening every 6.5 to 9.8 seconds per lane, four seconds or so across both. Denser reads as rush hour, and this world has already sent the last train home.

| Road glow | | |
|---|---|---|
| Underglow | `length × 1.45` by **2.30**, `y = 0.018`, opacity **0.70** | colour by §4's ratio over 6 → **3 / 2 / 1 / 0** |
| Headlight pool | **6.20** long × **2.60** wide, from the nose forward, `y = 0.016`, opacity **0.58** | `signWhite` |
| Tail smear | **2.40** × **2.00**, from the tail back, `y = 0.014`, opacity **0.38** | `lantern` |

**The far side is lit as §8's neon tube, and both it and the opacities above are set against §5's fog rather than against how they look up close.** This is the one thing about §3.6 that cannot be judged from the far end of the alley, which is where it is most tempting to judge it. Everything on this street arrives at the *middle* of the alley through 42 to 47 m of fog — **0.21 transmittance at the near lane, 0.14 at the far wall** — and the visitor who first meets it is standing there, not at the clamp. Values chosen to look correct at twelve metres left the whole street invisible at forty, which is where the opening is a dark slot in the wall and the only question it raises is whether anything was built at all.

**The boards are `meshBasicMaterial` — §8's neon tube — carrying a linear gain of 1.25 through `instanceColor`, which is a gain and not a fraction.** A basic material at colour tops out at white, and `FogExp2` mixes toward `fogColor`: at 0.14 transmittance the brightest board that material can hold still arrives as grey. **The ceiling was the problem, not the setting** — the far side kept vanishing from mid-alley however the fraction was tuned, and §3.5's own signs survive the same distance only because they are emissive *above* 1.0. `instanceColor` carries values over 1 perfectly well, which is what keeps twenty-two boards in twenty-two colours at one draw call.

**1.25 is a fit between two viewing distances and it cannot satisfy both.** The same board is seen at 0.88 transmittance from the clamp and 0.14 from mid-alley — a sixfold range no single value covers. Tuned for the far view at 1.80, the boards arrive at the clamp as pastel: ACES flattens them and they lose the colour that made them worth painting. **Re-check when §9's bloom exists**, since a surface over the 0.90 knee behaves differently once something blooms it, and this look is currently being judged without one.

**§17 is not at risk from it, and distance is why.** Six of the twenty-two are warm, and §17 reserves warmth for the three things you can touch. These are 30 m away, behind a 14 m wall, past §3's clamp, and cannot be walked to. Re-check that too when §2.1, §2.2 and §2.3 are lit, since none of the three exists yet to compare against.

**Three size classes cycle by index** — §3.3's and §3.4's precedent — because twenty-two identical rectangles at an even stride is not signage, it is a colour chart mounted on a wall.

**Twenty-two boards, and the count comes from the sightline.** The opening exposes only about **4.2 m of the far wall** from the middle of the alley, and *which* 4.2 m depends on where the visitor is standing — so a run spaced every five metres is a lit street from the clamp and bare wall from everywhere else. No gap in the run exceeds **2.90 m**: whatever the slot lands on, it lands on a sign. The same arithmetic is why the traffic is legible at all from spawn, where a single car crossing a 3.8 m window is the entire event.

**Twenty-two is also where §4's blue finally rounds in.** The ratio over 22 gives **12 / 6 / 3 / 1**, and the one blue board is on the most distant lit surface in the world — which is what §4 means by *rare, distance signs only*, arrived at by the ratio rather than by an exception made for it. Every count before this one (14 sign boxes, 9 signs, 7, 6) rounded it away.

**The light under the cars is painted, not lit, and §7 is why.** The hard cap is ten dynamic lights and all ten are spent inside the alley. Six cars with headlights, tail lamps and underglow would need eighteen more. They are alpha-blended quads on the road carrying a painted falloff, which is the same answer §3.3 gives for a hundred and fifty windows and §7 gives for every contact shadow in the world.

**Alpha-blended, never additive, and fog is the reason.** Additive is the obvious blend for a glow and it breaks under `FogExp2`: three mixes the fragment toward `fogColor` before blending, so at this distance an additive quad adds roughly seven tenths of `#0A0F1A` across its whole rectangle and the glow arrives inside a visible dark-blue box. Alpha blending fogs the colour and leaves the alpha alone, so the quad has no edges. On a road this dark the two look identical everywhere it matters.

**The centre line is painted at 0.22 of `signWhite` on a `meshBasicMaterial`**, above the glow quads at `y = 0.024`. A standard material out there is lit by a 0.35 hemisphere and nothing else, so a correctly-lit road marking is an invisible one; and drawn *under* the headlight pools it would be hidden exactly when a real one lights up. Painted, it is the brightest thing on the carriageway and it is what says *road* before any car arrives. Same trick as §8's neon tube, at a fifth of the value.

**Four rungs on §8.1**, all of them 30 m out through fog at ≈ 0.9 transmittance from the far end and 0.14 from spawn:

| Element | Emissive | |
|---|---|---|
| Vehicle headlight | **2.60** | yes — under the neon tubes at 3.20 |
| Vehicle tail lamp | **1.55** | yes — soft |
| Taxi roof sign | **1.20** | edge |
| Far ground panel | painted at 0.55 of the token, `meshBasicMaterial` | no — dimmed below the knee deliberately |

Headlights take **`signWhite`**, not `sodium`, and §17 decides it: *three things are lit warmer than everything else and they are the only three things you can touch*. Six pairs of warm headlights would be the fourth, fifth and sixth. `signWhite` is a white with a trace of pink in it and it stays out of that count.

**Not solid, and no boxes.** The whole street lies past `z = 24.60` against §3's clamp at `z ≤ 21.40`, behind a 14 m wall that spans the rest of the end. §12.4's registry gets nothing here; unlike §3.4's storefronts there is not even a boundary to be inert against.

**§13 — the traffic holds still.** Cars stop where they are, lights on, rather than slowing: a slower car reads as broken in the same way §13 says slower rain does. Peripheral motion glimpsed through a 3.36 m slot is close to the worst case reduced motion exists to remove, and nothing is lost by removing it, because there was never anything out there to reach. The hold positions above put one car in each lane inside the sightline from spawn, so what a reduced-motion visitor meets is stopped traffic rather than an empty road.

**Measured, and both numbers are worth keeping.** Desktop peaks at **84 draw calls** of §15's 140, looking down the alley from spawn with the whole world in frame. **Mobile peaks at 80 of 90**, and that is the number to watch: §3.2 still owes eleven inventory lines, §2 owes three content surfaces and §9 owes a post-processing chain, against ten calls of headroom. The street is not where that gets paid back — it is eight calls for the envelope and eleven for six vehicles, all of them instanced — but it is where the ceiling became visible.

**Nothing here is legible from spawn, and that is §5 rather than a fault in this section.** From the middle of the alley the carriageway is at **0.21 transmittance** and the far wall at **0.14**; from spawn the far wall is at **0.088**. The opening subtends about **4.6°** from there — roughly a sixtieth of the frame — and §7's lantern light at `z = +19` lays a saturated red pool directly beneath it. The street reads properly from about the last twelve metres of the alley and is a coloured glimmer before that. §3.1 already says the far end is *legible but never resolves*, and this is that sentence measured. **The only lever that would change it is §5's fog density**, which was derived twice and settled; §9's bloom will not do it either, since a fogged board lands well under the 0.90 knee.

**Texture cost: two painted alphas.** A 128 × 128 radial ellipse for the underglow and tail smear, and a 128 × 128 forward beam for the headlight pool — 64 × 64 on mobile. **0.17 MB desktop**, taking §3.5's measured 14.66 to **14.84 against §15's 14 MB**. The window bays and the panels add nothing. This does not change the answer in §3.5: the budget is what wants revisiting, and it wants revisiting once, with §16 items 1 and 6.

### 3.7 Street props — the band you walk through

The rest of the §3.2 inventory that stands on the ground: **5 dead vending machines, 4 scooters, 9 crate stacks, 2 cones and a barrier, 22 standpipes, 6 utility poles, 11 paper lanterns**, plus three things this section adds — **a food cart, 2 rubbish points and the guardrail across the alley mouth**.

§3.4 built the wall and §3.5 built everything above head height. This is the layer between them, and it is the only one the visitor can walk into. **Everything here is boxes and cylinders**, the §3.4 vocabulary, for the reason §3.4 gives: sculpted geometry in this alley would be one object at a fidelity nothing around it shares.

**Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against.

| Object | Count | Size (along alley × deep × high) | Solid |
|---|---|---|---|
| Dead vending machine | 5 | **1.12 × 0.82 × 1.94** — §2.2's body verbatim | yes |
| Food cart | 1 | **2.10 × 1.00 × 2.10** | yes |
| Scooter | 4 | **1.75 × 0.62 × 1.08**, leaning **8°** on a side stand | yes |
| Crate | 9 stacks of 2–4 | **0.52 × 0.36 × 0.31** each | yes |
| Traffic cone | 2 | base r **0.17**, top r **0.035**, **0.56** high, on a 0.36 foot | yes |
| Barrier | 1 | board **1.20 × 0.20** at `y ∈ [0.56, 0.76]`, legs splayed 10° | yes |
| Rubbish point | 2 | drum r **0.30** × **0.74** high, lid r 0.32, two sacks beside it | yes |
| Standpipe | 22 | r **0.055**, from `y = 0.10` to 2.60 or 4.00, two clamps each | 12 of them |
| Utility pole | 6 | r **0.11**, **8.40** high, crossarms at `y = 6.40` and `7.10` | yes |
| Paper lantern | 11 | shade r **0.135** × **0.36**, on a 0.34 bracket arm at `y = 3.46` | no |
| Mouth guardrail | 1 | 5 posts 0.07², two rails at `y = 0.84` and `0.52` | yes |

**The vending machines are §2.2's machine, unlit — and that is the whole point of them.** The bio station *is* a vending machine (§2), so five more of the same object is the strongest thing this world can do to make one of them mean something: the lit one is the only lit one in the alley, and it is the one you can open. They therefore take §2.2's body dimensions exactly rather than a size of their own, carry §2.2's 0.96 × 1.42 front panel as a `void` slab instead of a `vendGlow` one, and get no emissive term at all. §3.2 already said *unlit, dark*; this records why that line is load-bearing rather than a detail. **Lighting them is the single most tempting change in this section and it would cost the bio station its meaning.**

**Where things stand: 0.20 from the wall, which is the §3.4 plinth.** Wall props put their **back face at `|x| = 4.30`** — the wall plane at ±4.50 less the plinth's 0.20 depth — so nothing sits inside the storefront that is already there. What that means for the visitor is the interesting part: a 0.82-deep vending machine reaches `|x| = 3.48` and the food cart reaches `3.30`, both **inside §3's clamp at ±3.60**. See the collision note below.

**Utility poles stand at `|x| = 3.72`, on the gutter line, not against the wall.** §3.4's fascia projects 0.35 across the full width of every unit from `y = 2.55` up, so an 8.4 m pole anywhere behind `|x| = 4.15` is buried in the fascia for three quarters of its length. The gutter centre is the line §3 already draws down the alley, and a pole on it clears everything — at the cost of standing 0.11 m inside the walkable band, which is what a utility pole in a Tokyo alley actually does. **No pole stands in front of an awninged unit**: the awnings reach `|x| = 3.25` at `y ∈ [2.60, 2.67]`, so those five z spans are closed to poles on that wall.

**Standpipes run at `|x| = 4.09`, in front of the fascia rather than behind it**, for the same arithmetic one line up — 4.15 less the pipe radius. Their z positions are the §3.4 joints, which is where a downpipe between two buildings goes, and which are uneven for free because §3.4 generated them.

**Nothing is evenly spaced, and the positions are authored rather than generated.** §3.5's nine signs and §3.6's six vehicles set the precedent: a list this short is better read than run. The lists live in `lib/props.ts`, not here — this section gives the sizes, the counts and the rules, the way §3.5 gives them for the signs. What is *derived* is the standpipe and lantern anchors, which come off §3.4's generated joints.

**One thing lights up, and it is not on the ladder twice.** The food cart's canopy is lit from underneath at **`sodium`, emissive 1.10** — §8.1's open-shutter rung, reused rather than extended, because it is the same phenomenon: warm light falling out of a place with nobody in it. The paper lanterns take their existing **1.30**. Nothing else here is emissive. The cones' bands, the vending fronts and the guardrail are lit by §7 or they are not lit at all, which at 3am is the honest answer for all three.

**§17 survives the food cart, and the lanterns are the proof.** *Three things are lit warmer than everything else and they are the only three things you can touch.* Eleven paper lanterns at 1.30 already sit **above** the cart's 1.10 and were always in §3.2 — if eleven of those do not break the sentence, one cart does not. It also carries **no dynamic light**: §7's cap of ten is fully spent, and what actually makes the three content surfaces dominant is that each has a light of its own (§7 #2, #4, #5). An emissive material illuminates nothing but itself. The cart sits on the east wall at the far end, past the payphone, so it is the last thing before the bend and the first warm thing that is not a destination.

**Collision — these are the first boxes in this world that can actually fire.** §3.4 registered fourteen units' worth of AABBs and said outright that every one of them is inert, because the deepest storefront part stops at `|x| = 4.05` and §3's clamp has already stopped the eye at ±3.60. That changes here. A vending machine's front face at 3.48 resolves the eye to **3.16**, the food cart's at 3.30 resolves it to **2.98**, and the cones and the barrier stand in open alley at `x ≈ −1` where there is no clamp at all. **§12.4's resolver has been shipped and never tested against anything; this is the section that tests it**, and it is verified by walking into each of them rather than by assertion.

**The guardrail is a visible reason for a stop that already happens, not a new barrier.** §3.6 settled that the cross street is unreachable — the clamp stops the eye at `z = +21.40` against a carriageway starting at 26.20 — but from inside the alley that stop has no cause you can see, and an invisible wall reads as a bug in a world whose whole premise is that you may walk to the end of it. The rail spans the §3.1 opening, `x ∈ [0.90, 4.15]` — stopping on §3.4's frame face rather than on the wall behind it — at **`z = 21.755`**, which is not a round number and is not free. Half a 0.07 post puts its near face at **21.72**; less §12.4's 0.32 radius, the resolver's stop is **21.40**, which is §3's clamp exactly. The clamp is therefore what fires and the rail is exactly where it fires — the visitor stops with the rail at arm's length and nothing about the stop is unexplained.

**It is a pedestrian railing and not a solid panel, and §3.6 is why.** That section spent its whole budget on a 3.36 m slot: 22 far-side boards spaced against a 4.2 m sightline, six vehicles on a 240 m loop timed to cross it. Closing the slot with a hoarding would delete all of it. Two horizontal rails on five posts stop the visitor, say *road*, and leave the traffic visible through them.

**A kerbside guardrail at `z = 26.20` was considered and rejected.** It is where a real one goes, and it is 4.8 m past a clamp nobody can reach — scenery answering a question the visitor has already stopped asking. The rail belongs where the stop is.

**Contact-AO decals, at last.** §7 asks for a painted radial decal — `void`, opacity 0.55, 1.4 × 1.4 — *under every solid object*, and nothing in the world has had one. Free-standing props on §6's reflector are where their absence finally shows: a crate stack on a mirror with no contact darkening reads as pasted on. They go under every prop here, at `y = 0.010` — above §6.1's strip at 0.004 and below §3.6's road glow at 0.014 — at **each prop's own footprint × 1.55**, since §7 gives one size for objects that are not one size and 1.4 m of shadow under a 0.36 m cone is a stain rather than a contact. The multiplier lands a vending machine on §7's own figure and scales the rest off it. **The texture is free**: §3.6's painted radial pool alpha is already in memory and is exactly a radial falloff. §3.4's fourteen storefronts still owe theirs.

**Drawn by material, not by object — twelve draw calls for sixty-four props.** Every part is bucketed on `(geometry, material)`, so a crate, a scooter cowl and a vending machine body are one `InstancedMesh` because they are the same box in the same dark. Drawn per object this section alone would be sixty-four calls. Two hundred and twenty-five parts, twelve buckets, plus one instanced pass for the decals.

| Measured | | |
|---|---|---|
| Desktop peak | **99** of §15's 140 | at spawn, whole alley in frame |
| **Mobile peak** | **93 of 90** | at spawn, and identical from the north clamp |
| Triangles | 117 k desktop / 54 k mobile | of 350 k / 220 k — not close |
| Collision boxes | 43, of which **30 can fire** | see below |

**§15's mobile draw-call budget is now exceeded, and this is the section that crossed it.** §3.6 measured 80 of 90 and named the ceiling as the number to watch; §3.7 costs thirteen and lands at **93**. Everything about the props is already instanced, so the ladder's *instance harder before deleting anything* has been spent. **The lever that remains is merging by material rather than by (geometry, material)** — folding `box + cylinder` of one surface into a single merged geometry takes the twelve buckets to eight and the peak to **89**. It costs nothing visually and it is the same technique §3.6 used for the vehicles.

It is not applied here, for one reason: it buys four calls, and §2 still owes three content surfaces and §9 owes a post-processing chain. **89 of 90 is not headroom, it is the same problem one section later.** The real question is whether 90 was ever the right number for a world with this much in it, and that is a §15 decision rather than a §3.7 one. Recorded, measured, and left where it belongs.

**Nothing here moves, so §13 has nothing to turn off.** Every prop is static geometry written once at mount. Reduced motion is satisfied by construction rather than by a branch, which is worth stating because it is the only section so far where that is true.

**Deliberately not built here.** The remaining §3.2 lines belong to other passes and are not smuggled in: air-con condensers want §8's alpha-mapped grille and a texture budget that is already over (§16.5); the steam-vent grates are pointless without §10's sprites; the puddle decals and ripple emitters are §6 and §10's ground work. **The cart has no noren** — a red fabric strip would be one box in one colour nothing else here uses, which is a whole draw call for a detail, and it comes back the moment something else wants that material.

**The rail cannot be seen from the exact point it stops you, and that is a property of railings.** At the clamp the visitor's eye is 1.68 m up and 0.32 m from a rail 0.89 m tall, which is 68° below horizontal against §12.2's pitch stop of 62°. It is fully legible on approach — posts and both rails silhouetted against the lit carriageway, with §3.6's traffic still visible through them — and it drops below the view in the last half-metre, exactly as a waist-height barrier does when you walk up to one.

---

## 4. Palette

Every colour in the world comes from this table. Nothing else.

| Token | Hex | Used for |
|---|---|---|
| `void` | `#04060B` | scene background, deepest shadow |
| `asphalt` | `#0A0E15` | dry road base |
| `asphaltWet` | `#070A11` | wet road base |
| `facade` | `#10141D` | building walls |
| `facadeWarm` | `#151119` | west facade, faintly warmer |
| `shutter` | `#161B24` | roller shutters |
| `concrete` | `#1A1F28` | kerbs, plinths, poles |
| `metalDark` | `#1E242E` | brackets, condensers, railings |
| `neonMagenta` | `#FF2E6A` | primary neon, the alley's signature |
| `neonPink` | `#FF6FA5` | secondary neon, softer signs |
| `neonCyan` | `#3BD9FF` | counter-accent, awning underside |
| `neonBlue` | `#2A6BFF` | rare, distance signs only |
| `sodium` | `#FFA23D` | street lamp, convenience-store spill |
| `sodiumDeep` | `#FF7A1A` | sodium at range, through fog |
| `lantern` | `#E8283F` | paper lanterns |
| `vendGlow` | `#FFD9A0` | vending machine front panel |
| `phoneGreen` | `#2FE08A` | payphone lamp |
| `signWhite` | `#FFF0F5` | lightbox surround, station plate |
| `rain` | `#9FB4D6` | rain streaks |
| `fogColor` | `#0A0F1A` | fog |
| `uiInk` | `#E8ECF4` | 2D overlay text |
| `uiDim` | `#7C879B` | 2D overlay secondary text |

**Neon ratio across the alley — hold this, it is what makes it read as Tokyo and not as a generic cyberpunk street:** magenta/pink **55%**, sodium/lantern **30%**, cyan **12%**, blue **3%**. Warm outnumbers cool. Cyan is a spice.

---

## 5. Atmosphere

| Value | Setting |
|---|---|
| Fog | `FogExp2`, colour `fogColor` `#0A0F1A`, **density `0.0300`** |
| Fog check | ~0.62 transmittance at 23 m, ~0.24 at 40 m — the far end is legible but never resolves |

**On the density.** This read `0.032` until the shell was built and the check was actually run. three's `FogExp2` is `transmittance = exp(-(density · depth)²)`, which puts `0.032` at **0.582 at 23 m and 0.194 at 40 m** — denser than this document's own check in both places. Solving the check backwards gives `0.03006` from the 23 m figure and `0.02987` from the 40 m figure, independently. Two figures agreeing to three decimal places are the intent; the density was the typo. **`0.0300`.**
| Background | flat `void` `#04060B`, no skybox, no HDRI file |
| Tone mapping | `ACESFilmicToneMapping`, **exposure `1.05`** |
| Colour space | `SRGBColorSpace` output, `ColorManagement.enabled = true` |
| Environment | drei `<Environment>` built from **Lightformers only** (no downloaded HDRI), `resolution: 128`, `frames: 1` — baked once at mount |

### 5.1 Environment lightformers

These exist to feed the wet-ground reflections and the metal, not to light the scene directly.

| # | Form | Size | Position | Colour | Intensity |
|---|---|---|---|---|---|
| 1 | rect | 4 × 10 | `(-6, 5, -4)` | `neonMagenta` | 2.4 |
| 2 | rect | 4 × 10 | `(6, 5, 8)` | `sodium` | 1.8 |
| 3 | rect | 3 × 8 | `(-6, 4, 14)` | `neonCyan` | 1.2 |
| 4 | rect | 12 × 2 | `(0, 11, 0)` | `void` | 0.4 |
| 5 | ring | 6 | `(0, 3, 22)` | `lantern` | 0.9 |

---

## 6. Wetness and reflection — the single most important surface

The ground is the picture. Budget for it first, cut it last.

| Value | Desktop | Mobile |
|---|---|---|
| Reflector resolution | **1024** | **512** |
| `blur` | `[420, 100]` | `[240, 60]` |
| `mixBlur` | 0.85 | 0.95 |
| `mixStrength` | **8.0** | 6.5 |
| `mixContrast` | 1.20 | 1.20 |
| `depthScale` | 1.10 | 1.10 |
| `minDepthThreshold` | 0.40 | 0.40 |
| `maxDepthThreshold` | 1.25 | 1.25 |
| `depthToBlurRatioBias` | 0.28 | 0.28 |
| `distortion` | **0.28** | 0.18 |
| `mirror` | 0.0 | 0.0 |
| `reflectorOffset` | **0.0** | 0.0 |
| `roughness` (base) | 0.18 | 0.22 |
| `metalness` | 0.0 | 0.0 |

`reflectorOffset` is `0` deliberately. It exists to push the reflection plane off the geometry when the reflective surface sits above what it is drawn on — a pool with real depth. A rain film has no thickness worth modelling, and the puddle mask already carries where the water is. Anything non-zero floats the neon off the road.

### 6.1 Reflector strip geometry

The ground is two surfaces, not one.

| | Value |
|---|---|
| Base plane | **70 × 70** at `y = 0`, plain material in `asphalt`, overscan hidden by fog (§3) — and, past the bend, carrying §3.6's cross street |
| **Reflector strip** | **12 × 52** — `x ∈ [-6, 6]`, `z ∈ [-26, 26]` — at **`y = 0.004`** |

**Reflections render at half the ground width only**; beyond `x = ±6` the fog has it anyway. Neither seam is ever in frame: the walls at `x = ±4.5` stand 1.5 m inside the x-edge, and the z-edge sits 3 m behind each end wall.

**The 4 mm lift is depth-buffer arithmetic, not a look choice.** At the §12.1 near/far of `0.10` / `90.0`, depth precision at the far end of the alley is around a millimetre — the conventional 1 mm separation z-fights at 40 m, exactly where nobody thinks to look for it. 4 mm clears it and stays an order of magnitude under the gutter's own 0.03 depth, so nothing about it is visible.

### 6.2 The two ground maps

- **Roughness map** — a puddle mask, generated once to a canvas: values `0.06` inside puddles, `0.55` on dry patches, blurred 14 px at the boundary. Same mask drives `distortionMap`.

  **Coverage is ~60% wet.** §1 says the asphalt is a mirror and this is that sentence taken at its word: water is the ground and the dry patches are broken islands within it. Puddles are unions of 3–6 overlapping ellipses, 0.8–4.5 m on the major axis, biased toward the alley centre and toward the gutter lines at `x = ±3.72`, thinning against the kerb faces — where water actually goes.

  | Mask value | Desktop | Mobile |
  |---|---|---|
  | Canvas size | 512 × 2048 | 256 × 1024 |
  | Boundary blur | 14 px | 7 px |

  The mask maps 1:1 onto the reflector strip — no UV repeat — so puddles are anchored to world positions and stay put as the visitor walks. **The blur scales with the canvas** because 14 px is a value in the desktop map's pixel space; held at 14 on a half-size map it would double the physical softness of every puddle edge. Both sizes put the transition at about a third of a metre.

  **Coverage is measured across the alley only, `x ∈ [-4.5, 4.5]`.** The strip runs 1.5 m past the walls on each side so its seam is never in frame (§6.1), but that margin is hidden geometry. Measuring across the full 12 m counts floor nobody can see, and the generator compensates by flooding the part they can — in practice driving the centre of the alley to 99% wet, one unbroken mirror with the dry islands pushed out under the walls, while the global figure still read 60%.

  **The placement weight needs a non-zero baseline** for the same reason: a weight that falls to nothing between the centre and the gutter bumps concentrates water into bands and saturates them, rather than biasing a floor that is wet throughout. Bias, not concentration.

- **Normal map** — a tiling ripple, `normalScale = [0.15, 0.15]`, UV repeat 8, scrolling `+0.012 u/s` in `z`. Scroll off under reduced motion; the map itself stays.

  **It runs across the whole floor, not only the strip.** The base plane carries the same map, and it has to: §3.6 put a road 6 m past the reflector's edge, and a mirror-smooth carriageway beside a rippled alley is the seam that shows. What the base plane gains is the *surface*, not the reflection — it is still a plain material, and §6.1's turn-down ladder is untouched.

  **The two agree on world tile size, not on repeat count**, and this is the trap in it. `uvRepeat` 8 lands on a 12 × 52 strip, which is **1.5 m per tile across and 6.5 m along** — the map is already anisotropic where it started. Copying the *number* 8 onto a 70 × 70 plane puts 8.75 m tiles beside 1.5 m ones and draws a visible line down the edge of the reflector; copying the *metres* makes the boundary disappear. The base plane therefore reads `groundSize ÷ tile` on each axis, and its scroll offset is set equal to the strip's rather than advanced on its own — same tile size, same offset, same world speed, and no drift over the minutes a visitor might stand still.

  **One texture on the GPU, not two.** The base plane's map is a `Texture.clone()` of the strip's: a clone keeps the same `Source`, and three caches uploads per source, so two repeats cost one image. §15's texture budget does not move.

  **Fine isotropic stipple**, no direction. 512², a height field summed from ~140 Gaussian dimples of 6–22 px radius wrapped toroidally so it tiles seamlessly, plus one faint low-frequency wave so the eye does not find the grid, then Sobel to normals. At repeat 8 across the 12 m strip each tile is 1.5 m, putting the dimples at 2–7 cm — raindrop scale. The §10 ripple emitters own the expanding rings; this is only the resting texture beneath them, and a second directional cue on top of the scroll would read as a texture sliding rather than water sitting.

  **Height-to-normal slope: 1.1.** This is the map's own strength, before `normalScale` scales it, and it matters more than it looks like it should. At the grazing angles a 1.68 m eye height gives across a 46 m alley, a small normal perturbation swings the reflected ray a long way, so this value decides how far a reflection breaks up. Authored at 2.4 it shredded every reflection edge into long torn slivers; 1.1 keeps the break-up at the scale of rain on a film of water, which is the wet-pavement look §1 is describing. Neon on wet asphalt genuinely does shatter — the dial sets how much.

Both maps are deterministic — no `Math.random()`, identical on every load.

**Turn-down order under budget pressure:** resolution 1024 → 512 → 256, then `blur` halves, then `distortion` → 0, then the reflector becomes a plain rough material with the env map. Never delete the puddles.

---

## 7. Lights

There is no sun at 3am. **No `directionalLight` anywhere. Shadow maps are off** (`shadows={false}`) — grounding comes from the reflections and from painted contact-AO decals (radial gradient, `#04060B`, opacity 0.55, 1.4 × 1.4) under every solid object.

**Hard cap: 10 dynamic lights.** Everything else is emissive material feeding bloom and the env map.

| # | Type | Colour | Intensity | Position | Distance / decay |
|---|---|---|---|---|---|
| 1 | `hemisphereLight` | sky `#121A2B` / ground `#060A10` | **0.35** | — | — |
| 2 | `rectAreaLight` 3.2 × 1.7 | `signWhite` | **4.0** | `(-4.28, 1.87, -4.0)` facing `+X` | — |
| 3 | `pointLight` | `neonMagenta` | **6.0** | `(-3.90, 6.0, -4.0)` | 9.0 / 2 |
| 4 | `rectAreaLight` 0.96 × 1.42 | `vendGlow` | **5.0** | `(+3.98, 1.15, 6.0)` facing `-X` | — |
| 5 | `pointLight` | `phoneGreen` | **2.5** | `(-4.00, 1.60, 14.0)` | 5.0 / 2 |
| 6 | `pointLight` | `sodium` | **3.4** | `(+3.4, 4.6, -14.0)` | 12.0 / 2 |
| 7 | `pointLight` | `neonMagenta` | **3.0** | `(-3.4, 4.2, +2.0)` | 11.0 / 2 |
| 8 | `pointLight` | `neonCyan` | **2.2** | `(+3.4, 4.4, +11.0)` | 10.0 / 2 |
| 9 | `pointLight` | `lantern` | **2.6** | `(-3.4, 3.4, +19.0)` | 9.0 / 2 |
| 10 | `pointLight` | `sodium` | **1.8** | `(0, 3.0, -21.5)` | 8.0 / 2 |

Mobile drops lights **8, 9, 10** and halves the intensity of 6 and 7 — their contribution is carried by the emissive materials and the env map.

---

## 8. Materials

| Surface | Roughness | Metalness | Notes |
|---|---|---|---|
| Wet asphalt | see §6 | 0.0 | reflector material |
| Kerb / concrete | 0.72 | 0.0 | `envMapIntensity` 0.6 |
| Facade | 0.85 | 0.0 | tiling grime map, `envMapIntensity` 0.4 |
| Roller shutter | 0.55 | 0.35 | corrugated normal, repeat 24 × 1 |
| Painted metal (poles, brackets) | 0.62 | 0.55 | `envMapIntensity` 1.0 |
| Condenser grille | 0.68 | 0.70 | alpha-mapped grille, no geometry |
| **Glass** (shopfront, payphone) | 0.08 | 0.0 | `transparent`, `opacity 0.22`, **no `transmission`** — transmission costs a render pass per frame and buys nothing at this exposure |
| Noren fabric | 0.92 | 0.0 | `side: DoubleSide`, no transmission |
| Paper lantern | 0.90 | 0.0 | emissive `lantern` @ 1.30, `side: DoubleSide` |
| Neon tube | 0.30 | 0.0 | `meshBasicMaterial`, colour at full, plus a 0.03 emissive halo shell at 0.6 |
| Screenshot plane | — | — | `meshBasicMaterial`, tint `#A6B2C6`, **no emissive** |

### 8.1 Emissive intensity ladder

Bloom's threshold is `0.90`. This ladder is what sits either side of it.

| Element | Emissive intensity | Above threshold? |
|---|---|---|
| Neon tubes | **3.20** | yes — full bloom |
| **Vehicle headlight** (§3.6) | **2.60** | yes |
| Vertical signs | **2.40** | yes |
| Selection buttons | 2.10 | yes |
| Payphone lamp | 1.90 | yes |
| Vending front panel | **1.60** | just — soft halo |
| **Vehicle tail lamp** (§3.6) | **1.55** | yes — soft |
| Lightbox surround strip | 1.40 | just |
| Paper lanterns | 1.30 | edge |
| **Taxi roof sign** (§3.6) | **1.20** | edge |
| **Open-shutter spill** (§3.4) | **1.10** | yes — soft |
| Station `終電` plate | 0.95 | edge, deliberately |
| **Storefront sign box** (§3.4) | **0.85** | no — fourteen of them |
| Info panel backlight | 0.70 | no |
| **Project screenshot** | **0 (basic, tinted 0.68)** | **no — never** |

---

## 9. Post-processing

`@react-three/postprocessing`, in this order:

| # | Effect | Values | Mobile |
|---|---|---|---|
| 1 | **Bloom** | `intensity 0.90`, `luminanceThreshold 0.90`, `luminanceSmoothing 0.28`, `mipmapBlur true`, `radius 0.72` | `intensity 0.80`, `resolutionScale 0.5` |
| 2 | **ChromaticAberration** | `offset [0.0006, 0.0009]`, `radialModulation true`, `modulationOffset 0.35` | **off** |
| 3 | **Noise** | `opacity 0.05`, `premultiply false` | **off** |
| 4 | **Vignette** | `offset 0.28`, `darkness 0.85` | same |

- Canvas: `gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, depth: true }}` on desktop; `antialias: false` on mobile. **No SMAA pass** — it is not worth a full-screen pass here.
- Under `prefers-reduced-motion`: effects **2 and 3 come off**; bloom and vignette stay (they are static, not motion).

---

## 10. Rain, ripples, steam

The rain has *just* stopped being heavy — it is thinning, not pouring. If it reads as a storm, it is too dense.

| Layer | Desktop | Mobile |
|---|---|---|
| Near rain points | **1400** in a 14 × 12 × 14 box that follows the camera | 700 |
| Far rain points | **2600** in a 30 × 14 × 46 static box | 1000 |
| Point size | 0.06 near / 0.04 far, painted streak texture 8 × 64 | same |
| Fall speed | **9.0 m/s**, wind drift `+0.6 m/s` in `x` | same |
| Colour / opacity | `rain` `#9FB4D6`, opacity **0.35** near / 0.22 far, **not additive** | 0.28 / 0.18 |
| Ripple emitters | **12**, radial shader on 0.9 dia decals, one ring per 1.8 s, 1.4 s life | 6 |
| Steam vents | **3**, 24 instanced billboards each, opacity 0.08, rise 0.35 m/s | 2 vents, 12 sprites |

Rain and steam are **one instanced draw call per layer**. Positions update in a hoisted `Float32Array` inside `useFrame` — no allocation, no `setState`.

---

## 11. Text, signage and painted textures

**All text in the 3D world is a canvas texture.** No `Text3D`, no troika, no font file shipped for the world. The 2D overlays use the DOM.

### 11.1 Canvas painter settings

| Setting | Value |
|---|---|
| Canvas scale | 4 device px per world cm, power-of-two padded, max 1024 |
| Latin face | `ui-monospace, "SF Mono", "JetBrains Mono", monospace` |
| Japanese face | `"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif` |
| Filtering | `anisotropy 8` desktop / 4 mobile, `generateMipmaps: true`, `LinearMipmapLinearFilter` |
| Colour space | `SRGBColorSpace` |
| Redraw | Once on mount, and once per project change. **Never per frame.** |

### 11.2 Type sizes on the content surfaces

| Where | Height in world | Tracking |
|---|---|---|
| Neon sign — project name | 0.26 cap height, vertical stack | +0.08 em |
| Info panel — description | 0.045 | +0.02 em |
| Info panel — tech list | 0.032, `uiDim` | +0.10 em, uppercase |
| Door plate — "OPEN" / "GITHUB" | 0.038 | +0.14 em |
| Station plate — `終電` | 0.55 | — |

### 11.3 Neon flicker

Applied to the shopfront sign only, and to two decorative signs (indices 3 and 7). A fixed, hand-authored sequence — not random per frame, so it is identical every run and cannot be accused of being noise:

`[1, 1, 0.2, 1, 0.05, 0.9, 1, 1, 1, 0.4, 1]` at 22 ms per step, then a **6.5 s** steady hold, then repeat. Reduced motion: constant 1.

### 11.4 Decorative signage — the fixed list

The only strings permitted in the surroundings. Assigned to signs by index, never randomised, never project-related:

`居酒屋` · `ラーメン` · `営業中` · `カラオケ` · `24H` · `喫茶` · `酒` · `定食` · `深夜` · `お好み焼` · `コインランドリー` · `自動販売機` · `禁煙` · `終電`

Any string not on this list and not from `CONTENT.md` does not go in the world.

---

## 12. Navigation

### 12.1 Camera

| Value | Setting |
|---|---|
| **Eye height** | **1.68** |
| FOV | **62°** landscape / **70°** portrait |
| Near / far | 0.10 / 90.0 |
| Spawn | position `(0, 1.68, -19.5)`, yaw `0` (facing `+Z`), pitch `-4°` |

**This document's yaw is not three's, and the difference is exactly π.** Yaw `0` here faces `+Z`; a three.js camera at `rotation.y = 0` looks down `−Z`. For a world yaw ψ, three's rotation is **ψ + π**, giving a view direction of `(sin ψ, 0, cos ψ)`. Checked against the §12.6 stops rather than taken on trust: ψ = 0° → `+Z`, the alley ahead at spawn; ψ = −90° → `−X`, the west wall, where the shopfront and payphone are; ψ = +90° → `+X`, the east wall and the vending machine. All three agree. **Convert once, at the point a camera is posed** — never by sprinkling `+ Math.PI` through the navigation code, where one missing conversion faces the visitor at a wall for reasons that look like a layout bug.

**Rotation order is `YXZ`.** Under three's default `XYZ`, pitching rolls the horizon as you turn. `YXZ` is what keeps yaw and pitch independent, and it must be set *before* the rotation values or the same three numbers describe a different orientation.

### 12.2 Looking — drag-to-look, one model on desktop and touch

**No `PointerLockControls`.** Pointer events on the canvas, yaw and pitch held on refs.

| Value | Setting |
|---|---|
| Sensitivity | **0.0022 rad/px** desktop, **0.0032 rad/px** touch |
| Pitch clamp | **±62°** |
| Yaw | unlimited |
| Smoothing | framerate-independent: `α = 1 - exp(-18 * delta)` |
| Invert Y | no |
| **Click guard** | a pointer that travelled **> 6 px** between down and up is a look, not a click — interactive objects ignore it |
| **Gate** | **looking runs only while `canControl(state)`, exactly as movement does** |

**Looking is gated too, and §12.3's gate is not the whole rule.** An overlay covers the screen; a drag across it must not spin the world behind it, and `Escape` returning the visitor to a heading they did not choose reads as a bug in the overlay rather than in the camera.

**One pointer stream per element, tracked by `pointerId` and held with `setPointerCapture`.** The stick is a sibling of the canvas, not a child, so a thumb on the stick never reaches the look listener — which is what lets a left thumb steer while a right thumb looks. Capture is also what keeps a drag alive once it leaves the window, instead of the camera stopping mid-turn.

### 12.3 Walking

| Value | Setting |
|---|---|
| Speed | **2.6 m/s** — one speed, no run. It is 3am and you are tired. |
| Acceleration | 12.0 m/s² |
| Damping | 10.0 /s |
| Input | `WASD` + arrows (desktop), on-screen stick (touch, bottom-left, 128 px, dead zone 0.12, **24 px from the corner plus `env(safe-area-inset-*)`**) — **both feed one intent vector** |
| Movement basis | camera yaw only, flattened to the ground plane |
| Head bob | amplitude **0.022**, frequency **1.9 Hz** at full speed, scaled by speed. Off under reduced motion. |
| Gate | movement runs only while `canControl(state)` — no exceptions |

**Acceleration applies only while there is input; damping only while there is none.** Applied together they are a first-order system whose terminal speed is `acceleration ÷ damping` — 12 ÷ 10 = **1.2 m/s**, less than half the 2.6 this same table states. Splitting them is what makes 2.6 the speed the visitor actually reaches: 0.22 s to get there, about 0.3 s to come to rest. Acceleration is applied toward the desired *velocity vector* rather than along the input direction, so turning while walking redirects instead of adding.

**The two paths converge before anything reads them.** Keyboard keys produce a raw vector normalised to length 1, so `W+D` is not 1.41× faster than `W`; the stick produces an analog vector with the dead zone remapped so its edge is 0 and the ring edge is 1. The two are **summed and then clamped to the unit disc** — not maxed — which is the only rule that keeps a half-pushed stick at half speed while holding `W` and pushing the stick forward still gives 1, not 2. Neither path may pass through React state: a `pointermove` at 120 Hz through a store re-renders the tree faster than the world draws, and the symptom looks like the ground's fault.

**Arrow keys strafe; they do not turn.** They sit in the same intent vector as `WASD` and the basis is camera yaw, so a turning binding would need a second basis this document does not describe.

**The key set clears on `blur` and on `visibilitychange`.** A `keyup` delivered to a hidden tab is never delivered at all, and the visitor returns to find themselves walking into a wall with nothing held down.

**The stick's inset.** 128 px and a 0.12 dead zone are given above; the inset is not. 24 px plus `env(safe-area-inset-*)`, because on a notched phone the home indicator otherwise sits directly under the thumb.

### 12.4 Collision

- Axis-aligned bounding boxes on everything marked solid in §3.2, added as objects are placed.
- Player radius **0.32**, resolved per axis (slide, don't stop).
- **Plus the hard clamp** from §3: `x ∈ [-3.60, 3.60]`, `z ∈ [-21.0, +21.4]`. Boxes leak at corners; the clamp cannot.
- No physics engine. A capsule and a clamp.

### 12.5 The interact manager

One owner of the key. Stations register `{ position, radius, open() }` on mount; a single manager finds the **nearest registered station in range** and opens it. Edge-triggered on `keydown`. **No station listens for the key itself.**

| Station | Radius | Prompt |
|---|---|---|
| Shopfront | 3.00 | `E — view project` / tap |
| Vending machine | 2.20 | `E — about` / tap |
| Payphone | 2.00 | `E — contact` / tap |

Prompt fades in over 180 ms at the radius edge. `Escape` closes whatever is open, and **nothing else claims `Escape`**.

### 12.6 The guided path

For a visitor who does not want to walk. Reuses the locked-view camera (target pose, ease, release) — keep that general.

| Stop | Camera position | Yaw | Pitch |
|---|---|---|---|
| 0 — spawn | `(0, 1.68, -19.5)` | `0°` | `-4°` |
| 1 — shopfront | `(-1.60, 1.68, -4.0)` | `-90°` | `-2°` |
| 2 — vending | `(+1.90, 1.68, +6.0)` | `+90°` | `-6°` |
| 3 — payphone | `(-1.80, 1.68, +14.0)` | `-90°` | `-8°` |

- Ease `easeInOutCubic`, **2.6 s** per leg, path is a quadratic through the alley centre so you never clip a wall.
- Control returns on arrival, or immediately on any movement input (the visitor always wins).
- "Next stop" button, bottom-right, always visible after the gate.
- **Reduced motion: jump, with a 180 ms fade through `void`.**

### 12.7 Top nav

Always present after the gate, on every device: **Work · About · Contact · Next stop**. `About` and `Contact` open the same overlays as the stations. This is what passes the ten-second test.

---

## 13. Reduced motion

`prefers-reduced-motion: reduce` is honoured everywhere, built in with the movement code, not retrofitted. **Everything stays fully reachable.**

| Off / changed | |
|---|---|
| Head bob | off |
| Camera easing on look | off — direct |
| Entry sweep at the gate | off — cut straight to control |
| Guided path | jumps with a 180 ms fade |
| Project transition | hard cut, 0 ms |
| Neon flicker | constant on |
| Ground normal scroll | frozen |
| Ripples | off |
| Steam | static, opacity 0.05 |
| Rain | opacity **0.22**, count **× 0.5**, speed unchanged (slower rain reads as broken, not as calm) |
| Chromatic aberration, noise | off |
| Bloom, vignette, fog, reflections | **unchanged** — they are not motion |

---

## 14. Threshold — gate, sound, hint

### 14.1 The gate

Full-screen, `void` background, holds until the world is ready. Carries: the vibe line, a `終電 / LAST TRAIN DEPARTED` eyebrow, a progress line (not a spinner — a 1 px rule filling left to right), and one button: **`STEP OUT INTO THE RAIN`**. The button both enters the world and unlocks audio in the same gesture.

The gate covers the download. Nothing about it apologises for the wait.

### 14.2 Audio

All levels relative to a master that starts at **−6 dB**, with a persistent mute in the nav.

| Bed | Level | Notes |
|---|---|---|
| Rain on asphalt | −18 dB | seamless loop, always on |
| Low city hum | −26 dB | seamless loop, always on |
| Distant train | −12 dB | once, 40–90 s apart, never within 10 s of a station opening |
| Vending compressor | −24 dB | positional, falls off from 6 m |
| Payphone ring | −22 dB | once per 34 s, positional |
| Footsteps on wet ground | −20 dB | 1.9 Hz at full speed, 4-sample round-robin |
| Interact / open | −16 dB | one soft click |

Audio never autoplays. If the gate is skipped by a deep link, the world is silent until first interaction.

### 14.3 Controls hint

Appears 900 ms after the gate, bottom-centre, fades after **6 s** or on first input. Desktop: `WASD / drag to look / E to interact`. Touch: `stick to walk / drag to look / tap to interact`. It never returns unless the visitor idles 45 s with no input.

---

## 15. Performance budget

**Measured on a mid-range phone, not the development machine.** Reference device: iPhone 12 / Pixel 6a, Safari and Chrome, portrait.

| Target | Desktop | Mobile |
|---|---|---|
| **Frame rate** | **60 fps** sustained at 1440p | **45 fps** sustained, floor 35 |
| **Device pixel ratio** | capped at **1.5** | capped at **1.5** |
| Draw calls | ≤ **140** | ≤ **90** |
| Triangles | ≤ **350 k** | ≤ **220 k** |
| Texture memory | ≤ **14 MB** | ≤ **9 MB** |
| Dynamic lights | 10 | 7 |
| Engine chunk (gzip) | ≤ **600 kB**, split so it caches independently of app code | same |
| Time to first frame after gate | ≤ **1.5 s** on a warm cache | ≤ 2.5 s |

**Turn-down ladder, in this order:** reflector resolution → post-processing passes → rain density (halve on mobile as a matter of course) → draw calls (instance harder before deleting anything) → shadow maps (already off).

Everything repeated is `InstancedMesh` or drei `<Instances>`: shutters, lanterns, condensers, cables, crates, rain, steam, ripples. Geometries and materials are created once at module scope or in `useMemo`, never in a render body.

### 15.1 Which column the world reads

§6, §7, §9, §10 and §15 all table a desktop and a mobile value. One rule picks between them.

**Mobile when the pointer is coarse, or the viewport is 820 px or narrower.** The pointer test is the honest one — it is what actually distinguishes a phone. The width test exists so the mobile column can be exercised by resizing a desktop browser, which is how it gets checked during development.

**Resolved once at first read, then frozen for the life of the page.** It has to be: the tier feeds the Canvas's `antialias` flag, which is fixed at WebGL context creation and cannot be changed afterwards. A tier that flipped mid-session would leave the renderer and the values describing it disagreeing — a fault that shows up looking like it lives somewhere else entirely. A window dragged narrow after load keeps the tier it started with, by design.

Orientation is the exception and *is* live, because the §12.1 FOV split has to follow the device in the visitor's hands.

---

## 16. Deliberately not specified

These need a decision before the code that depends on them is written, and the brief will be updated rather than the value invented:

1. **Screenshot pre-processing** — whether the four JPGs get a build-step darken/desaturate pass, or the `#A6B2C6` tint in §8 does the whole job. Decide when the shopfront is first lit.
2. **The bend geometry at `z = +23`** — the *orientation* is settled (§3.1: across the end, 20° off square) and thickness is 1.00 (§3), so the shell builds it as a bare box. **What the opening reveals is now settled too — §3.6, the cross street.** What remains open is the return wall's own modelled form: the shuttered doors on its face. Lands with the rest of the §3.2 inventory.
3. **Font subsetting for the Japanese canvas faces** — currently system faces only; if a webfont ships, it must be subset to the fourteen strings in §11.4 and re-budgeted against §15.
4. **Whether the door opens a real tab or a confirm step on mobile** — popup blockers treat a canvas click differently across browsers.
5. **The gutter's 0.03 recess** — §3 resolves how the gutter *reads* (through the puddle mask) but not how it gets depth. It needs the floor to stop being a plane. Decide with the kerb and drain modelling.
6. **§15's 14 MB texture budget cannot hold §2.1's screenshots.** A 1920 × 1020 JPEG decodes to about 7.8 MB of RGBA and 10.4 with mipmaps, and §3.5 has already spent 13.2 of the 14. One screenshot is over budget on its own; four are not close. The answer is a build-step resize — the lightbox is 3.20 × 1.70 world metres and at §11.1's painter scale wants roughly 1280 × 680, which is a 2.5× saving before anything else — but it belongs with item 1 below, which is the other reason those files get pre-processed. **Decide both at once, when the shopfront is first lit.**
7. **Turning without a pointer** — §12.2 makes looking a drag and §12.3 spends the arrows on movement, so a visitor with a keyboard and no pointing device can walk but cannot turn. The answer this document already contains is §12.6's guided path and §12.7's top nav, which reach every surface without walking; whether that is *enough*, or whether a key should rotate the camera, is decided when those two exist and can be tested against the ten-second test in §17. Named rather than patched, because a `Q`/`E` binding invented now would be a second movement basis nobody asked for.

### 16.1 Settled during the shell build

Recorded so the reasoning is not re-litigated: wall thickness and end-wall height (§3), the return wall's orientation (§3.1), fog density (§5), the reflector strip's extent and 4 mm lift and `reflectorOffset` (§6.1), puddle coverage with its measurement region and baseline, the mask sizes and blur scaling, and the ripple slope (§6.2), the yaw convention and rotation order (§12.1), and the tier rule (§15.1).

### 16.2 Settled during the navigation build

The clamp acting on the eye position rather than the eye minus the player radius (§3); the look gate and the one-pointer-per-element rule (§12.2); the acceleration/damping split that recovers the stated 2.6 m/s, diagonal normalisation, the sum-and-clamp convergence rule, the arrow binding, the focus-loss reset and the stick's inset (§12.3).

### 16.3 Settled during the upper-facade build

All of §3.3. Five of its values are free choices — floor height 2.85, window pitch 1.60, window 0.95 × 1.35, lit fraction 0.16, and `rain` as the lit colour. Everything else in that section is derived from something this document already said: the band base from the §2.1 recess, the floor counts from the facade heights, the bay count from the §3.1 facade extent, the emissive rung from §8.1's ladder and §17's three-warm-things rule, the panel offset from §6.1, the texture size from §15's budget, and the absence of collision from §3's clamp.

**Towers were considered and rejected**, since the question will be asked again: the facades occlude them, the §12.2 pitch stop of 62° does not reach either parapet from the alley centre (69.9° west, 67.4° east), and at §5's fog density a subject 60 m out sits at 0.039 transmittance. Three separate parts of this document each erase them on their own.

### 16.4 Settled during the storefront build

All of §3.4, and the two rungs it adds to §8.1. Free choices: the five unit widths, the plinth, aperture, doorway offset, sign box and awning dimensions, the 0.09 slat pitch, the 1.80 service gap, and the 9 / 3 / 2 split of shutter states. Derived: the unit count and variant count from §3.2, the band top from §3.3's 4.60, the doorway height from §2.1, the sign-box colour split from §4's neon ratio, the two emissive rungs from §8.1's ordering against §17, and the reserved slots from §2.1, §2.2 and §2.3.

**§8's `normalRepeat` 24 × 1 is not used on the shutters**, and §3.4 says why: a shared material's repeat cannot follow five unit widths. The value stays for one-size surfaces.

**The collision registry arrived here with nothing to collide with.** Every storefront AABB is inert against §3's clamp, by 0.13 m at the worst unit. It was built anyway because §12.4 asks for boxes as objects are placed and the §3.2 items that stand *in* the alley all need the same registry.

### 16.5 Settled during the signage build

All of §3.5. Free choices: the sign and banner dimensions, the projection range, the mount band, the bracket, the 0.03 rim, the 34 spans' radius, sag and skew, and the three-segment approximation. Derived: the counts from §3.2, the strings and their index order from §11.4, the flicker pair from §11.3, the colour split from §4's ratio, the face and banner rungs from §8.1, the cable band from §3.1, and the mount band from §3.4's aperture head below and §3.1's cable band above.

**§8's 0.03 halo shell is deliberately not built** — §9's bloom does that job properly one step later, and building both means doubling the sign draw calls to pre-blur something about to be blurred. Revisit if bloom lands too tight.

**A banner is backlit and a sign is not**, which is why §3.4's `void`-diffuse rule stops at the nine signs. There is no light within reach of `y = 6.90`.

**Texture memory is over budget by 4.7% on desktop** and every lever is a value in this document. Open, and named in §3.5.

### 16.6 Settled during the traffic build

All of §3.6, which closes the second half of item 2 above. Free choices: the carriageway's width and lane split, both pavements, the centre-line dash, the far building's height band and panel count, the six vehicles' dimensions and the three variants, the 240 m loop with its gaps, the two speeds, and the three road-glow sizes and opacities. Derived: the street's near edge from §6.1's reflector seam, the ground plane's new size from the far pavement it now has to reach, the far building's 14.0 from §3.1's end-wall rule and its window bays from §3.3 verbatim, the underglow colours from §4's ratio, the four rungs from §8.1 against §17, the absence of collision from §3's clamp, and the hold-still behaviour from §13.

**A road needed more than cars.** The ask was traffic; traffic needs a carriageway, a carriageway seen through the opening needs a far side or §1's *no horizon* goes with it, and a far side thirty metres past every light in §7 needs its own windows or it is a wall nobody can see. Each of those follows from the one before it, and none of them was optional. The street envelope is in scope for that reason and no other — nothing on it carries content, and nothing on it can be reached.

**Uneven speed within a lane was considered and rejected.** It is the obvious way to make traffic look unscripted, and on a single-lane loop it guarantees the one failure that was named: a faster car eventually reaches the one ahead. Unequal *gaps* do the same job and cannot produce it. The two lanes run at different speeds, which is where the variety actually comes from.

**The reflector was not extended to the cross street.** It would have to grow in `x` as well as `z`, and §6.2's mask maps 1:1 onto the strip — every puddle and the gutter bias with them stretch when it does. §3.6 says what the street gets instead.

**Three faults were found by measurement rather than by reading the diff, and each was legal by every constraint written down at the time.** The headlight clusters were placed by their inset from the centreline, which buried all twelve of them inside their own bodywork — from the alley, which only ever sees this street broadside, the street had no lights on it at all. The far-side boards were spaced every five metres against a sightline that exposes 4.2 m of that wall, so the backdrop was built, lit, and statistically never in frame. And the boards were a fraction of their token on a `meshBasicMaterial`, which caps at white and therefore cannot survive a mix toward `fogColor` at 0.14 — the ceiling was the fault, not the setting. **All three passed lint, types and the build**, and none of them is visible in the numbers.

**The vehicles became glTF models after the section was built**, and three things in §3.6 were rewritten rather than kept. The variant table stopped stating dimensions and started stating a file and a target length, because a model that is measured cannot disagree with a document that guesses. The per-material merge arrived with them — 57 primitives is not a shape this budget can hold. And the lamps stayed, which was the surprise: a real car model has no lights that light, and at this distance the lamps are the only part of a vehicle that is visible at all.

**Frustum culling had been switched off, and that was the wrong fix.** The instance matrices are written with the car at the origin, so bounds computed at mount are wrong and the street empties itself as you look at it — turning culling off makes that stop, at the cost of submitting every triangle of every car every frame. Recomputing the sphere from the instance matrices costs nothing and fixes the cause instead of the symptom: peak drawn triangles fell from **136 k to 110 k**, and to **49 k** from spawn.

**Left open.** Whether the street should be legible from spawn at all — §5's fog says no and §3.1 agrees, but the request that produced this section was made from the middle of the alley. The lever is §5's density and it is not this section's to pull. See §3.6.

### 16.7 Settled during the street-prop build

All of §3.7. Free choices: every dimension in its table except the vending machine's, the 0.20 wall standoff, the 8° scooter lean, the stack depths, and the guardrail's post and rail sizes. Derived: the counts from §3.2, the vending machine's body from §2.2, the pole line from §3's gutter centre, the standpipe line and the fascia clearance from §3.4, the lantern rung and the cart rung from §8.1, the decal from §7, the guardrail's z from §3's clamp plus §12.4's radius, and the decision to light nothing else from §17.

**Three objects were added to §3.2 rather than found in it** — the food cart, two rubbish points and the guardrail. The first two were asked for and are ordinary alley furniture; the third is the one worth recording, because it is the first thing in this world built to explain a rule rather than to decorate. §3's clamp has been in the document since the shell and correct throughout; what it never had was a reason the visitor could see.

**The bicycles became scooters**, and §3.2 carries the argument: at this world's box-and-cylinder fidelity a bicycle is a lattice of thin tubes that reads as noise, and a scooter is five solids that read as one object. Same count, same places, same job.

**Lighting the dead vending machines was the tempting change and it is the one that would cost the most.** Five lit drinks machines and the §2.2 bio station is no longer the only lit drinks machine in the alley — it is one of six, and the thing §17 asks a stranger to find in ten seconds has been hidden inside its own scenery. §3.2 said *unlit, dark* before any of this was built; §3.7 now says why.

**§12.4's resolver had never been exercised.** Every AABB in the world before this section was inert against §3's clamp by construction, and §3.4 said so at the time. The props are the first objects standing in the walkable band, so the per-axis resolution, the slide-don't-stop behaviour and the 0.32 radius are tested here for the first time — by walking into a vending machine, a cone and the guardrail, not by reading the diff. **Thirty of the forty-three boxes can fire**, and seven cases were checked against a predicted stop before anything else was believed: the cart to 2.98, a vending machine to 3.16, a pole to 3.29, a crate to 3.12, the two mid-alley clusters out to 0.30, and the guardrail to 21.40. All seven landed on the predicted number.

**Placement was checked by a rule rather than by eye, and it moved three props before anything was drawn.** *"No collisions"* is four properties — no prop overlaps another, none stands in a §3.4 doorway, none enters a §2 slot, and no pole passes through an awning — and `audit()` in `lib/props.ts` states them as findings. It caught a rubbish point across unit 8's door and a second one wedged between a crate stack and a vending machine in a 3.76 m aperture. **Neither was visible in the numbers and both would have shipped.** A fifth rule went in afterwards for the paper lanterns, which share a height band with six of §3.5's projecting signs.

**One fault was found by looking, and it is §3.6's headlights again in a different costume.** §7's contact decal was wired to `alphaMap`, and three's `alphaMap` samples the **green** channel while the painted texture carries its entire shape in **alpha** — green is 255 across every pixel of it. Every decal in the world was therefore a hard-edged opaque rectangle: right size, right colour, right place, right count, no error anywhere. §3.6 had already used the same texture correctly in `map`, one file away. **The lesson is the one this document keeps writing down**: the faults that survive lint, types and the build are the ones where every number is correct.

---

## 17. Definition of done, for this world specifically

- You spawn facing an empty alley. You turn round and the shutter is down. You understand what happened without being told.
- The ground is the brightest thing in the frame and it is not a light source.
- Three things are lit warmer than everything else and they are the only three things you can touch.
- Nothing in the backdrop responds to a click.
- A project added to `CONTENT.md` appears on the shopfront with no component edited.
- Every door opens the real deployment.
- The whole alley is walkable end to end in under twenty seconds, and nothing lets you out of it.
- **A stranger, on a phone, finds the contact details in ten seconds without walking anywhere.**
