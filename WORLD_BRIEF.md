# WORLD_BRIEF.md — 終電 / Last Train

> **Vibe sentence** — 3am in Tokyo. You've just missed the last train. Neon reflections on wet pavement.

This document is the source of truth for every atmospheric, material, light and scale value in the world, for the layout, for what the three content surfaces are, and for navigation. `lib/world.ts` is a typed mirror of this file. Nothing here is invented at the keyboard; if the build needs a number that is not written down here, the build stops and this file gets updated.

Units are **metres** and **radians unless a degree sign is present**. Colours are authored in **sRGB hex** and converted at load (`THREE.ColorManagement` on, `outputColorSpace = SRGBColorSpace`). Y is up. The alley runs along **+Z**.

---

## 1. The world in one paragraph

A single back alley off a Shinjuku side street, forty-six metres end to end, nine metres wide, walled at both ends. Behind you, the station ticket gate with its shutter down — you missed it. Ahead, the alley bends into fog and never resolves. It has been raining for an hour and has just stopped; the asphalt is a mirror and every sign in the alley is in it, upside down and softer. There is no sky: fourteen-metre facades on both sides, a mat of overhead cable, and fog that closes the last fifteen metres. Nobody else is here. Three things in the alley are lit warmer than the rest — a board at the bend, a vending machine, a payphone — and those three are the portfolio.

**Crossable in under a minute:** 46 m at 2.6 m/s ≈ 18 seconds end to end.

---

## 2. The three content surfaces

| Role | Object | Where |
|---|---|---|
| **Showcase surface** | **The board** — a lit board on the bend, screenshot over text, with a vertical neon sign above it and two door plates on it | The bend, `t = 0.00` |
| **Bio station** | **The vending machine** — a lit drinks machine glowing warm in a dark stretch | East wall, `z = +6.0` |
| **Contact station** | **The payphone** — a green NTT box under a small awning | West wall, `z = +14.0` |
| **Surroundings** | The alley. **Carries nothing.** | Everywhere else |

The zigzag is deliberate: bio right, contact left, showcase straight ahead at the end — the first two visible from each other, the third closing the alley and visible from spawn.

### 2.1 The board (showcase surface)

One board. One project shown at a time. Everything on it is generated from `CONTENT.md`.

**It is on the bend, and that resolves §16 item 8.** This surface was authored against the west wall at `z = -4.0` from the shell onward, and §16 item 8 has stood open the whole time asking whether it should move to the bend instead. It moves. The bend is the one sightline every visitor faces from spawn; §3.1 built the return wall specifically to close it; and it is the only wall in the world nothing else can be given, because §2.4 forbids putting content in the surroundings and anything decorative placed there could not be relabelled afterwards. The west slot becomes a deliberate gap — see §16.12.

**Everything below is authored in the bend's own frame**, §3.1's `t` along the face with the board's local `+X` to the visitor's right and `+Y` up. No coordinate here is a world coordinate, and none may become one: the frame is derived from `LAYOUT.ends.south` in one place and a world coordinate written beside it drifts silently the moment the angle changes.

**Four separate objects on the wall, not one board.** The screen, the title sign, the info panel and the door each stand proud of §3.1's bend face on their own, the way every other lit object in this alley does. A single carcass with everything painted on its face was tried, and at the size the screen needs it stopped being a board and became a wall covered in one texture.

Positions are `x` in the assembly's local frame — `+X` is the visitor's right — and `baseY` in world metres, because the door has to reach the ground and everything else stacks off it.

| Part | Size | Local `x` | World `y` |
|---|---|---|---|
| **The screen** | **4.40 × 2.3375** (= 4.40 × 8.5/16, so the 16:8.5 screenshots are not cropped), 0.16 deep, in a **0.10 lit bezel** | 0 | `[3.05, 5.3875]` |
| **Title sign** | **Horizontal**, 2.60 × 0.62 × 0.14 — carries the **project name** | 0 | `[2.20, 2.82]` |
| **Info panel** | 3.20 × 1.55 × 0.10 — the blurb (up to **5** wrapped lines at 1.45 line height) and the tags | −0.75 | `[0.45, 2.00]` |
| **Door** | **A literal door, 1.00 × 2.05 × 0.08**, in a 0.13 lit reveal, with a vision panel and a handle. **Opens the project's live URL in a new tab.** | +1.80 | `[0, 2.05]` |
| Paging, position, open, GitHub | **Not on the wall — see §2.1.2.** Also `←`/`→`, `[`/`]`, and horizontal swipe | | |

**The assembly sits at `t = 0.70`, not centred, and that is the door's doing.** §3.1's visible face is 5.82 m and the screen with its bezel is 4.60, so there is 0.60 m of slack; this spends all of it toward the alley mouth. Centred, the door landed in the corner where the bend meets the west facade, with §3.4's last storefront unit standing in front of it — half a door, occluded, from the one pose §2.1.1 puts you in. **Sliding the assembly rather than mirroring it is what keeps the arrangement** (screen, title, text left, door right) while getting the door clear, and it moves the locked pose 0.66 m further from §3.7's rubbish stop as well.

**The bezel is geometry, not a painted strip**, and that is the fix for a fault worth recording: a `strokeRect` around the screenshot on a shared emissive canvas is *one intensity for the whole face*, so the strip arrived at the same rung as the prose beside it and read as two lit white bars lying across the wall. A bezel is a frame the screen sits in, and a frame is an object.

**The door needed light to read as a door.** `shutter` on `void` at 7.3 m against an unlit wall is not a door, it is a shadow. It gets §8.1's `openShutterSpill` rung on the reveal behind the leaf — a lit outline, which is light from inside — plus a vision panel in the leaf's upper half at the same rung, and a `neonCyan` handle. The reveal alone was a glowing rectangle around a dark patch; **what makes a shape read as a door is light coming through it.**

**The title sign is below the screen, not above it.** Above, it was a landmark competing with the thing it labels; below the image it is a caption, which is what a title is.

**The screenshot is the largest thing on the board, and everything else is sized around it.** It is 2.90 m across a 3.20 m board — 90% of the width and 36% of the height — because it is the only part of this surface that is *the work* rather than a description of it. The title is a sign above the board rather than a line of type on it, for the reason every other shop in this alley has a sign: at forty metres a name on a lit board is unreadable and a lit sign is a landmark.

**The door is a literal door and that is the point.** §2.1's earlier plate was a legend on a panel. A 1.00 × 2.05 door standing on the ground is the same dimensions as §3.4's fourteen ordinary shopfront doorways — the world already contains this object, and the one that opens is the one project you can walk into.

**The width is derived and could not have been chosen.** §3's clamp stops the eye at `z = 21.4`, so the reading distance is fixed by where a visitor can physically stand. The locked pose below sits **5.627 m** from the board; at §12.1's portrait FOV of 70° vertical on a 390 × 844 screen the horizontal half-angle is 17.92°, so the frame is 3.641 m wide there, and a board turned 5.61° off the view direction fits **3.35 m** inside it. Take 3.20, which leaves the margin at 5%.

**The standoff is what the board's size actually costs.** A 2.00 m board fits at 3.43 m; a 3.20 m one needs 5.60, which is a metre and a half further than the clamp's own limit at the wall — so the lock now pulls the visitor *back* rather than forward, and §12.5's radius has to contain the pose it moves to.

**`t = 0.00` is the centre of the face for two independent reasons.** It is the middle of what can be seen — the wall's west 0.183 m is buried inside the west facade box, so the visible span is `t ∈ [-2.8175, +3.000]` — and it is the deepest point of the wall from the alley, which is the furthest a visitor can get back from it. It also clears §3.7's mouth guardrail, which closes the opening at `x ∈ [0.90, 4.15]`: a board toward `t = +3` would have stood behind a railing.

**The title sign is horizontal and it is inside the frame.** It sits §3.5's own 0.25 m clearance above the board top, spanning `y ∈ [4.55, 5.10]`, and the locked view's vertical span reaches 31.3° — so unlike a 3.40 m vertical sign it is part of the composition rather than a separate landmark above it. A vertical stack was tried and it was the wrong object twice over: at 3.40 m it dominated a board it was supposed to label, and stacked Latin capitals with the spaces dropped read as a word with something wrong with it.

**Paging.** Manual: the two arrow plates, `←`/`→`, `[`/`]`, horizontal swipe. **Automatic: 10 000 ms dwell, wrapping from the last project back to the first.** The first manual page or door click **stops the automatic paging for the session** — a carousel that keeps moving under someone who has taken the wheel is the thing people dislike about carousels. Reduced motion: see §13.

**Transition between projects:** the aperture cuts to black over 140 ms, holds 90 ms, fades up over 260 ms; the neon sign flickers on with the sequence in §11.3. Reduced motion: hard cut, no flicker, 0 ms.

**The screenshot glows, and it still never blooms.** These are not in tension and the distinction is the whole rule. The image plane was `meshBasicMaterial` at emissive **0** — which does not merely stop it blooming, it stops it being *lit*, and a dark rectangle of UI on a dark board at 3am reads as a photograph of a screen rather than as a screen. It is now an emissive map at **§8.1's 0.78 rung**: under the 0.90 knee, so §9's bloom never touches it, and the tint goes to **0.82** since the emissive term now carries the brightness the multiply used to have to fake.

**The ceiling is what matters, not the material.** *Peak luminance must land below the bloom threshold of 0.90* is the sentence that protects the scene, and it is unchanged. What changed is that a surface can be lit and sub-knee at the same time — which is exactly what §8.1's other four sub-knee rungs already are. A screenshot at 0.78 is on the same side of the knee as fourteen storefront sign boxes at 0.85 and a hundred and fifty facade windows at 0.55.

The glow *around* the aperture is still the surround's job, not the image's: a 0.05 emissive border strip at §8.1's rung and the `rectAreaLight` in §7.

The screenshots are **1024 × 544 desktop, 512 × 272 mobile**, downscaled at runtime from the source JPEGs — see §16.1 and §16.6, both resolved here. Three are resident at a time (`prev`, `current`, `next`), which is §15's constraint and also §17's: a resident set that grows with the project count would put a fifth project over budget as well as requiring a component edit.

**Failure is quiet, and it is the default rather than a fallback.** The aperture's material is *built* flat `#0E121A` with no map, with the ripple-glass normal still catching the neon. A screenshot that loads replaces it; a screenshot that 404s, fails to decode, or is missing from `CONTENT.md` simply never replaces it. There is no spinner, no error, no white plane, and no branch — the failure path is the path not taken. The door still works.

### 2.1.1 The locked view

Walking up to the board and pressing `E` pulls the camera to a fixed reading pose. **Authored in the board's own local frame**, never as a world coordinate:

| | Value |
|---|---|
| Standoff | **5.60** along the face normal |
| Lateral | **+0.55** along the face — offset, not head-on |
| Eye height | §12.1's 1.68, unchanged |
| Distance | **5.627** — what §2.1's board width was derived against |
| Yaw | **derived**: `BEND.yawDeg − atan(lateral / standoff)` = 20° − 5.61° = **+14.39°** |
| Pitch | **derived**: **+6.19°**, the centre of the board's *angular* extent from the pose, which is not its geometric centre because most of the board stands above eye height |
| Ease | `easeInOutCubic` over **600 ms** |
| Release | `Escape`, any movement input, the on-screen close control, or a click that hits nothing |

**The lock now pulls the visitor back, not forward, and that is a consequence of the board's size.** §3's clamp lets the eye reach 0.645 m from this wall; a 3.20 m board needs 5.60. So the pose is *further* from the board than a walking visitor can get on their own, and §12.5's radius has to be large enough to contain it — see §12.5.

**The lateral offset is not styling.** Head-on at 5.60 the eye lands at `x = -3.767`, outside §3's clamp at `-3.60` entirely. Offset to `+0.55` the pose lands at `(-3.250, 1.68, 17.578)` — inside `BOUNDS`, and **0.13 m clear** of the stop §3.7's rubbish point imposes at `x = -3.38`. Both bounds are live here: one more decimetre of standoff and there is no legal lateral that satisfies them together.

**Pitch is derived from the extent, not the centre.** From eye height at 5.627 m the board's bottom edge sits at −16.61° and its top at +28.99°; the centre of that span is **+6.19°**, while aiming at the board's geometric centre would give +7.29°. The difference is small and the reason is not: a surface that is mostly above eye height is not angularly centred on its middle, and taking the easy number would leave the top edge nearer the frame edge than the bottom.

**The primitive is general, because §12.6 needs the same one.** A locked view is a target pose, an ease and a release; the guided path is four of them in sequence with a control point. One implementation, and the lock is its first consumer rather than its only one.

### 2.1.2 The controls are on the screen, not on the board

Paging, the position indicator and *open* live in a **2D overlay drawn over the world**, present only while §2.1.1's locked view is held. Nothing about them is painted on the board.

| Control | |
|---|---|
| Previous / next | `‹` and `›`, either side of the indicator |
| Position indicator | **N numbered stops**, the current one filled — N read from `CONTENT.md`, never hardcoded |
| Open | Opens the project's live URL. The same action as §2.1's door, reachable without aiming at it |
| Close | Releases the locked view — §12.5's required touch path |

**They came off the board and the reason is legibility rather than taste.** Painted on the face they were 0.20 m plates carrying 0.038 m type, read at 5.6 m: about six device pixels a glyph on a phone. As DOM they are screen-space, so they are the same size at every distance and on every device, and they get real hit targets, real focus rings and real hover states — none of which a canvas texture on a quad has.

**The board keeps its door, and that is the division.** The door is *in the world* and opens by being walked up to and clicked; the overlay is *over the world* and opens the same URL by being tapped. One is the thing, the other is the control panel for it, and a visitor who never locks the view still has a door.

**This does not become the top nav.** §12.7's nav is always present after the gate; this appears with the lock and goes with it, so `Escape` closing the lock also closes these — one thing on screen, one way out.

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

**Nothing, with one named exception.** No project names on scenery. Nothing in the backdrop is clickable, hoverable, or raycast against. **The exception is the studio's own name, once, on §3.6's far building** — and it is written as an exception rather than smuggled in as a thirty-first string, because §11.4's list is *"never project-related"* and this is the one thing in the world that is. It extends the precedent §3.1 already sets: `終電` is there because *"it is the only place in the world that says it"*, and the piece is allowed to be signed. Two places where the world names itself, both deliberate, both recorded. Everything else in §2.4 stands: nothing in the backdrop is clickable, nothing is raycast against, and no *project* name appears on scenery — the projects still live only on §2.1's board.

Decorative Japanese signage is drawn from the fixed list in §11.4 and is atmosphere only — if a string in the world is not from `CONTENT.md` and not from that list, it does not exist.

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
| **Wall thickness** | **1.00**, all facades and end walls, inner faces at `x = ±4.5`. Outer faces are never seen. |
| Ground | `y = 0`, single plane **70 × 70** (overscan hidden by fog, or by a wall). Was 60 × 60 until §3.6 put a road past the bend — see there |
| Kerb | 0.12 high, 0.60 wide, both sides, inner edge at `x = ±3.90` |
| Gutter channel | 0.22 wide at `x = ±3.72`, 0.03 deep — standing water, roughness 0.06. **Expressed through the puddle mask, not as overlay geometry — see below.** |
| **Walkable clamp** | **`x ∈ [-3.60, +3.60]`, `z ∈ [-21.0, +21.4]`** (hard, in addition to AABBs) |
| Player radius | 0.32 |

**The clamp acts on the eye position, and the player radius is not subtracted from it.** The two numbers meet here and it is worth saying which does what: ±3.60 already stands 0.90 m inside the walls at ±4.5, so taking the 0.32 radius off it again would stop the visitor at ±3.28 for no reason this document gives. The radius belongs to the §12.4 box resolution, where it is the distance a capsule keeps from a *solid object*; the clamp is a literal coordinate limit on the camera.

**The gutter is the mask, not a strip.** This section gives the gutter roughness 0.06, and §6.2 gives puddle-wet ground roughness 0.06 and biases the mask toward `x = ±3.72` — the two sections describe one surface. Laying a separate strip over the reflector would invert it, because a plain material on top of the reflector makes the wettest line in the alley the only one that does not reflect. **What remains genuinely unbuilt is the 0.03 recess**, which cannot exist while the floor is a plane; it needs real floor geometry and arrives with the kerb and drain modelling in the surroundings step. Until then the gutter reads as standing water, which at eye height is what 3 cm of depth looks like anyway.

### 3.1 The two ends (there is no horizon)

- **North, `z = -23`** — the station ticket gate. Full-width wall, roller shutter down, a dark backlit `終電` plate above it at 4.2 m, three dead gate machines in silhouette, and **§7's light 11 seated on the plate** — `signWhite`, the one cool light in the alley, because a station gate is fluorescent and municipal. This is behind you at spawn; turning round is the story beat, and it does not work on a wall nothing lights.
- **South, `z = +23`** — the alley bends left. A 6 m return wall of shuttered doors at 20° to the axis, so no vanishing point is visible, and fog closes it at 0.24 transmittance.
- **Above** — an overhead mat of cable and wire at `y ∈ [6.5, 9.0]`, plus three cross-alley banner wires. There is **no sky dome and no HDRI**: `scene.background` is a flat `#04060B` and the fog eats everything before the facade tops.

**The shutter and the notice, and §17's first line was false until they existed.** §17 opens with *"You spawn facing an empty alley. You turn round and the shutter is down."* §3.1 has said *roller shutter down* since the shell and there was no shutter at the north end — the wall was a bare facade box. This builds it, and the notice the user asked for with it.

| Value | | From |
|---|---|---|
| Shutter | full **9.00** width, `y ∈ [0, 3.40]` | the alley width; head clears the 4.20 plate with 0.80 to spare |
| Slats | §3.4's slat **geometry** at its own 0.09 pitch → **37 slats**, one instanced call | derived — below |
| Notice panel | **1.15 × 0.72**, centred `(0, 2.10, ·)`, standing 0.04 proud of the shutter | free; 2.10 is where a gate actually posts a closure notice, and it is the only height on this wall a visitor reads at 3.0 m without looking up |
| Notice carries | the shinkansen pictogram **and** §11.4 index **21** on one canvas | one texture, one material, one draw call |
| Notice emissive | **1.01**, the station-plate rung | §8.1, reused rather than extended — it is the same municipal backlight |

**The slats are geometry at §3.4's own 0.09 pitch, and §8's `normalRepeat` is not involved.** This was nearly got wrong: §8 does carry a 24 × 1 corrugated-normal row for roller shutters, and the gate is the world's only one-size shutter, so it reads as §8's case. But §3.4 never used that row — it builds real slats at a **constant 0.09 m pitch**, and its own note says why: a fixed *repeat* across unit widths of 3.60 to 6.20 puts the rib pitch anywhere between 0.15 and 0.26 m, so the corrugation coarsens as the shop widens. A repeat scales with the surface; a pitch does not.

**That argument decides the gate too, and it decides it the other way from "bigger door, heavier slats".** The pitch is a property of the *shutter*, not of the opening, so a 9.00 m gate gets the same 0.09 m slats as a 3.60 m shop: **⌊3.40 ÷ 0.09⌋ = 37**, each 9.00 wide × 0.081 high (0.9 of the pitch, leaving the groove) × 0.035 deep, in one `InstancedMesh`. A station gate looking like a shop shutter of the same make is correct — they are the same product.

**The shinkansen is painted, not modelled.** §11 makes canvas the way every graphic in this world arrives, and §3.2's bicycle-to-scooter argument applies verbatim: a shinkansen's whole identity is the long nose curve, and this world's geometry vocabulary is boxes and cylinders, so built as geometry it would read as a lump on a wall. It also costs draw calls where a canvas costs texture, and §15 has 1.06 MB of desktop headroom against a zero-draw-call budget that does not.

**The canvas is 512 × 256 and not §11.1's 4 px/cm.** Four px/cm on a 1.15 m panel asks 460 px and pads to 512 — so for once the two agree, and the panel gets 445 px/m, comfortably crisp at the 3.0 m the visitor reads it from. **0.67 MB**, taking desktop to 17.6 of 18.

**The three dead gate machines are still not built.** §3.1 has named them since the shell, no section has ever picked them up, and they are not in §3.2's inventory. Recorded here rather than quietly dropped: the shutter is what §17's line actually needs, and the machines are silhouette detail in front of it.

**The plate is built with the light, because §7.1 will not let it be otherwise.** The gate wall had no light, and the fix is a light — but §7.1's rule is that a glowing thing needs a visible source, and the plate that is supposed to be the source was deferred as *surroundings work* and never arrived. So a coordinate at `y = 4.2` with nothing at it would have been precisely the unmotivated glow §7.1 removed four rectangles for. **The plate lands in the same step as its light.**

| Value | | From |
|---|---|---|
| Glyph height | **0.55** | §11.2, `終電` |
| Panel | **1.62 × 0.86**, 0.06 thick | 2 glyphs + 0.26 padding either side, height 0.55 + 0.31 |
| Centre | `(0, 4.20, −22.47)` | `ends.north.z` + half the 1.0 wall + half the plate — derived, and the figure is what the code computes rather than a number typed beside it |
| Colour | `signWhite` on `void`, §3.4's emissive-only rule | §4 |
| Emissive | **1.01** | §8.1, *station plate* |
| String | §11.4 index **13** | §11.4 |

**It reads `終電` and it is the only place in the world that does**, which is why §11.4 reserves the index rather than letting it fall to a sign. The word is the title of the piece and the answer to what happened here; §17 spends its first line on the visitor turning round to find it.

**End wall height — 14.0, both ends.** This document gives heights for the two facades and none for the caps. They take the taller of the two, because a cap shorter than its neighbours opens a strip of sky in a world whose whole premise is that there is none. Derived from the constraint, not chosen.

**The bend's face frame is derived once, because §2.1's board now mounts on it.** Everything below follows from `LAYOUT.ends.south` and §3's wall thickness — nothing here is authored, and nothing may be. A second derivation of this wall written next to the first is exactly §7.1's fault: change `angleDeg` or `returnLength` and the board slides off the wall it is bolted to, silently, with nothing in the diff wrong.

| | Value |
|---|---|
| Box centre | `(−1.6809, 23.5000)` — `alley.x[0] + (returnLength ÷ 2)·cos 20°`, and `ends.south.z + wallThickness ÷ 2` |
| **Face centre** | **`(−1.8520, 23.0302)`** — half a thickness inboard along the box's own local `+Z` |
| Along | `(+0.9397, −0.3420)` — the face's length direction. `t` is metres along this from the face centre |
| **Inward normal** | **`(−0.3420, −0.9397)`** — from the face into the alley, the direction a visitor stands in |
| **Visible span** | **`t ∈ [−2.8175, +3.000]`** — the west 0.183 m of face is buried inside the west facade box and never renders |
| Standoff at the clamp | **0.645 m minimum**, at `(0.75, 21.4)`, right at the panel's near edge; 2.21 m at `(0, 20)`, 4.09 m at `(0, 18)` |

**The clamp is a rectangle and this wall is at 20°, so the standoff varies by nearly two metres across it.** That is why §2.1's reading distance is a *locked pose* rather than wherever the visitor happens to stop: the closest legal standing point to the face is under two thirds of a metre, which is not a distance anything can be read at.

**"20° to the axis" means across the end, not along it.** The phrase admits two readings, and only one does the job the same sentence asks for: a wall swung 20° off the *long* axis runs nearly parallel to the alley and blocks nothing, while a wall across the end swung 20° off square hides the vanishing point. **The second reading is the one that holds.** Its west end meets the west wall and it opens toward `+X` — the visitor's left when facing `+Z`, which is the direction the alley is stated to bend. What lies past the opening is §16.2 and still unmodelled; at 42 m from spawn the fog is at ~0.21 transmittance and closes it unaided.

**Facades run `z ∈ [-24, +24]`** — the alley length plus a wall thickness at each end, so the facades meet the outer faces of both caps and no corner shows a seam.

### 3.2 Surroundings inventory (atmosphere only)

Placed as instanced geometry, reviewed as a diff, bounding boxes added as they go:

| Item | Count | Solid? |
|---|---|---|
| Shuttered storefronts (3 shutter variants) | 14 | yes |
| Dead vending machines (unlit, dark) | **4** | yes |
| Red paper lanterns on brackets | 11 | no |
| Vertical neon signs (decorative, §11.4) | 9 | no |
| Air-con condensers on brackets | 16 | no |
| Standpipes / drainpipes | 22 | yes (12 of them) |
| **Scooters** leaning on side stands | 4 | yes |
| Crates and beer cases stacked | 9 | yes |
| Traffic cone + barrier | 3 | yes |
| Steam vents (grates) | 3 | no |
| Overhead cable spans | 34 | no |
| Utility poles | **2** | yes |
| Puddle decals | 18 | no |
| Ripple emitters | 12 | no |
| Cross-street vehicles (§3.6, past the bend) | 6 | no — unreachable |
| **Food cart** (§3.7) | 1 | yes |
| **Rubbish points** (§3.7) | 2 | yes |
| **Alley-mouth guardrail** (§3.7) | 1 | yes |

**Scooters, not bicycles.** This line read *bicycles leaning* until §3.7 built it, and the change is technical before it is anything else. Everything in this world is boxes and cylinders (§3.4), and a bicycle at that vocabulary is two wire wheels and a lattice of thin tubes — it reads as a mess at any distance the alley offers. A scooter is a floorboard, a cowl, a leg shield, a seat and two fat wheels: five primitives that read as one object at 20 m and still hold up at 2 m. It is the same object in the same place doing the same job, drawn in a vocabulary this world already has.

**And then five primitives were not enough, so the scooter became a model.** The paragraph above is right about a bicycle and it was wrong about how far a box scooter carries: at 20 m it reads as one object, and at 2 m — which is where three of the four actually stand, on the walkable band beside a wall the visitor is walking along — it reads as a stack of crates with two discs beside it. **The vocabulary rule was never about boxes; it was about not putting one object in the alley at a fidelity nothing around it shares** (§3.4, §3.7), and §3.6 already broke the letter of it for exactly that reason: the cross-street vehicles are glTF models because a box car at 40 m through fog is a box. The scooter is the same argument at 2 m instead of 40. See §3.7 for what it costs and where the model came from.

**Two counts in this table moved and are recorded rather than quietly corrected.** The vending machines went 5 → 4 when §2.1 took the bend and the fifth was standing in front of the one content surface in the world; the utility poles went 6 → 2 across three passes of `audit()` failures and one thing a screenshot showed that no numeric rule was checking. Both are argued where they happened, in §3.7.

### 3.3 The upper facade — window bays

Above the shopfront line both facades are flat colour across 48 m, and it is the surface a visitor looking up actually meets. It carries a **window grid painted to a canvas and used as both `map` and `emissiveMap`** — the same pixels in both, so a window cannot be lit in colour and dark in glow.

**This is not a skyline.** §1 and §3.1 stand unchanged: no sky dome, no towers, no horizon. The grid goes on the two walls that already exist, inside the fog, capped at the same heights.

| Value | | From |
|---|---|---|
| Band base | `y = 4.60` | §3.4's fascia line — see the note below |
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

**The band base was derived from something that no longer exists, and it stays anyway.** `y = 4.60` was the top of §2.1's shopfront recess, *"the tallest ground-floor feature"*. §2.1 moved to the bend and the recess is gone. The number is kept and its provenance re-stated as §3.4's fascia line, because 4.60 is now load-bearing in the other direction: §3.3's floor counts, §3.4's band top, every sign `z` resolved against that band, and the five §7.1 lights seated on those signs all derive from it. Re-deriving it would redraw both facades to move a line nothing is asking to move. **A value whose reason has expired is not automatically a value that is wrong** — but it has to be re-justified in place rather than left pointing at a deleted section.

**Lit windows are cool, and that is a constraint rather than a taste.** §17: *three things are lit warmer than everything else and they are the only three things you can touch.* A hundred and fifty warm windows break that sentence outright. `rain` is the only cool unsaturated token in §4 not already spoken for by a light or a content surface.

**Emissive 0.55, under the knee.** §8.1's dimmest rung that still touches bloom is the station plate at 0.95, against a threshold of 0.90. Windows are the most numerous emissive thing in the world by an order of magnitude; put them anywhere on the bloom side and two 48 m walls flare brighter than the board. 0.55 sits between the surround strip and the screenshot at 0 — lit, never flaring.

**They light nothing, and they do not reach the floor.** An emissive material in three.js illuminates nothing but itself, and §7's ten dynamic lights are all allocated with none spent here — so the windows never fall on the alley. §1's *every sign in the alley is in it, upside down and softer* does **not** extend to them either: measured on the built wall, a lit window leaves no trace in the reflection, and forcing the emissive to 12 — twenty-two times the shipped value — changes it no further. Between the §6 blur of 420 × 100 at `mixBlur` 0.85 and a source that starts 4.6 m up, nothing of this size survives the pass. This is stated because it is the tempting fix in the wrong direction: **a wall of windows can never be brightened into the floor**, and any attempt to get them there by climbing §8.1's ladder buys a blown facade and no reflection.

**Three variants, assigned by index, never randomised** — the §3.2 precedent for shutters, the §11.4 precedent for signage. Six bays per wall cycle A B C A B C. One texture set serves both walls: the east wall's two floors sample the bottom two thirds of the same image, so the height classes cost geometry, not memory.

| Texture | Desktop | Mobile |
|---|---|---|
| Bay canvas | 512 × 512 | 256 × 256 |
| Count | 3 | 3 |
| With mipmaps | 4.00 MB | 1.00 MB |

**512, not the §11.1 painter scale.** §11.1's 4 device-px per world cm is a signage figure; applied to an 8 m bay it asks for 3200 px and spends §15's whole 14 MB texture budget on one wall. 512 across 8.00 m is 64 px/m, and the closest a visitor gets to any window is about 4.5 m — from the walkable clamp the §12.2 pitch stop of 62° cannot reach the band base on the near wall at all, so that grid only opens up as you step away from it.

**The windows are recessed, and the recess is geometry.** A painted grid on a flat quad is a decal of a building, and it read as one: from the alley floor the whole upper facade was a single unbroken plane with rectangles printed on it, which is the one thing on both walls that never catches a highlight or turns a corner. The fix is §3.4's own trick — **the recess is faked by standing everything else proud** — applied one band higher.

| Value | | From |
|---|---|---|
| Pier width | **0.65** interior, **0.325** at the bay edge | the window pitch: `(1.60 − 0.95) ÷ 2` each side, so two neighbours make one 0.65 pier and two bays butt into one |
| Pier depth | **0.12** proud of the panel | free — the jamb reveal |
| Spandrel height | `0.95` below the first sill, **1.50** between floors, the remainder at the parapet | the sill and head lines already in this table |
| Spandrel depth | **0.09** proud of the panel | below — it is not 0.12 |
| Count | **114** — 10 per west bay, 9 per east | 6 piers + one spandrel per floor gap, × 6 bays × 2 walls |
| Draw calls | **1** | one `InstancedMesh` of scaled unit boxes |
| Colour | `facade` — the panel's own base | it is the same wall, not a frame on it |

**The spandrels are 0.09 and the piers 0.12, and the 0.03 is the whole reason it works.** Piers run the full band height and spandrels the full bay width, so every one of the thirty crossings has two boxes meeting — and at equal depth their front faces are **coplanar**, which is z-fighting across the entire facade at exactly the distance where it flickers worst. Setting them 0.03 apart makes the piers win every crossing, so they read as continuous verticals with the spandrels infilling between: a concrete-frame facade, which is what these buildings are. The alternative — cutting the piers into per-floor segments so nothing overlaps — is 342 instances instead of 114 to avoid a problem one number solves.

**No shadow map is involved and none is needed.** §15 has them off and §7's ten lights are all spent in the alley. What makes the recess read is that a reveal is a *surface facing sideways*: the jamb and head faces take §7's grazing light and §5.1's lightformers at a different angle from the wall in front of them, so they come out darker without anything being darkened. **Depth in this world is normals, not shadows** — the same reason §3.4's shopfronts work at all.

**No collision.** The bays sit flush on walls at `x = ±4.5` and §3's hard clamp already stops the eye at `±3.60`. Bounding boxes are for what protrudes into the alley — the §3.2 standpipes, crates and poles. The 0.12 the piers now stand proud does not change that: it reaches `x = ±4.376` and the clamp is 0.78 m in front of it.

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
| Doorway | **0.90 × 2.05**, recessed **0.45**, at one end of the unit, side alternating | 2.05 is an ordinary door — see §16.12 on where the number came from |
| Sign box | **1.30 × 0.70** at `y = 2.85`, standing 0.14 proud, **centred over the doorway** | free |
| Fascia | `y ∈ [2.55, 4.00]`, flush | the remainder |
| **Awning** | 5 of 14, depth **1.25**, underside `y = 2.60`, front bar cylinder r 0.05 | clears the 2.55 head, stops under the 2.85 sign box |
| Service gap | **1.80**, one per wall | free |

**States: 9 closed, 3 ajar, 2 open.** Ajar is the shutter down to 0.62 with light under it, which is the shape a half-shut alley shop actually makes; open is the shutter rolled up to the head. Both ajar and open get a **spill plane** recessed in the aperture. Nine of fourteen shut, and nobody in any of them — §1 says nobody else is here, and the count is what keeps that true.

**Slats are geometry, not the §8 normal map.** §8 gives the roller shutter `normalRepeat` 24 × 1, and that value cannot survive this section: unit widths run 3.60 to 6.20, a material's repeat is shared across every instance using it, so one repeat across five widths puts the rib pitch anywhere from 0.15 to 0.26 m — a corrugation that visibly coarsens as you walk. Instanced slat boxes at a fixed **0.09** world pitch hold the same pitch on every unit and on every shutter height, and cost one draw call per variant. The `normalRepeat` figure stays in §8 for surfaces that are one size.

**Colour, and the §4 ratio.** Sign boxes carry the alley's accent, and the ratio in §4 is what assigns them: 55% magenta/pink, 30% sodium/lantern, 12% cyan, 3% blue. **It is measured over the seven *lit* boxes, not over all fourteen** — an unlit box carries no colour at all, so counting it would make the ratio describe something nobody can see. Seven gives **4 / 2 / 1 / 0**; blue rounds away, which is correct for one alley when §4 calls it *rare, distance signs only*. Within a bucket the two tokens alternate. Everything not a sign box or a spill is `shutter`, `concrete`, `metalDark` or `facade`.

**Every flat surface in the alley was one uniform value, and that is what made it read as plastic.** A `MeshStandardMaterial` with a single `color` and a single `roughness` has, by construction, the same response at every point on it — so a 6 m fascia and a 0.20 m plinth return exactly the same highlight, and §6's wet ground beside them is the only surface in frame that is not perfectly even. It is not a lighting problem and no amount of §7 fixes it. **The wall needs to vary, and the cheapest place to vary it is the material, not the geometry.**

**One height field, two maps, and it costs no draw calls.**

| Value | | From |
|---|---|---|
| Grain canvas | **512²** desktop / **256²** mobile | §3.3's precedent — a wall does not get §11.1's signage scale |
| Slots | `map` **and** `roughnessMap`, one texture | below — they cannot disagree, for §3.3's reason |
| Normal canvas | **512²** / **256²**, Sobel of the same field | below |
| Applied to | §3.1's facade boxes and kerbs, §3.4's plinth · pier · fascia · awning, §3.3's piers and spandrels | the large flat surfaces, and only those — see below for the one that could not take it |
| Repeat | `concrete` **3 × 3**, `facade` **2 × 2**, awning fabric **4 × 4** | below — UV space, not world space |
| `normalScale` | `concrete` **0.60**, `facade` **0.45**, awning **0.35** | free |
| Cost | **0** draw calls, **+2.80 MB** desktop / **+0.70 MB** mobile | §15 |

**White is the material as §4 and §8 authored it, and everything below white is damp.** That is the whole rule, and it is what lets one greyscale canvas fill both slots. `map` multiplies the §4 token, so darker texels darken it; `roughnessMap` multiplies the §8 roughness, so the same texels make it **glossier**. Those two together are exactly what a damp patch on concrete is in the rain this world is made of — darker and shinier — which is why the polarity that would be wrong on a dry wall is right on this one. And because both are multiplies, the map can only ever take a surface *away* from its authored value in one direction: **nothing in this canvas can make a surface rougher or lighter than §8 says it is.** There is no path from here to a wall that has drifted off the palette.

**Not two textures for the two slots.** §3.3 already argues this for its window bays — one image cannot disagree with itself, where two let a surface be dirty in colour and clean in gloss, which is a fault nobody finds by looking because the wall simply reads slightly wrong. The one thing worth recording is that three decodes `map` from sRGB and reads `roughnessMap` raw, so the roughness excursion arrives compressed against the albedo one. That is left alone: it is the safe direction, and correcting it would mean two textures.

**The speckle is fine on purpose, because the UVs are stretched and nothing can stop that.** Everything here is a unit box scaled per instance, so a 6.20 m fascia and a 0.30 m pier sample the same 0 → 1 UV and the texture arrives stretched by whatever that instance's aspect happens to be — up to about 4:1. A blotch or a streak stretched 4:1 reads as a smear and gives the game away instantly; **isotropic speckle stretched 4:1 is still speckle.** So the field is aggregate-scale grain with broad soft damp patches over it, and the repeat is set high enough that the features are small in UV space. This is a real constraint of instancing and it is answered by choosing the right kind of noise rather than by fighting it.

**The shutters and the small metal parts get nothing.** Slats are already geometry at a fixed 0.09 pitch — this section spends draw calls on that specifically so the shutters do not need a map — and a jamb, a lintel or a shutter roll is too small on screen to resolve a 512² texture at any distance the alley offers. Mapping them would cost the same and buy nothing.

**§3.3's window bay panel cannot take it, and the reason is worth stating rather than working around.** That material already carries a painted image in `map` *and* `emissiveMap`; the grain would have to take the `map` slot from it, which is a wall of windows with no windows in it. **The frame in front is the right place anyway** — it is the part that is actually concrete, and now that it stands proud it is the part catching §7's light at an angle. The one surface that could not have the treatment is the one that did not need it.

**Two new rungs on §8.1**, both placed against §17's rule that the only three things lit warmer than the rest are the three you can touch:

| Element | Emissive | |
|---|---|---|
| Open-shutter spill | **1.10** | above the knee, so it glows — but under the paper lanterns at 1.30 and every content surface |
| Storefront sign box | **0.85** | under the 0.90 threshold. Fourteen of these; on the bloom side they would out-glow the board |

**Seven sign boxes are lit** — the five non-closed units and two of the nine closed. An unlit box is `shutter` and not emissive at all, which is what a shut shop's sign looks like. A unit whose box is suppressed by a §3.5 neon sign is excluded before the seven are dealt, so the count survives the suppression.

**The seven lit boxes carry a painted face; the seven unlit ones stay blank.** They were built as flat coloured slabs on the strength of §3.5's rule that *the sign wins because it carries a §11.4 string and the box carries nothing* — which is the correct rule for **which of two objects competing for the same stretch of wall gets the words**, and the wrong conclusion to draw about a box on a wall that has no sign on it. At eye level fourteen blank coloured rectangles read as unfinished geometry rather than as shopfronts. §11.4 gains seven strings at indices **14 – 20**, one per lit box, assigned by index like everything else. The unlit seven need nothing: they are `shutter` with no emissive term, and a slab you cannot read is precisely what a shut shop's sign box is.

**The face is a lightbox, not a poster**, and three things beyond the string make it read as one: an inset frame a few pixels proud of the panel, a **backlight that is brighter at the centre than at the corners** because a box lit by a tube behind diffuser is never even, and grime along the bottom edge. All three come free in the same canvas that carries the text.

**They stay at 0.85 and they must.** A painted face is a reason to look at a box, not a reason to raise it: fourteen of them over the 0.90 knee is the thing this rung exists to prevent, and §8.1's knee-anchored raise deliberately leaves every sub-knee rung where it was authored. **The boxes get legible, not brighter.**

**An emissive panel takes `void` as its diffuse colour and carries the accent only in the emissive term.** Putting the accent in both — the obvious way to write it — stacks a fully-lit diffuse surface underneath the glow, so the panel reads as coloured paint instead of as a light and arrives at roughly twice the intensity §8.1 specified. Nothing in the numbers shows this; it is only visible on the wall. It applies to every emissive surface in the world, not just these.

**The spill is a 0.55 band on the shop floor, not the whole opening.** Filling an open aperture makes a 2.55 × 2.30 slab of flat `sodium` — a billboard that beat every content surface in the alley before any of them had been built. Ajar shows nearly all of its 0.62 slot, which is the point of that state; open shows 0.55 of lit floor beneath 1.75 of dark interior, which is what a lit room behind a raised shutter looks like from the street.

**Layout is generated, not placed.** Three slots are reserved for the content surfaces and no unit may enter them: west `z ∈ [−6.60, −1.40]` — **now a deliberate gap, since §2.1 moved to the bend; see §16.12** — west `[12.90, 15.10]` for §2.3's payphone, east `[5.10, 6.90]` for §2.2's vending machine. What is left is five segments; the seven units per wall are apportioned across them by length (largest remainder), widths are drawn to fit with no two neighbours equal, and the slack is spread evenly as joints. One designated joint per wall widens to the 1.80 service gap.

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
| Projection | face plane **0.55 – 0.72** from the wall, varied | must clear §3.4's frame — below |
| Bracket | 0.05 square, wall to panel, `metalDark`. **Two on a vertical sign**, at ±**0.28** of panel centre; one on a horizontal | below |
| Mount | base `y ∈ [2.90, 5.20]` | above §3.4's 2.55 aperture head, below §3.1's 6.50 cable band |
| Tube rim | **0.03** proud all round, `meshBasicMaterial` at full colour | §8's neon tube |
| Face emissive | **2.40** | §8.1, *vertical signs* |
| Strings | §11.4 **by index**, signs take 0–8 | §11.4 |
| Flicker | indices **3 and 7** | §11.3 |
| Colour | §4 ratio over 9 → **5 / 3 / 1 / 0** | §4 |

**A sign must project clear of the shopfront it is mounted on, and where it does, the lightbox under it goes.** Two rules, from one fault. §3.4's frame stands 0.35 proud and its sign box 0.14 further at 0.49, so a projection starting at 0.30 hangs the panel *inside* the fascia — the minimum is 0.55. That stops them intersecting but not stacking: a projecting sign and a flush lightbox on the same stretch of wall still read from the street as one cluttered object with a blank slab hung under it. So **a §3.4 sign box is suppressed wherever a §3.5 neon sign claims its span, plus 0.25 of clear air either side.** The sign wins because it carries a §11.4 string and the box carries nothing.

Five of the fourteen units lose their box this way. **The suppression is resolved before the lit boxes are dealt**, so a suppressed unit does not consume one of §3.4's seven — otherwise the alley quietly ships six while every count in this document still says seven.

**The projection range closed from 1.15 to 0.72, and the floor of 0.55 did not move because it cannot.** The paragraph above derives it: §3.4's frame stands 0.35 proud and its sign box 0.14 further at 0.49, so anything under 0.55 hangs the panel inside the fascia. What was wrong was the *top* of the range — a 1.15 m bracket is a 0.05 m bar cantilevered more than a metre off a wall to hold a lit box, which is not how signage is mounted and reads as a panel floating near a building rather than fixed to it. **Shortening happens by compressing the range downward onto its derived floor**, never by lowering the floor.

**A vertical sign gets two brackets and a horizontal gets one, because the load is different in the two cases.** A horizontal panel is 0.52 high and a single central bar spans most of it. A vertical panel is up to 2.26 tall on a 0.44 width, and one bar at its centre leaves a metre of unsupported panel above and below — the thing it most looks like is a sign about to rotate. Two at **±0.28** of the panel centre put the fixings inside the panel's own height at every one of the six verticals, including the shortest.

**All fifteen brackets are one draw call, and this is what paid for the rest of this pass.** They share a geometry and a material — the only thing that differs is a transform — so they are one `InstancedMesh` rather than fifteen meshes. §15 asks for exactly this: *instance harder before deleting anything.*

**The saving is −8, and the first figure written down was −14.** Nine brackets existed before this section, not fifteen; the larger number came from taking the *post-change* count as the baseline, which double-counts the six being added. The measurement is what caught it — 102 desktop calls before, with nine separate bracket meshes. Nine → one is **−8**, and adding six more inside the same instance costs nothing, so the alley's call count still *falls* while gaining six brackets. Mobile goes 90 → 82 and §10's ripple emitters fit in the room that makes. **It is still the change that pays for the rest; it pays a little less than claimed.**

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

### The brand sign, and what it cost the board run

**Two boards came out and the studio's name went in**, at `x = 3.70`, **3.40 × 1.60**, centred at `y = 2.60` so it sits above the board band rather than in it. Two rows, two colours: `JACINTO` in `neonMagenta` over `DESIGN` in `neonCyan` — §4's signature over §4's spice, which is the one pairing that reads as branding rather than as another shopfront.

**`x = 3.70` is the only interesting number here.** §3.1 shows the far wall through a 3.36 m slot, and the visible window *moves with the visitor*: from spawn it is `x ∈ [1.42, 5.40]`, from mid-alley `[1.66, 6.13]`, and the intersection over the whole spawn-to-mid half is only **`x ∈ [3.29, 4.67]`, 1.38 m wide**. A sign centred anywhere else on that wall disappears for part of the walk. 3.70 sits inside that band, so the name is in frame from the moment the visitor turns to face the alley.

**It is a glimmer from spawn and that is accepted, not overlooked.** At 52.2 m through §5's `FogExp2` 0.0300 the far wall is at **0.086 transmittance**; mid-alley **0.382**; from §3's clamp at the bend **0.892**. So the sign resolves as you walk toward it and is never a greeting. §5's density was derived twice and settled, and §3.6 already says the street *"reads properly from about the last twelve metres of the alley"* — this is that sentence applied to the one thing out there that has a name on it.

**The canvas is 512 × 256, not §11.1's 4 px/cm.** Four px/cm on 3.40 m asks 1360 and pads to 2048, which is 16 MB with mipmaps against 1.06 MB of headroom. 512 across 3.40 m is 151 px/m — coarse by this world's standards and correct here, because the thing is never seen closer than 11 m and is behind 0.11 to 0.91 of fog at every distance it *is* seen from. **0.67 MB**, taking desktop to 18.0 of 18.

**Twenty is where §4's blue now rounds in.** The ratio over 20 gives **11 / 6 / 2 / 1** — cyan drops from three to two and **blue survives**, which was the thing worth checking before removing anything. Twenty-two used to be the number where blue rounded in; two fewer still carries it, and sixteen would not. The one blue board is on the most distant lit surface in the world — which is what §4 means by *rare, distance signs only*, arrived at by the ratio rather than by an exception made for it. Every count before this one (14 sign boxes, 9 signs, 7, 6) rounded it away.

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

**The carriageway is wet, and it was the only ground in the world that was not.** §6.1's reflector stopped at `z = 26.0` and this road starts at 26.2 — a deliberate 0.2 m gap so no material seam landed under a light — with the consequence that looking out of the alley mouth you saw forty metres of mirror end in a flat dark band exactly where the traffic is. **A boundary chosen to hide a seam produced a much louder one**: the road read as a different substance rather than as the far side of a junction.

The strip now runs to `z = 33.0` and takes the whole carriageway with it, so the far building's lit panels, §3.6's own headlights and the cars themselves land in the road under them. **It costs no extra render pass**, which is why it is the answer rather than a second reflector: `MeshReflectorMaterial` renders the scene once from a mirrored camera into a fixed-size target, and that target does not grow with the plane. What it costs is **resolution spread** — the same texels over 13% more length, so every reflection in the world is 13% coarser. A second reflector would have kept the alley sharp and doubled §15's most expensive pass to do it, for a road seen through a 3.36 m slot at 30 m through §5's fog. **That is the wrong trade and it is worth naming, because *add another one* is always the first idea.**

**§13 — the traffic holds still.** Cars stop where they are, lights on, rather than slowing: a slower car reads as broken in the same way §13 says slower rain does. Peripheral motion glimpsed through a 3.36 m slot is close to the worst case reduced motion exists to remove, and nothing is lost by removing it, because there was never anything out there to reach. The hold positions above put one car in each lane inside the sightline from spawn, so what a reduced-motion visitor meets is stopped traffic rather than an empty road.

**Measured, and both numbers are worth keeping.** Desktop peaks at **84 draw calls** of §15's 140, looking down the alley from spawn with the whole world in frame. **Mobile peaks at 80 of 90**, and that is the number to watch: §3.2 still owes eleven inventory lines, §2 owes three content surfaces and §9 owes a post-processing chain, against ten calls of headroom. The street is not where that gets paid back — it is eight calls for the envelope and eleven for six vehicles, all of them instanced — but it is where the ceiling became visible.

**Nothing here is legible from spawn, and that is §5 rather than a fault in this section.** From the middle of the alley the carriageway is at **0.21 transmittance** and the far wall at **0.14**; from spawn the far wall is at **0.088**. The opening subtends about **4.6°** from there — roughly a sixtieth of the frame — and §7's lantern light at `z = +19` lays a saturated red pool directly beneath it. The street reads properly from about the last twelve metres of the alley and is a coloured glimmer before that. §3.1 already says the far end is *legible but never resolves*, and this is that sentence measured. **The only lever that would change it is §5's fog density**, which was derived twice and settled; §9's bloom will not do it either, since a fogged board lands well under the 0.90 knee.

**Texture cost: two painted alphas.** A 128 × 128 radial ellipse for the underglow and tail smear, and a 128 × 128 forward beam for the headlight pool — 64 × 64 on mobile. **0.17 MB desktop**, taking §3.5's measured 14.66 to **14.84 against §15's 14 MB**. The window bays and the panels add nothing. This does not change the answer in §3.5: the budget is what wants revisiting, and it wants revisiting once, with §16 items 1 and 6.

### 3.7 Street props — the band you walk through

The rest of the §3.2 inventory that stands on the ground: **4 dead vending machines, 4 scooters, 9 crate stacks, 2 cones and a barrier, 22 standpipes, 2 utility poles, 11 paper lanterns**, plus three things this section adds — **a food cart, 2 rubbish points and the guardrail across the alley mouth**.

§3.4 built the wall and §3.5 built everything above head height. This is the layer between them, and it is the only one the visitor can walk into. **Everything here is boxes and cylinders**, the §3.4 vocabulary, for the reason §3.4 gives: sculpted geometry in this alley would be one object at a fidelity nothing around it shares.

**Carries nothing** (§2.4). No strings, nothing clickable, nothing raycast against.

| Object | Count | Size (along alley × deep × high) | Solid |
|---|---|---|---|
| Dead vending machine | 4 | **1.12 × 0.82 × 1.94** — §2.2's body verbatim | yes |
| Food cart | 1 | **2.10 × 1.00 × 2.10** | yes |
| Scooter | 4 | **glTF model**, scaled to **1.75** long → 0.66 × 1.28, leaning **8°** on a side stand | yes |
| Crate | 9 stacks of 2–4 | **0.52 × 0.36 × 0.31** each | yes |
| Traffic cone | 2 | base r **0.17**, top r **0.035**, **0.56** high, on a 0.36 foot | yes |
| Barrier | 1 | board **1.20 × 0.20** at `y ∈ [0.56, 0.76]`, legs splayed 10° | yes |
| Rubbish point | 2 | drum r **0.30** × **0.74** high, lid r 0.32, two sacks beside it | yes |
| Standpipe | 22 | r **0.055**, from `y = 0.10` to 2.60 or 4.00, two clamps each | 12 of them |
| Utility pole | **2** | r **0.11**, **8.40** high, crossarms at `y = 6.40` and `7.10` | yes |
| Paper lantern | 11 | shade r **0.135** × **0.36**, on a 0.34 bracket arm at `y = 3.46`, **painted paper** | no |
| Mouth guardrail | 1 | 5 posts 0.07², two rails at `y = 0.84` and `0.52` | yes |

**The vending machines are §2.2's machine, unlit — and that is the whole point of them.** The bio station *is* a vending machine (§2), so five more of the same object is the strongest thing this world can do to make one of them mean something: the lit one is the only lit one in the alley, and it is the one you can open. They therefore take §2.2's body dimensions exactly rather than a size of their own, carry §2.2's 0.96 × 1.42 front panel as a `void` slab instead of a `vendGlow` one, and get no emissive term at all. §3.2 already said *unlit, dark*; this records why that line is load-bearing rather than a detail. **Lighting them is the single most tempting change in this section and it would cost the bio station its meaning.**

**Where things stand: 0.20 from the wall, which is the §3.4 plinth.** Wall props put their **back face at `|x| = 4.30`** — the wall plane at ±4.50 less the plinth's 0.20 depth — so nothing sits inside the storefront that is already there. What that means for the visitor is the interesting part: a 0.82-deep vending machine reaches `|x| = 3.48` and the food cart reaches `3.30`, both **inside §3's clamp at ±3.60**. See the collision note below.

**Utility poles stand at `|x| = 3.72`, on the gutter line, not against the wall.** §3.4's fascia projects 0.35 across the full width of every unit from `y = 2.55` up, so an 8.4 m pole anywhere behind `|x| = 4.15` is buried in the fascia for three quarters of its length. The gutter centre is the line §3 already draws down the alley, and a pole on it clears everything — at the cost of standing 0.11 m inside the walkable band, which is what a utility pole in a Tokyo alley actually does. **No pole stands in front of an awninged unit**: the awnings reach `|x| = 3.25` at `y ∈ [2.60, 2.67]`, so those five z spans are closed to poles on that wall.

**No pole stands within 1.30 m of a lit sign, and this took four passes and three screenshots to write down.** It is the same fault every time: a pole reaches 8.40 m and is the only prop that goes above 2.60, and a lit sign box at `y ∈ [2.85, 3.55]` or a §3.5 sign at 3.00 – 3.36 is the only thing on the wall up there — so where their `z` ranges meet, the pole runs down the middle of the one thing on that wall anybody is looking at.

**A `z` gap is not the test, and believing it was is what let this recur.** A pole stands at `|x| = 3.72` and a §3.4 sign box faces `|x| = 4.01`, so there is **0.29 m** of depth between them; a §3.5 sign projects to `|x| = 3.78`, which is *inside* the pole's own 0.22 m diameter and therefore an intersection rather than an occlusion. At 0.29 m of separation the two are effectively coplanar, and every clearance that matters is the one along the wall.

**1.30 m, derived rather than eyeballed.** A visitor on the centre line sees the pole's silhouette land not on the pole's own `z` but at `z_pole + (M − 1)(z_pole − z_eye)`, where `M = d_sign ÷ d_pole = 4.01 ÷ 3.72 = 1.078`. Walking the length of the alley, that term swings ±3.3 m, which would put every pole in the world inside some sign's exclusion zone — and it is over-strict, because at 20 m through §5's fog a 0.22 m pole across a 1.30 m sign reads as depth, not as a fault. Scoped to the range where a sign is actually legible and dominant, **±8 m**, the requirement is `Δ > (halfWidth + poleRadius·M + 0.078·8) ÷ 1.078` = **1.29**. The figure a screenshot gave was 1.2. Taking 1.30.

**Held as 0.55 m of clear air between the two edges rather than as 1.30 centre-to-centre**, because a §3.4 sign box is 1.30 wide and a §3.5 sign is 0.70, and one centre distance applied to both is two different rules wearing one number. `0.55 + 0.65 + 0.11` returns the 1.31 the derivation asked for on a sign box, and the same constant means the same thing on a sign that is half the width.

**It applies to lit signs only, and that is not laziness.** An unlit sign box is `shutter` with no emissive term — a dark slab on a dark wall — and a pole in front of one is invisible from any angle. Extending the rule to all fourteen would close most of both walls to poles in order to protect something nobody can see.

**The count went 6 → 2, and `audit()` moved every one of them.** Two poles were standing in front of lit sign boxes and it took a screenshot to notice. The first move put two of them under an awning — `pole-through-awning`, a rule that had been in this file since §3.7 and had never once fired, firing twice on a single edit. The remaining east pole then failed a `z`-gap check that was measuring the wrong thing, and the two placements that satisfied *that* landed on a rubbish point and a scooter. **Four `audit()` failures on four consecutive edits is the wall saying it has no room**, and the honest response is to accept it: the east wall between `z = −15` and `−9` carries an awning, a lit box, §3.5's sign 1, a rubbish point and a scooter, and a prop that has to be shuffled five times to satisfy rules it keeps breaking was never placed, only fitted.

**The lesson belongs to the audit, not to the poles: a placement rule that only lives in a comment is a rule that has not been checked.** `pole-through-sign-box` existed as a paragraph in `lib/props.ts` for two passes while the fault it describes shipped twice. It is a real rule now, alongside the five that were already catching things nobody was looking for.

**Standpipes run at `|x| = 4.09`, in front of the fascia rather than behind it**, for the same arithmetic one line up — 4.15 less the pipe radius. Their z positions are the §3.4 joints, which is where a downpipe between two buildings goes, and which are uneven for free because §3.4 generated them.

**The scooter is a glTF model, and it is the second time this world has bought one.** §3.2 argued that five primitives read as one object at 20 m, which is true, and irrelevant to where three of the four actually stand: on the walkable band beside a wall the visitor walks along, at about 2 m. At 2 m a floorboard, a cowl, a leg shield, a seat and two discs read as a stack of crates. **The vocabulary rule was never "boxes and cylinders"; it was "nothing at a fidelity nothing around it shares"** — and §3.6 spent that argument in the other direction for the cross-street cars, because a box car at 40 m is a box. This is the same sentence at 2 m.

| Value | | From |
|---|---|---|
| Model | `public/vespa.glb` — Quaternius, CC0, via poly.pizza | the same source and licence as §3.6's three cars |
| Weight | **88 kB**, 1 665 triangles, no embedded textures | measured |
| Target length | **1.75**, nose to `+X` | §3.2's own figure, unchanged — the model is scaled to the world, never the reverse |
| Measured after scaling | **1.75 × 0.66 × 1.28** | §3.6's rule: normalise, then *measure*, never predict |
| Materials | its 5 → §4's **3**: `shutter` body, `void` tyres, `metalDark` frame | below |
| Draw calls | **+3** — one `InstancedMesh` per merged material, four scooters in each | below |
| Triangles | **+6 660** across all four | 1 665 × 4 |

**Its five materials collapse to three, and they are the three §3.2 already named.** The model ships a light body, a near-black, a dark grey, an 8-triangle gold and a 12-triangle chrome; the last two are a headlamp lens and a mirror on a scooter that is parked at 3am with nobody on it, so they fold into the frame. What comes out is `bodyColor` `shutter`, `darkColor` `void` and `metalColor` `metalDark` — **the exact three tokens `PROPS.scooter` has declared since it was five boxes.** The mapping was not designed to land there; it landed there because a scooter has a body, tyres and a frame either way.

**Merged per material, then instanced — `lib/carModels.ts` already does this and is reused verbatim.** Mounted as authored the model is five primitives per scooter, twenty draw calls for four parked bikes. Baked to world space, merged by material and mounted as one `InstancedMesh` per merged part, it is three for all four. That file was written for §3.6 with one caller; this is the second, and it needed no changes — which is the test of whether the split between *what a model is* and *where it stands* was drawn in the right place.

**It leaves §3.7's twelve buckets alone.** The box scooter's parts shared `InstancedMesh`es with the crates, the vending machines and the cart — they were free at the margin, so this genuinely costs three calls rather than trading them. §15's mobile column is over cap and this makes it worse; see there.

**Nothing is evenly spaced, and the positions are authored rather than generated.** §3.5's nine signs and §3.6's six vehicles set the precedent: a list this short is better read than run. The lists live in `lib/props.ts`, not here — this section gives the sizes, the counts and the rules, the way §3.5 gives them for the signs. What is *derived* is the **standpipe** anchors, which come off §3.4's generated joints.

**This sentence used to say "the standpipe and lantern anchors" and it was wrong** — in the code only the standpipes were ever derived; the eleven lanterns are a hand-authored list like the signs and the vehicles. It is corrected rather than made true, because deriving them is the worse option: §3.4's joints leave only 0.04 – 0.10 m of clear air beside a lit sign box, and six or more of the arms would pass through a tall standpipe.

**Two lanterns were occluding a lit sign box, and it was occlusion rather than intersection.** A shade hangs at `y ∈ [3.000, 3.360]`, entirely inside a box's `y ∈ [2.85, 3.55]`, and 65 mm in front of its face — nothing touched, and the shade simply blanked the middle of a painted sign. §3.7 therefore gains the rule §3.5 already has for the same class of problem: **a lantern clears a lit sign box's span by the same 0.25 m of air a projecting sign claims**, and `audit()` enforces it. The two clearances are one exported constant, because two that drift apart are two rules and only one of them is the one written here.

**The rule matters more than the two moves it forced.** §3.4's layout is *generated* — a seed change or a fifth unit width silently re-rolls every box's z — so the next collision would arrive unannounced and be found, as these two were, by looking at a screenshot. That is the gap §16.7 recorded when `audit()` moved three props before anything was drawn.

**The lanterns are paper, and a bare cylinder is not.** A 提灯 is a candle inside a ribbed paper shade, and what identifies it at four metres is not its silhouette — a cylinder has that already — but the **horizontal ribs banding it**, brighter paper between them and a darker line on each rib where the frame blocks the light. One 256² canvas, painted once and shared by all eleven, carries: **9 ribs** across the shade's height, a vertical seam, and a falloff that is brightest at the shade's waist because the light source is inside it and the top and bottom gather toward the fittings. Used as both `map` and `emissiveMap`, so the ribs are dark in the lit term as well as the diffuse — a rib that glows is a stripe, not a rib.

**One canvas for eleven, and the instancing is why.** §15 already lists lanterns among the instanced meshes; sharing the material is a precondition of that, so the texture cannot vary per lantern. It costs **0.35 MB** and buys the identity of the most-repeated warm object in the alley.

**Two things light up, and neither is on the ladder twice.** The food cart's canopy is lit from underneath at **`sodium`, emissive 1.10** — §8.1's open-shutter rung, reused rather than extended, because it is the same phenomenon: warm light falling out of a place with nobody in it. The paper lanterns go to **1.75 authored / 2.77 raised**, up from 1.30 and then 1.50: eleven of them are the warm spine of this alley and they were reading as dull red shapes rather than as lit paper. The cones' bands, the vending fronts and the guardrail are lit by §7 or they are not lit at all, which at 3am is the honest answer for all three.

**And two of the four scooters have their headlamp on**, which is the one thing a parked vehicle can do to stop reading as scenery. The model's `Material.004` is 8 triangles at the nose — narrow, high, forward — which is a headlamp lens and nothing else; it was folded into `metalColor` when the model landed because it was too small to earn a draw call, and switched on it earns one.

| Value | | From |
|---|---|---|
| Lit | **2 of 4** — `scooter:0` at west `z = −18.3`, `scooter:2` at east `z = +8.4` | below |
| Colour | **`signWhite`**, emissive **§8.1's `vehicleHeadlight` rung** | §3.6's car headlights, verbatim — same object, same job |
| Cost | **+1** draw call | the lens leaves `metalColor` and becomes its own instanced mesh over the lit two |

**Which two is the point, not how many.** One sits 1.2 m from §12.1's spawn so the visitor meets it in the opening beat; one is mid-alley on the opposite wall. The pair reads as *a couple of them* rather than as a rule about scooters, and four lit headlamps in forty-four metres is a car park. **The dark two have no lens at all** — eight triangles of unlit acrylic on a near-black bike at 3am is nothing to look at, and drawing them would cost a second instanced mesh to render what cannot be seen.

**`signWhite` and not a warm token, and §17 decides that** exactly as it decided §3.6's cars: *three things are lit warmer than everything else and they are the only three you can touch.* A warm headlamp two metres from the visitor would be the fourth.

**§17 survives the food cart, and the lanterns are the proof.** *Three things are lit warmer than everything else and they are the only three things you can touch.* Eleven paper lanterns at 1.30 already sit **above** the cart's 1.10 and were always in §3.2 — if eleven of those do not break the sentence, one cart does not. It also carries **no dynamic light**: §7's cap of ten is fully spent, and what actually makes the three content surfaces dominant is that each has a light of its own (§7 #2, #4, #5). An emissive material illuminates nothing but itself. The cart sits on the east wall at the far end, past the payphone, so it is the last thing before the bend and the first warm thing that is not a destination.

**Collision — these are the first boxes in this world that can actually fire.** §3.4 registered fourteen units' worth of AABBs and said outright that every one of them is inert, because the deepest storefront part stops at `|x| = 4.05` and §3's clamp has already stopped the eye at ±3.60. That changes here. A vending machine's front face at 3.48 resolves the eye to **3.16**, the food cart's at 3.30 resolves it to **2.98**, and the cones and the barrier stand in open alley at `x ≈ −1` where there is no clamp at all. **§12.4's resolver has been shipped and never tested against anything; this is the section that tests it**, and it is verified by walking into each of them rather than by assertion.

**The guardrail is a visible reason for a stop that already happens, not a new barrier.** §3.6 settled that the cross street is unreachable — the clamp stops the eye at `z = +21.40` against a carriageway starting at 26.20 — but from inside the alley that stop has no cause you can see, and an invisible wall reads as a bug in a world whose whole premise is that you may walk to the end of it. The rail spans the §3.1 opening, `x ∈ [0.90, 4.15]` — stopping on §3.4's frame face rather than on the wall behind it — at **`z = 21.755`**, which is not a round number and is not free. Half a 0.07 post puts its near face at **21.72**; less §12.4's 0.32 radius, the resolver's stop is **21.40**, which is §3's clamp exactly. The clamp is therefore what fires and the rail is exactly where it fires — the visitor stops with the rail at arm's length and nothing about the stop is unexplained.

**It is a pedestrian railing and not a solid panel, and §3.6 is why.** That section spent its whole budget on a 3.36 m slot: 22 far-side boards spaced against a 4.2 m sightline, six vehicles on a 240 m loop timed to cross it. Closing the slot with a hoarding would delete all of it. Two horizontal rails on five posts stop the visitor, say *road*, and leave the traffic visible through them.

**A kerbside guardrail at `z = 26.20` was considered and rejected.** It is where a real one goes, and it is 4.8 m past a clamp nobody can reach — scenery answering a question the visitor has already stopped asking. The rail belongs where the stop is.

**Contact-AO decals, at last.** §7 asks for a painted radial decal — `void`, opacity 0.55, 1.4 × 1.4 — *under every solid object*, and nothing in the world has had one. Free-standing props on §6's reflector are where their absence finally shows: a crate stack on a mirror with no contact darkening reads as pasted on. They go under every prop here, at `y = 0.010` — above §6.1's strip at 0.004 and below §3.6's road glow at 0.014 — at **each prop's own footprint × 1.55**, since §7 gives one size for objects that are not one size and 1.4 m of shadow under a 0.36 m cone is a stain rather than a contact. The multiplier lands a vending machine on §7's own figure and scales the rest off it. **The texture is free**: §3.6's painted radial pool alpha is already in memory and is exactly a radial falloff. §3.4's fourteen storefronts still owe theirs.

**Drawn by material, not by object — twelve draw calls for sixty-four props.** Every part is bucketed on `(geometry, material)`, so a crate, a scooter cowl and a vending machine body are one `InstancedMesh` because they are the same box in the same dark. Drawn per object this section alone would be sixty-four calls. Two hundred and twenty-five parts, twelve buckets, plus one instanced pass for the decals.

| Measured | | |
|---|---|---|
| Desktop peak | **101** of §15's 140 | at spawn, whole alley in frame |
| **Mobile peak** | **95 of 90** | at spawn, and identical from the north clamp |
| Triangles | 157 k desktop / 89 k mobile | of 350 k / 220 k — not close |
| Collision boxes | 38 prop boxes of 66 in the world, of which **25 can fire** | see below |

*(Re-measured after the §2.1 board, the scooter model and its headlamp, and §3.3's reveal grid. It was 99 / 93 with 43 boxes when this section shipped; the board and its neighbours account for the rest. Taken as the frame **maximum** through a wrapped `gl.render`, because §9's composer calls it about 24 times a frame and `renderer.info` resets on every one of them.)*

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
| `facade` | `#1C2333` | building walls |
| `facadeWarm` | `#251E2C` | west facade, faintly warmer |
| `shutter` | `#272F3F` | roller shutters |
| `concrete` | `#2E3646` | kerbs, plinths, poles |
| `metalDark` | `#353F51` | brackets, condensers, railings |
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

### 4.1 The five structural darks were albedos, and they were authored as screen colours

**The props could not be seen, and no amount of light was ever going to fix it.** Measured: `facade` **0.82%** reflectance, `shutter` **1.22%**, `concrete` **1.51%**, `metalDark` **1.93%** — all in linear, all darker than charcoal, which is about 4%. Real aged concrete is 20–30%; a painted steel shutter is 15–30%. **These five tokens were three to twenty times darker than the materials they are named after.**

That is what a colour picked by looking at a dark render will always be, and it is a category error worth naming: **a hex in this table is an albedo, not a pixel.** It says what fraction of light a surface returns, and the darkness of the scene is supposed to come from §7 having almost no light in it and §5 eating what is left. Authoring both — a dark scene *and* surfaces that return 1% — multiplies the two, and the product is black.

**The proof was in the failed fix.** Raising §7's hemisphere eight-fold and the five alley lights three and a half times changed the wall barely at all; lifting these five tokens changed it completely at the *authored* light intensities. 1.2% of a large number is still a small number. The lights were never the problem.

| Token | Was | Now | |
|---|---|---|---|
| `facade` | `#10141D` | **`#1C2333`** | 0.82% → 3.1% |
| `facadeWarm` | `#151119` | **`#251E2C`** | — |
| `shutter` | `#161B24` | **`#272F3F`** | 1.22% → 4.7% |
| `concrete` | `#1A1F28` | **`#2E3646`** | 1.51% → 5.8% |
| `metalDark` | `#1E242E` | **`#353F51`** | 1.93% → 7.4% |

**One factor, applied to all five: ×1.75 on each sRGB channel, which is ×3.83 in linear.** Scaling rather than re-picking is what keeps §4's hues and the relationships between them exactly as they were — the five stay in the same order, the same distance apart, and the same blue-grey. **A palette is a set of relations; re-choosing five colours by eye would have changed all of them to fix one.** They are still dark: 3–7% is a *dim* wall, well under the real materials, which is right for a world where §6 wants the ground to win.

**`void`, `asphalt` and `asphaltWet` are deliberately not in this list.** `void` is the reference black — the background, the shutter backings, the doorway panels, the tyres — and lifting it would turn every hole in this world into a grey patch. The two road tokens are §6's, and §6 measured them against a reflector across an entire section; the ground was never the surface that could not be seen.

**Checked against §17 rather than assumed.** At spawn, mean frame luminance by region: **ground 53.9**, west wall 27.0, east wall 20.5, upper facade 5.4, out of 255. The ground is still roughly twice the brighter wall, which is *the ground is the brightest thing in the frame* holding with room to spare — and it is now true because the ground is bright rather than because everything else was invisible.

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

| | Form | Size | Position | Colour | Intensity |
|---|---|---|---|---|---|
| **Fill** | uniform | every direction | — | **`#33445F`** | — |
| 4 | rect | 12 × 2 | `(0, 11, 0)` | `void` | 0.4 |

**Four shaped formers came off and one uniform fill went on.** The four were `neonMagenta` 4 × 10 at `(-6, 5, -4)`, `sodium` 4 × 10 at `(6, 5, 8)`, `neonCyan` 3 × 8 at `(-6, 4, 14)` and a `lantern` ring of 6 at `(0, 3, 22)`. Reflected in §6's 0.18-roughness floor they arrived as a saturated red disc and two coloured slabs lying across the alley with nothing above any of them, and **nothing could ever be put above them** — §7.1 has the geometry of why.

**The fill is allowed exactly where they were not, and the distinction is shape.** A uniform environment has no edge, no size and no position; there is nothing in it that can read as an object, so there is nothing that needs a source. It is also the only form the replacement could take: §7.1 measured the environment at **68% of the frame**, carried through *reflection* in the wet ground, and a hemisphere light swept from 0.35 to 4.0 moved that frame by 5%. Every albedo in §4 is near-black by design. What lights this alley is what it reflects.

**The hue is derived; the level was solved twice, and the first answer was wrong in an instructive way.** The hue is §7 light 1's `skyColor` `#121A2B` — this document's own statement of what is overhead. The level was first solved by matching the frame's **mean luminance** to what the four formers had been producing, which gave `#4D649A` and matched to 0.3% on the first try. It was still wrong, because **the mean was never the thing worth matching**: the old mean sat in three saturated patches, and spreading the same total evenly across the sky put most of it on the floor.

**A wet road at grazing incidence is a mirror of the sky, so a uniform sky is a uniform road.** That is not a bug in §6 — it is what §6 is for — but it turns the alley's darkest, most reflective surface into an evenly lit pale sheet, and the picture §6 promises stops being the alley and becomes the weather. Measured down the centre line at spawn:

| Fill | Road at 25 m | at 8 m | at 3 m |
|---|---|---|---|
| `#4D649A` — matched to the old mean | 37, 61, 114 | 14, 27, 60 | 5, 13, 34 |
| **`#33445F`** — set against the road | **16, 31, 54** | **4, 11, 23** | **0, 2, 5** |

`#33445F` roughly halves the reflected sky. The road darkens toward the viewer, which is what wet asphalt does, and the alley stays legible. **This is the one value in this section chosen by looking rather than solved**, and it is the one to move if the balance is wrong.

**It is not a sky, and §1 is intact.** §1 and §3.1 forbid a visible sky and a vanishing point, and this adds neither: nothing is drawn, `scene.background` is still flat `void`, and the fill is only ever seen at second hand in a reflection or a specular. What it represents is the low overcast a city at 3am is lit from underneath by — which is also the honest answer to why an alley with no sun and no streetlight is not pitch black.

**Number 4 stays because it is not a colour.** `void` at 0.4 across the top of the alley is the dark ceiling this street actually has: it gives the metal a gradient to be shiny *against*, and it produces no shape because there is no shape in it. Raising it was tried first and does almost nothing — `void` is `#04060B`, so scaling it scales nearly zero. The gap in the numbering is deliberate: §7.1 refers to the four by their original indices.

---

## 6. Wetness and reflection — the single most important surface

The ground is the picture. Budget for it first, cut it last.

| Value | Desktop | Mobile |
|---|---|---|
| Reflector resolution | **1024** | **512** |
| `blur` | `[420, 100]` | `[240, 60]` |
| `mixBlur` | **4.0** | **4.5** |
| **Reflection gain** | **1.35** | **1.35** |
| `mixStrength` | *derived from the gain* — **446** | **446** |
| `mixContrast` | **1.00** | **1.00** |
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

### 6.0 The reflection was in the buffer the whole time, arriving at 2.4% strength

**Three of the numbers above were authored against the wrong model of what the material does with them**, and the consequence was that this world's single most important surface showed nothing but the sky. The alley was fully reflected in the road from the first day; none of it was reaching the screen.

**drei's reflector does not add the reflection, it multiplies it into the albedo.** The one line that matters:

```glsl
diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
```

`diffuseColor` here is `asphaltWet` `#070A11`, which is **linear `(0.00212, 0.00304, 0.00561)`** — luminance `0.00303`. So `mixStrength` does not scale the reflection to a fraction of itself; it scales it to `mixStrength × 0.00303` of itself. At the authored **8.0** that is **2.4%** in luminance — and per channel `(1.7%, 2.4%, 4.5%)`, because the multiply is per channel and this albedo is blue-tinted. Two per cent of a neon sign on a dark road is nothing. Measured across the road at 9 m, side to side, the standard deviation was **0.37 of 255** — a mathematically flat sheet, identical to the byte at `x = ±3.6` and `x = 0`.

**So the meaningful quantity is the product, and the brief now states the product.** `mixStrength × lum(asphaltWet)` is the *gain*: the fraction of the reflected radiance that reaches the eye. Unity is `1 ÷ 0.00303` = **330**. The gain is authored at **1.35** and `mixStrength` is derived — `1.35 ÷ 0.00303` = **446** — and that derivation is not decoration. `mixStrength` is `1/albedo` in disguise, so a future change to `asphaltWet` would silently rescale every reflection in the world by the same factor it changed the road's colour. Written as a gain it cannot.

**Nothing else can do this job.** The road's own brightness is `albedo × (1 + gain)`, so raising the albedo to let the reflection through pales the road in the same stroke — and a dark road with neon in it is the entire look. `mixStrength` is the only dial that lifts the reflection while leaving the base alone: measured over `8 → 446`, the road's mean at 9 m moved 21.9 → 24.1 while the neon in it went from nothing to a peak red excess of 211.

**`mixContrast` above 1.00 is a subtraction, not a contrast.** It is `newMerge = (merge − 0.5) × mixContrast + 0.5` — a recentre about 0.5, which is a sensible contrast curve for a reflection that lives *near* 0.5 and a destructive one for this alley, where the reflection lives at 0.01–0.10 and every value is on the low side of the pivot. It subtracts a constant, and `mixStrength` then multiplies that constant by 446. At the authored 1.20 the road's mean at 9 m collapsed from **24.1 to 8.3** while the peaks stayed — the picture lost its floor and kept its highlights. **1.00 makes `newMerge = merge` exactly**, which is the only setting under which the gain above means what it says.

**`mixBlur` is divided by the roughness twice before it reaches the blur.** The shader is `blurFactor = mixBlur × roughness × roughnessMap.g`, and with §6's roughness of 0.18 and §6.2's mask values of 0.06 and 0.55 the authored **0.85** produced **0.9% blur in the puddles and 8.4% on the dry patches** — so the mask that §6.2 spends a whole subsection generating was, as far as the reflection was concerned, not there. **4.0** puts the dry patches near 40% and leaves the puddles close to sharp, which is the wet/dry difference the mask was drawn to carry. Mobile's 4.5 keeps the original tier relationship, and mobile's higher roughness makes the same number blur slightly more, which is what it should do.

**None of the three costs anything.** All are uniforms on a material that was already compiled with the blur pass enabled; the draw-call and pass counts are unchanged.

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

  **Fine isotropic stipple**, no direction. **512² desktop, 256² mobile**, a height field summed from ~140 Gaussian dimples of 6–22 px radius wrapped toroidally so it tiles seamlessly, plus one faint low-frequency wave so the eye does not find the grid, then Sobel to normals. At repeat 8 across the 12 m strip each tile is 1.5 m, putting the dimples at 2–7 cm — raindrop scale. The §10 ripple emitters own the expanding rings; this is only the resting texture beneath them, and a second directional cue on top of the scroll would read as a texture sliding rather than water sitting.

  **Height-to-normal slope: 1.1.** This is the map's own strength, before `normalScale` scales it, and it matters more than it looks like it should. At the grazing angles a 1.68 m eye height gives across a 46 m alley, a small normal perturbation swings the reflected ray a long way, so this value decides how far a reflection breaks up. Authored at 2.4 it shredded every reflection edge into long torn slivers; 1.1 keeps the break-up at the scale of rain on a film of water, which is the wet-pavement look §1 is describing. Neon on wet asphalt genuinely does shatter — the dial sets how much.

Both maps are deterministic — no `Math.random()`, identical on every load.

**Turn-down order under budget pressure:** resolution 1024 → 512 → 256, then `blur` halves, then `distortion` → 0, then the reflector becomes a plain rough material with the env map. Never delete the puddles.

**That ladder was always understood to be about the reflector target, and it applies to this map too — which nobody had noticed.** The ripple normal was **the only painter in the world with no tier split**: every other canvas in §11 halves on mobile and this one shipped at 512² on both. Found while budgeting §2.1, where mobile had no room for the board. At 256² the dimples are 4–14 px rather than 6–22, which at the same 1.5 m tile is still raindrop scale on a screen a fifth the size, and it returns **1.05 MB** — more than §2.1's whole board face costs there. A map that is the same size on both tiers is not a decision that was taken, it is one that was skipped.

---

## 7. Lights

There is no sun at 3am. **No `directionalLight` anywhere. Shadow maps are off** (`shadows={false}`) — grounding comes from the reflections and from painted contact-AO decals (radial gradient, `#04060B`, opacity 0.55, 1.4 × 1.4) under every solid object.

**Hard cap: 11 dynamic lights.** Everything else is emissive material feeding bloom and the env map.

**It was 10, and 10 was already exactly full.** One hemisphere plus §2's four content lights plus the alley's five is ten, so the station gate — the wall the visitor turns round to see, and §17's opening beat — had no slot at all. The cap moves by one rather than by a round number, because one light is what the gap needed, and a cap loosened past the requirement stops being a cap. **Mobile holds at 7**, which is exactly where the built world now sits, so nothing is surrendered today; `LIGHT_SURRENDER_ORDER` covers it when §2 arrives.

| # | Type | Colour | Intensity | Position | Distance / decay |
|---|---|---|---|---|---|
| 1 | `hemisphereLight` | sky `#121A2B` / ground `#060A10` | **0.70** | — | — |
| 2 | `rectAreaLight` **= §2.1's aperture** | `signWhite` | **70** cd/m², **desktop only** | §2.1's aperture centre, facing the alley | — (see below) |
| 3 | `pointLight` | `neonMagenta` | **264** | §2.1's neon sign panel centre | 9.0 / 2 |
| 4 | `rectAreaLight` 0.96 × 1.42 | `vendGlow` | **5.0** | `(+3.98, 1.15, 6.0)` facing `-X` | — |
| 5 | `pointLight` | `phoneGreen` | **2.5** | `(-4.00, 1.60, 14.0)` | 5.0 / 2 |
| 6 | `pointLight` | *its sign's* | **150** | §3.5 sign **1** | **18.0 / 1.45** |
| 7 | `pointLight` | *its sign's* | **130** | §3.5 sign **4** | **16.5 / 1.45** |
| 8 | `pointLight` | *its sign's* | **95** | §3.5 sign **6** | **15.0 / 1.45** |
| 9 | `pointLight` | *its sign's* | **115** | §3.5 sign **8** | **13.5 / 1.45** |
| 10 | `pointLight` | *its sign's* | **80** | §3.5 sign **0** | **12.0 / 1.45** |
| 11 | `pointLight` | `signWhite` | **70** | §3.1's `終電` plate | **13.5 / 1.45** |

Lights 2 to 5 belong to the three content surfaces and arrive with them. **Lights 6 to 10 are the alley's own, and each one now sits on a sign that exists** — position and colour both taken from it rather than authored beside it. §7.1.

**6 to 10 were authored two orders of magnitude low, and §7.1 predicted the correction before it was measured.** It reads: *"A pool on the ground would want an order of magnitude more, and that number should not be picked before §9's bloom exists."* §9's bloom now exists, so the number was picked: **×44 across all five, holding the authored ratio to within 3%** — the ratio between the five was a real decision about which signs are the bright ones, and only the scale was wrong. With 97% of the west facade sitting below a luminance of 3 out of 255, this alley's walls were not dim, they were absent.

These are candela, and 150 cd is still **conservative**: a neon sign of about a square metre at a real sign's luminance radiates well over a thousand. Measured, ×44 takes the west facade from 97% near-black to 36%, and leaves the road where §6 wants it — mean 25 of 255 at 9 m, 7 at the visitor's feet.

**Lights 3 and 5 are in the same units and are wrong by the same argument; 2 and 4 are not.** 3 and 5 are `pointLight`s at 6.0 and 2.5 cd and will need the same order of magnitude. 2 and 4 are `rectAreaLight`s, whose intensity is **luminance in cd/m², not luminous intensity in cd** — a different quantity that this correction says nothing about.

**Lights 2 and 3 are now set, with §2.1's board. Lights 4 and 5 are not, and §16.9 still carries them.** A light cannot be set against a surface that does not exist, and §2.2 and §2.3 do not.

**Light 3 takes §7.1's own factor rather than a fresh number: 6.0 × 44 = 264 cd.** §16.9 said 3 and 5 are wrong *by the same argument* as 6–10, and the honest way to act on that is to apply the recorded correction, not to pick something new that happens to look right. It lands as the brightest dynamic light in the world, which is what §17 asks for — it sits on §2.1's vertical neon sign, and that sign is §8.1's top rung. §7's own note that 150 cd is *"still conservative"* for a square metre of neon applies here at 1.77 m².

**Light 2 could not be corrected that way, and had to be derived.** A `rectAreaLight`'s intensity is luminance, so the quantity comparable to the alley's candela is **luminance × area**: at 70 cd/m² over §2.1's 1.80 × 0.9563 aperture that is **120.5 cd equivalent**, seating it between §7.1's light 9 at 115 and light 7 at 130. The size is not authored at all — it *is* the aperture, read from §2.1, for §7.1's reason: a lightbox light that is not the size of its lightbox is a light that has drifted off its emitter.

**A `rectAreaLight` has no `distance` and no `decay`.** §7's dash in that column is a property of the type, not a value left blank — three.js gives this light no falloff cutoff, so its reach is unbounded and has to be *measured* rather than bounded by a number. That is the second reason it is desktop-only.

**Light 2 is desktop-only, and that is a §15.1 tier split rather than a surrender.** `rectAreaLight` is the most expensive light type three.js has: it needs `RectAreaLightUniformsLib`'s two 64² float LTC tables and a shader permutation, and it is unbounded. Mobile gets light 3 and §2.1's own emissive surfaces, which are doing most of the work anyway — the board's face is lit material, not lit geometry. Same precedent as §16.10's desktop-only painted detail.

**Light 11 lights the wall you turn round to see, and it is seated on the plate like §7.1's five.** §3.1 puts a `終電` plate at 4.2 m over the shuttered gate, and §17's first line is *you turn round and the shutter is down; you understand what happened without being told* — which cannot happen on an unlit wall. The plate is the only thing up there that emits, so it is the source, and the light takes its position from the plate rather than from a coordinate for the reason §7.1 gives: a light 2 m from its emitter still looks like a light, so the drift is silent.

**It is `signWhite`, and that is the one cool light in the alley.** §17 reserves warmth for the three things you can touch and §4 makes cyan a spice; a station gate is fluorescent, municipal and unwelcoming, which is the note this end of the street is supposed to play against forty metres of neon. At **70 cd over 9 m** it washes the gate and the three dead machines and reaches nothing else — the nearest sign light is 2.5 m away at `z = −20.65`.

**`decay` went from 2 to 1.45, and that is a modelling correction rather than a cheat.** Physical inverse-square is what a `pointLight` gives you and it is the wrong law here: **every one of these seven lights stands in for an area emitter** — a square metre of neon, a lit acrylic panel, a backlit plate — and an area source only falls off as `1/d²` in the far field. Close to a panel the falloff is nearer linear, and *"close"* means anywhere inside a few multiples of its own size, which in a 9 m alley is everywhere the visitor can stand. A point light at decay 2 puts almost all of its output within a metre of a sign nobody can get to and nothing at knee height six metres away.

**Measured, and the numbers are the whole argument.** A prop at knee height on the west wall at `z = 14` was receiving **3.4 lux** from light 8 and 1.9 from light 9 — against a shutter that returned 1.2% of it (§4.1). At decay 1.45 the same light delivers **8.0 lux** at that point and holds it across the stretch instead of collapsing over it. Nothing about the source changed: same position, same colour, same candela.

**Distances went up by half with it**, 8–12 → 12–18. `distance` in three.js is not a reach, it is a *windowing cutoff* that forces the falloff to zero at the boundary — so a prop at 8.7 m from a light with `distance: 10` was being crushed toward black by the window rather than by the physics, at exactly the range where the pools were supposed to be overlapping. §7.1's five pools were continuous on paper and dark in the middle. **A light's falloff and a light's cutoff are two different numbers and only one of them is physical.**

**Mobile keeps at most seven, which is §15's cap and not a preference.** Lights 6 and 7 are halved on mobile either way.

**The surrender order was `[10, 9, 8]` and it was wrong — highest-id-first is a proxy that stopped tracking importance.** Two things had drifted under it. Mobile was described as holding *"six lights in the world"*; it has held **seven** since §16.10 added the gate light, so it has been exactly full rather than comfortable, and the order was one build away from firing without ever having been re-read. And §2.1's light 3 takes it to eight, so it fires now. Under `[10, 9, 8]` a phone would lose **light 10 — the one 1.15 m from spawn**, by §7.1's own measurement — to keep a light on a sign at the far end.

**The order is now `[9, 8, 7, 6]`: nearest the board first, and never 10 or 11.** Light 9 goes first because §2.1's board arrives on the wall it lights and makes it the one genuinely redundant source in the alley — it was *"the only light on the showcase wall"* right up until the showcase brought two of its own. After that the order works back down the alley. **Light 10 and light 11 are not in the list at all**, because one is the light the visitor spawns inside and the other is §17's opening beat, and a surrender order that can reach either is not a budget, it is a bug waiting for a phone.

The arithmetic: mobile holds 7 today (hemisphere + 11 + the five alley lights), §2.1's light 3 makes 8, and light 2 is not on this tier at all — so **exactly one is surrendered, and it is light 9**. Mobile keeps hemisphere, 11, 10, 8, 7, 6 and 3: **7 of 7**. Desktop takes both and sits at **8 of 11**.

### 7.1 What a source is, and why four lightformers could never have one

Until this section the alley was lit by **one** of its ten lights. The hemisphere was mounted with the shell; the other nine were deferred to the objects that own them, and five of those objects — §3.4's storefronts, §3.5's signs, §3.7's lanterns — got built without their light. What was actually illuminating the world in the meantime was §5.1's environment, which was never meant to.

**A lightformer cannot have anything above it, and the reason is geometric rather than aesthetic.** drei's `<Environment>` bakes its children into a cube map from the origin, and a cube map is sampled by *direction*: every feature in it sits at infinity. Reflected in a floor at §6's roughness of 0.18, the place a lightformer lands is decided by the camera and by nothing else, so it **slides across the ground as the visitor walks** and no object can be put over it. Formers 1, 2 and 3 were 4 × 10 and 3 × 8 rectangles standing outside the walls at `x = ±6`; former 5 was a 6 m ring past the return wall at `z = 22`. They arrived as a saturated red disc in mid-alley and two coloured slabs at the visitor's feet — bright, hard-edged, unmotivated, and the first thing anyone looks at.

They are removed rather than dimmed. Dimming moves where the problem starts, not what it is.

**What they were carrying was measured before anything replaced them, and the number is the finding of this section.** Mean frame luminance at the §12.1 spawn view, same pose, same rain, 24 frames averaged:

| | Mean |
|---|---|
| The four formers, no §7 lights, hemisphere at its authored 0.35 | **16.57** |
| The four formers gone | **4.82** |
| …with the hemisphere swept 0.35 → 4.0 | 4.82 → **5.06** |
| A uniform fill matched to the first row, at `#4D649A` | **16.53** |

The fill was afterwards brought down to `#33445F`: matching the *mean* turned out to put the light in the wrong place. §5.1 has the reasoning and the road measurements.

**Sixty-eight per cent of this world was the environment map**, and the hemisphere cannot take it back: an eleven-fold sweep moved the frame by five per cent. The reason is §4 — every albedo in this palette is near-black, `asphaltWet` most of all, so the environment was never contributing diffuse light. It was being *reflected*. §6 says the ground is the picture, and the picture it was showing was those four rectangles.

So the replacement is two things, not one. **§5.1's uniform fill takes the ambient**, because only an environment can put light back into a reflection. **§7's five point lights take the colour**, because that is what they were always for and because a pool of coloured light is the one thing that can have a sign above it.

**Each light takes its position and its colour from the sign it sits on.** §3.5's nine signs are generated — wall, `z`, mount height and projection are all resolved at load — so a light written as a coordinate would drift the moment that generator changed, and drift silently, because a light 2 m from its sign still looks like a light. Written as a *sign index* it cannot: the light is placed at that sign's panel centre, at that sign's own emissive colour, by the same function `components/world/NeonSigns.tsx` uses to place the panel. **§7's colour column is therefore derived, not authored** — the previous colours were a palette plan for a bare alley, and two of them (`sodium` at `z = −14`, `neonCyan` at `z = +11`) named light that no surface within nine metres could have emitted.

| # | Sits on | Wall | `z` | Colour, from the sign |
|---|---|---|---|---|
| 10 | sign 0 | west | −20.65 | `neonMagenta` |
| 6 | sign 1 | east | −14.27 | `neonPink` |
| 7 | sign 4 | west | −0.82 | `neonMagenta` |
| 8 | sign 6 | west | +10.13 | `lantern` |
| 9 | sign 8 | west | +20.04 | `neonCyan` |

**Four of the five are on the west wall, and that is a consequence of §3.5 rather than a choice.** Signs alternate wall by index and are laid on an even stride, so every evenly-spread subset of them lands mostly on the even indices, which are all west. The alternative is a balanced pair of walls with a fifteen-metre unlit stretch in the middle. **Spread wins:** with §7's own distances the five pools run `−28.6` to `+29`, continuous, with no gap — and the visitor spawns at `z = −19.5`, 1.15 m from light 10.

**They read on the wall, not on the floor, and the honest description is a wash rather than a pool.** §7's intensities are candela under three's physically-correct lighting — 3.0 cd is a couple of candles — and against §5.1's fill they show as a coloured lift on the facade for two or three metres around each sign, which is what a sign that size actually does. A pool on the ground would want an order of magnitude more, and **that number should not be picked before §9's bloom exists**: a surface over the 0.90 knee behaves differently once something blooms it, which is the same caution §3.6 attached to its far-side gain. Re-check both together.

**§17 is better off, not worse.** The old set carried two `sodium` lights and a `lantern`; §17 reserves warmth for the three things you can touch, and three warm street lights were already crowding that. The derived set is magenta, pink, magenta, cyan and one `lantern` — which is `#E8283F`, a red, and the alley has eleven paper lanterns at that colour already. **There is now no `sodium` dynamic light anywhere**, which leaves the rung clear for §2.2's vending machine and §3.4's spill.

**The cost is frame time, not draw calls.** Five point lights add nothing to the call count and nothing to texture memory; what they add is per-fragment work on every lit surface in range. §15 caps dynamic lights at 10 desktop and 7 mobile and this takes the world to six — measured in §10.1's budget table alongside the rain, since both landed together.

**One thing did not change and is worth stating so it is not re-discovered.** Every emissive value in the world was already at §8.1's figure before this section: sign faces at 2.40, the neon rim at full colour on `meshBasicMaterial`, open-shutter spill at 1.10, storefront sign boxes at 0.85, banners at 0.95, paper lanterns at 1.30, the §3.7 cart lamp at 1.10, §3.6's headlights at 2.60 and tail lamps at 1.55. The ladder was correct; what was missing was that none of it *threw* any light. An emissive material lights only itself.

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
| **Board case** (§2.1) | **0.78** | **0.12** | `envMapIntensity` **0.35** — see below |
| **Glass** (board aperture, payphone) | 0.08 | 0.0 | `transparent`, `opacity 0.22`, **no `transmission`** — transmission costs a render pass per frame and buys nothing at this exposure |
| Noren fabric | 0.92 | 0.0 | `side: DoubleSide`, no transmission |
| Paper lantern | 0.90 | 0.0 | emissive `lantern` @ 1.75, `side: DoubleSide` |
| Neon tube | 0.30 | 0.0 | `meshBasicMaterial`, colour at full, plus a 0.03 emissive halo shell at 0.6 |
| Screenshot plane | — | — | `meshBasicMaterial`, tint `#A6B2C6`, **no emissive** |

**§2.1's case is not `paintedMetal`, and the difference is area rather than taste.** It was built on that row and came back with a cyan wash across it. Every other `paintedMetal` object in the world is a bracket, a railing or a condenser measured in centimetres; §2.1's board and sign cases are **6.2 m² of continuous panel**. At that size `paintedMetal`'s metalness 0.55 and `envMapIntensity` 1.0 — the highest environment response in this table, and the same 1.0 §6 records as having made the road read as snow — turn the case into a mirror for whichever dynamic light is nearest. At the bend that is §7.1's light 9: `neonCyan`, 115 cd, 3.4 m away. The case was brighter than the project on it.

**A material is a decision about a surface, and a surface has a size.** Everything a visitor is meant to see on this object is painted on it, so a case contributing light of its own is a case competing with what it carries. Rough, barely metallic and dark is what painted sheet that has been outdoors looks like, and it is also what leaves the board's own emissive rungs doing all the work.

### 8.1 Emissive intensity ladder

Bloom's threshold is `0.90`. This ladder is what sits either side of it.

**Everything above the knee was raised by ×2.2 of its distance from the knee, not of its value.** The rule is `new = 0.90 + (old − 0.90) × 2.2`, and the choice of transformation is the whole point. §8.1 is not a list of brightnesses, it is a set of decisions about *which side of 0.90 each thing sits on and by how much* — "just", "edge", "deliberately". Multiplying the values by 2.2 would have moved the station plate from 1.06× the knee to 2.3× it, turning a rung whose entire annotation is "edge, deliberately" into one that plainly blooms, and the ladder's shape would have been destroyed while every number went up. Anchoring at the knee raises the top of the ladder and leaves the bottom of it exactly where it was authored.

**The sub-knee rungs are held, and that is not an oversight.** They are under 0.90 *because* they are lit rather than glowing — fourteen storefront sign boxes crossing the threshold would bloom the whole lower facade, and §2.1's screenshot must never bloom at all. The knee is a design boundary; a raise moves things further in the direction they were already going, and nothing across it.

**The screenshot went from 0 to 0.78 and it is still the rung that can never cross.** Emissive 0 did not merely stop it blooming; it stopped it being *lit*, and a dark rectangle of interface on a dark board at 3am reads as a photograph of a screen rather than as a screen. 0.78 is a screen that is switched on. **Nothing about the protection changed** — *peak luminance must land below the bloom threshold* is the sentence that guards the scene, and 0.78 is on the same side of 0.90 as fourteen storefront sign boxes at 0.85 and a hundred and fifty facade windows at 0.55. A surface can be lit and sub-knee at once; four other rungs on this ladder already are. The tint moved 0.68 → 0.82 at the same time, because the multiply had been carrying brightness the emissive term now supplies, and leaving it would have double-counted in the dark direction.

| Element | Emissive intensity | Was | Above threshold? |
|---|---|---|---|
| Neon tubes | **5.96** | 3.20 | yes — full bloom |
| **Vehicle headlight** (§3.6) | **4.64** | 2.60 | yes |
| Vertical signs | **4.20** | 2.40 | yes |
| Selection buttons | **3.54** | 2.10 | yes |
| Payphone lamp | **3.10** | 1.90 | yes |
| Vending front panel | **2.44** | 1.60 | yes — soft halo |
| **Vehicle tail lamp** (§3.6) | **2.33** | 1.55 | yes — soft |
| Paper lanterns | **2.77** | 1.75 | yes |
| Aperture surround strip (§2.1) | **2.00** | 1.40 | yes |
| Overhead banner (§3.5) | **1.78** | 1.30 | yes |
| **Taxi roof sign** (§3.6) | **1.56** | 1.20 | yes |
| **Open-shutter spill** (§3.4) | **1.34** | 1.10 | yes — soft |
| Station `終電` plate | **1.01** | 0.95 | edge, deliberately |
| **Storefront sign box** (§3.4) | **0.85** | — | no — fourteen of them |
| **Project screenshot** (§2.1) | **0.78** (tinted 0.82) | 0 | **no — and never** |
| **Board face** (§2.1) | **0.70** | — | no |
| Facade window bays (§3.3) | **0.55** | — | no — lit rooms, not signs |

**Two authored figures moved, and the banner overtook the plate it used to share a rung with.** Paper lanterns **1.30 → 1.50 → 1.75** and banners **0.95 → 1.30**. The lanterns moved a second time with §4.1: a rung chosen against near-black walls is a rung chosen against a different picture, and lifting every surface around them left them looking flatter than before. These are changes to the *authored* column; `raise()` then carries them to 2.22 and 1.78 as it does every other rung, so the knee-anchoring above still holds and nothing sub-knee moved.

The banner's old 0.95 was chosen to match the station plate — *"the same rung as the station plate: they are read-through cloth, not tube"* — and that comparison was about **material**, not about visibility. It put three 3.20 m banners, the largest lit surfaces above eye level and the only content on the overhead layer, one hundredth of a step over the bloom knee. The plate stays at 0.95 because it genuinely is meant to be barely-there: §3.1 calls it *a dark backlit plate*, and §17's beat is that you notice it only when you turn round. **A banner is read from forty metres away and a plate from four**, which is the distinction the shared rung was hiding.

**The neon tube's halo shell stays at 0.6** (§8), even though the tube it surrounds nearly doubled. Its job is the soft gradient at the tube's edge, and it is under the knee so that the tube blooms and the halo does not. Scaled with the tube it would cross 0.90 and put a second bloom source around all nine signs.

**This ladder is now the single source and the scattered constants read from it.** Every value above was previously written out again inside `NEON_SIGNS`, `STOREFRONT`, `OVERHEAD`, `PROPS`, `SHOPFRONT`, `VENDING`, `PAYPHONE` and §3.6's vehicle table — fifteen literals for fourteen rungs, with no mechanism keeping them equal to this table. Raising the ladder is one edit or it is not a ladder.

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

### 9.1 The composer — built with 1 and 4 only

**Effects 2 and 3 are not built.** Chromatic aberration and noise wait; the chain is bloom, then vignette, at §9's values on both tiers.

| | |
|---|---|
| Order | Bloom → **tone mapping** → Vignette |
| `multisampling` | **4** desktop / **0** mobile |
| Frame buffer | half float — bloom needs the scene above 1.0, which is the whole point of §8.1 |

**There is a third pass and it is not an effect.** `<EffectComposer>` sets `renderer.toneMapping` to `NoToneMapping` for as long as it is mounted, so the moment §9 exists, §5's ACES and its 1.05 exposure stop being applied and the world renders raw linear HDR to the screen. The tone-mapping pass puts §5 back. Nothing was added to the look; something was prevented from being removed from it.

**It goes after the bloom, and that ordering is what keeps §8.1 meaningful.** §8.1 is a ladder either side of a 0.90 knee — tubes at 3.20, sign faces at 2.40, spill at 1.10, storefront boxes at 0.85 deliberately under. Those numbers only exist while the frame is still HDR. Tone map first and ACES has already compressed every one of them below 1.0: nothing crosses 0.90, the entire ladder stops meaning anything, and there is no error — only a picture that looks slightly flat. **Bloom reads the scene at 2.40; the screen sees it after ACES.**

**The mode has to be named.** `ToneMappingEffect` defaults to **AgX**, not ACES. Left unset it would quietly swap §5's tone mapping for a different one — a change to every colour in the world, arriving as a default.

**`multisampling` is where §9's `antialias` flag went.** `gl.antialias` stops reaching the scene once a composer is mounted, because the scene renders into a half-float target and the canvas is only ever shown a full-screen quad. Four samples is what a browser typically grants for `antialias: true`; mobile's `false` is 0. **This is not the SMAA pass §9 rules out** — it is multisampling on the render target, which costs no pass.

**§13 has nothing to turn off here.** Reduced motion drops effects 2 and 3, and 2 and 3 are not in this chain, so the reduced-motion chain and the ordinary one are the same chain until they arrive.

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
| Ripple emitters | **48**, radial shader on 0.85 dia decals, one ring per **1.1 s**, 1.4 s life, **two generations alive** | **21** |
| Steam vents | **3**, 24 instanced billboards each, opacity 0.08, rise 0.35 m/s | 2 vents, 12 sprites |

Rain and steam are **one instanced draw call per layer**. Positions update in a hoisted `Float32Array` inside `useFrame` — no allocation, no `setState`.

### 10.0 Ripples — where the rings go, and why it is not a free choice

**An emitter's position comes from §6.2's puddle mask, not from a scatter.** This is the whole of the section, and getting it wrong is what makes rain on a road look like decals on a road. §6.2 already decides where water is: 60% coverage, blobs of 3–6 overlapping ellipses, biased to the alley centre and to the gutter lines at `x = ±3.72`, thinning against the kerb faces. A ring expanding on a dry island contradicts, in the most visible way available, the one document that says where the puddles are.

So the twelve emitters are **rejection-sampled against the mask itself** — the painted canvas, read once at mount, not the weight function that generated it. The weight function describes the *bias*; the canvas describes the *blobs*, and a ring has to land inside an actual blob rather than merely in a wet-ish region. One `getImageData` at mount, a seeded generator, and a wetness threshold; nothing per frame, and identical on every load like both ground maps.

**This is the mask's second job**, and it costs no memory: the same 512 × 2048 canvas that drives `roughnessMap` and `distortionMap` places the rings. Two consumers of one texture, which is the same argument §6.2 made for cloning the ripple normal onto the base plane.

**Uneven is the output, not an input.** The instruction this answers is a road with *some spots lower than others where water pools* — and the mask is already that surface: rings will cluster down the centre channel and along the two gutters and be absent from the dry islands, because that is where §6.2 put the water. Nothing needs a second distribution invented for it.

**The emitter count and interval were written for a floor that no longer exists, and building them proved it.** §10 asked for 12 emitters firing one ring per 1.8 s — **6.7 impacts a second across forty-six metres of alley**, which is not what rain looks like on standing water by about two orders of magnitude. It was a defensible number when the road was a dark matte surface and a ring was an accent on it. §6.0 then took the planar reflection from 2.4% to unity gain, and the ground became the mirror §6 always said it was: built at §10's figures the rings measured **0.007% of the frame** and were, standing over a puddle looking down at it, entirely invisible against the reflected neon.

**64 emitters at 1.1 s, and the cost is nothing.** They are one `InstancedMesh` either way, so the draw call is unchanged; 64 quads is 128 triangles against §15's 350,000; and §10 specifies a *shader*, so the texture budget does not move. **The only thing 12 was buying was 12.**

| | Was | Now | |
|---|---|---|---|
| Emitters | 12 / 6 | **64 / 28** | 58 impacts a second across the alley instead of 6.7 |
| Ring interval | 1.8 s | **1.1 s** | Still longer than the 1.4 s life, so rings overlap slightly rather than the floor going quiet between them |
| Decal diameter | 0.9 | **0.85** | A raindrop ring on a film of water is small; more of them beats bigger ones |
| Minimum separation | — | **1.1 m** | 2.0 was set for twelve. §6.2 leaves roughly 250 m² of water in the alley, and 64 emitters will not fit in it at 2.0 |

**Four values the table above does not give, decided here.**

| Value | | Because |
|---|---|---|
| Colour | `rain` `#9FB4D6` | It is water, and §4 already has the token for water. A ring is not a light and must not introduce a colour the alley does not have |
| Peak opacity | **0.16** | Between §10's steam at 0.08 and its far rain at 0.22. Twelve of these overlap in the centre channel, and §10.1's lesson was that transparent things accumulate along the view direction |
| Ring thickness | **0.16** of the current radius | A disturbance on water is an annulus, not a disc. Held as a *fraction* so it thins as the ring grows, which is what a spreading wavefront does |
| Wet threshold | mask value below **0.20** | §6.2 paints 0.06 inside puddles and 0.55 on dry patches with a 14 px blur between. 0.20 is inside the water rather than on the transition, so no ring straddles an edge |
| Sample region | `x ∈ [-4.5, 4.5]`, `z ∈ [-23, 23]` — **the alley, not the strip** | §6.1 runs the reflector 3 m behind each end wall and 1.5 m past each side wall so its seams are never in frame. That margin is hidden geometry, and a ring out there is a ring nobody can see, spent out of a budget of twelve |
| Minimum separation | **2.0 m** between emitters | A ring is 0.9 m across, so 2.0 leaves clear water between neighbours. Without it the sampler follows §6.2's centre bias into a clump — the first build put four rings inside 2.4 m and left a 15 m stretch with none, which reads as a patch of rain rather than as rain |

**Both bounds were found by measuring the first build, and both are the same mistake in two places:** taking §6.2's mask as the whole specification when it is only the *wetness* half of it. The mask is painted across the full 12 × 52 strip and biased to the alley centre, so sampled naively it will happily place rings behind the station gate and stack them on the centre line. **Where the water is does not decide where a ring is worth drawing.**

Rings are **alpha-blended and never additive**, for the reason §3.6 recorded and §10.1 repeated: `FogExp2` mixes toward `fogColor` before the blend, so an additive decal at range arrives inside a visible dark box.

### 10.0.1 Every ring was being cut off at 79% of its life, and that one bug was three complaints

**`vAge` could never reach 1.0.** The cycle wraps on the *interval* and the age divides by the *life* — `cycle = mod(t, 1.1)` then `vAge = cycle / 1.4` — so the maximum age any ring ever reached was **1.1 ÷ 1.4 = 0.786**. Consequences, all three of which were reported separately as look problems:

- **The `if (vAge > 1.0) discard` was dead code.** It could not fire.
- **No ring ever faded out.** At the moment of the cut the wavefront still carried alpha **0.0278** against a peak of 0.30 — dim, but a hard step to zero, which is a pop rather than a fade.
- **Every ring restarted instantly in the same place.** There was no quiet interval at all, so an emitter read as one ring blinking on a fixed spot rather than as rain landing.

**The fix is two generations per emitter, not a longer interval.** `life ÷ interval` = 1.4 ÷ 1.1 = **1.273**, so at most **two** rings are ever alive on one emitter and never three. Generation *k* carries the birth and *k−1* carries the tail that was being deleted — which is what §10.0 already claimed was happening (*"rings overlap slightly rather than the floor going quiet between them"*) and had never actually been built. A dead generation returns **0.0 rather than discarding**: with two in flight, a discard would kill the fragment the live ring is drawing into.

**Lengthening the interval to 1.6 s was the one-number alternative and it is rejected.** It would let the age exceed 1.0 and fade properly, but it reverses §10.0's overlap decision and drops the alley to 30 impacts a second.

| Value | | Because |
|---|---|---|
| Generations alive | **2** | `ceil(1.4 ÷ 1.1)`, derived. Not a look choice — it is the number the interval and the life already implied |
| Birth ramp | **0.05** of the life (70 ms) | A real impact appears abruptly, so this is short. It exists to kill the pop *in*, now that the pop *out* is gone |
| Size variation | **±0.25** of nominal reach, per cycle | *"Not all uniform shapes."* Per cycle rather than per emitter, so a ring never repeats the one before it |
| Radial wobble | **0.12** | A ripple on a moving film is not a circle, and a perfect one is the detail that reads as drawn. A `cos(2θ)` term is an ellipse to first order; a `cos(3θ)` term takes the symmetry out of it. One formula, both asks |
| Jitter ladder | **[0.36, 0.26, 0.18, 0.10, 0.05]** m | The per-emitter distance a ring's centre may travel between cycles — **measured, not assumed.** See below |

**The jitter is measured against each emitter's own puddle, and that is what makes it usable.** A ring moving between cycles is the whole of *"not in exactly the same spot"*, but a blind offset walks rings onto dry asphalt and contradicts §10.0's placement rule. So at mount each emitter probes eight points around itself at each rung of the ladder above and keeps the largest radius that is still wet on all eight. An emitter in the middle of the centre channel earns 0.36 m; one in a narrow blob earns 0.05 or nothing. **A global bound honest enough for the worst emitter would have been about 0.07 m and invisible; measuring per emitter buys the majority of them five times that.** It reuses the sampler §10.0 already built — 48 emitters × 5 rungs × 8 probes is 1,920 array reads at mount, against a rejection loop already permitted 6,000 attempts.

**The jitter is paid out of the ring's reach, not out of the quad.** An offset centre with an unchanged reach would grow a ring past its own decal and arrive as a crescent where the quad ends. So reach becomes `(0.5 − offset) × sizeVariation`, which keeps every ring inside its own 0.85 m decal and keeps the mount-time bounding sphere honest.

**The hash is sin-free and the generation index wraps at 1024.** This material compiles as GLSL ES 1.00, so there are no integer operations, and a `mediump sin` of a large argument is noise on a phone — which would look like the ripples failing rather than the hash. The generation index climbs about 0.9 per second forever; wrapping it at 1024 is ~19 minutes per emitter before the sequence repeats, and it keeps the hash input inside the range where a `fract`-based hash still has resolution.

**48 and 21, down 25%.** §10.0 raised the count to 64 to make the rings visible at all against §6.0's mirror; with two generations alive and per-cycle jitter each emitter now reads as continuous rain rather than as one blinking spot, so the count that made twelve visible is more than the picture needs. **Draw calls do not move** — it is one `InstancedMesh` at any count, and the two new per-instance floats are 8 bytes each.

**§13: the rings come off entirely under reduced motion.** A ring is *nothing but* expansion — its radius is its only state — so a frozen one is a set of static bullseyes painted on the road, which is worse than an unbroken wet surface. This is the one place in the world where reduced motion removes a thing rather than stilling it, and the reason is that the thing and its motion are the same thing. The resting surface is still fully there: §6.2's puddles, the ripple normal, and the reflection.

### 10.1 Rain — the built form

The table above is the look. This is what it is made of, and every figure here is read off that table or off §3 rather than chosen.

| Value | Near | Far | From |
|---|---|---|---|
| Form | instanced quad | instanced quad | below |
| Streak, width × length | **0.021 × 0.170** | **0.014 × 0.113** | §10's `pointSize` **and** its counts — below |
| Lean from vertical | **3.81°** | same | `atan(0.6 ÷ 9.0)` — §10's own two speeds |
| Box | 14 × 12 × 14, follows the camera in `x` and `z` | 30 × 14 × 46 at `(0, 7, 0)` | §10; the far box **is** §3's alley — 46 long, 14 the west facade height |
| Instances | 1400 / 700 | 2600 / 1000 | §10 |
| Draw calls | 1 | 1 | §10 |

**Quads, not points, and it is `gl_PointSize` that decides it.** A point sprite's size is a screen-space quantity: it is capped by the driver, it cannot be given a rotation, and a streak sized in pixels grows as it nears the camera in a way that has no relation to how far away it is. §10 wants rain 0.06 m wide leaning 3.81° off vertical — three properties a point sprite has none of. A quad has all three and costs one extra triangle.

**Streak size is derived from two of §10's figures, not one, and taking only the first is a mistake worth recording.** §10 gives a painted streak texture at **8 × 64** — an aspect of 1 : 8 — and a point size of 0.06 and 0.04. Multiplying gives streaks 0.48 and 0.32 long, which is what this section shipped first. It is **eight times the area** of the `pointSize`-square sprite §10's *density* was written for.

That matters because §10 sets 2 600 far streaks at opacity 0.22, and those figures only mean what they were chosen to mean if a streak covers `pointSize²`. At eight times that, forty metres of alley stacks enough alpha to lay a pale veil over the whole road — §6's dark mirror, gone, and §10's own warning met exactly: *"if it reads as a storm, it is too dense."* Nothing in the numbers showed it. The road was blamed first, then the environment, then the reflector; **the fault was in the rain the entire time**, and it took reading pixel values to see it.

So both of §10's figures are held: the **area** at `pointSize²`, the **aspect** at 1 : 8.

> `width = pointSize ÷ √8` · `length = pointSize × √8`

Near comes out **0.021 × 0.170**, far **0.014 × 0.113**.

**0.170 is worth a second look, because it was not aimed at.** A drop falling at §10's 9.0 m/s draws **0.15 m** across one frame at 60 fps — which is what a rain streak physically *is*, a drop smeared over an exposure. Two independent derivations, one from the texture and the density, one from the fall speed and the frame rate, landing 12% apart. That is the strongest evidence in this section that the reading is now the right one.

**The lean is the streak lying along its own velocity.** §10 falls at 9.0 m/s and drifts at 0.6, so the rain travels 3.81° off vertical and the streak is turned to match. A vertical streak drifting sideways is the single detail that reads as wrong without anyone being able to say why.

**The near box follows the camera in `x` and `z` only; `y` is anchored to the ground.** §12.1 fixes the eye at 1.68 and nothing changes it but head bob, so following in `y` would buy nothing and would push four metres of the box below the floor, where a third of the near layer would fall through the world unseen.

**Recycling is per axis, not just downward.** §10 describes rain returning to the top, which is all a static box needs. A box that follows the camera also needs `x` and `z` wrapped into it, or the visitor walks out of their own rain and leaves it behind — a fault that is invisible standing still, which is how the world gets checked.

**One yaw for the whole layer, taken from the camera once per frame.** A quad seen edge-on disappears, so the streaks must turn to face the visitor; doing it per instance means a look-at per streak per frame. At 0.06 m wide the parallax between a shared yaw and a true per-instance billboard is under a pixel at every distance where a streak is more than a pixel, so the layer shares one rotation — which is also what lets the instance matrices be written by hand.

**The matrices are written by hand rather than composed.** Every instance in a layer has the same rotation and the same scale, so the 3 × 3 block is built once per frame and only the translation column varies. That is §10's *"positions update in a hoisted `Float32Array`"* — twelve array writes per streak, no quaternion, no `Matrix4.compose`, nothing allocated in the loop.

**Basic material, alpha-blended, fogged, never additive.** §10 says not additive and §3.6 already records why: `FogExp2` mixes toward `fogColor` *before* the blend, so an additive quad at range adds most of `#0A0F1A` across its whole rectangle and arrives inside a visible dark box. Rain is `meshBasicMaterial` because at opacity 0.35 there is nothing for a lit material to be lit by, and a `meshStandardMaterial` in this alley would render it black.

**§13 — opacity 0.22, count halved, speed unchanged.** The count is fixed when the instance buffer is allocated, so it is read reactively at mount and not in the frame loop; the near layer's 0.35 comes down to 0.22 and the far layer is already there. Speed is deliberately untouched: §13 says slower rain reads as broken rather than as calm, which is the same sentence §3.6 applies to the traffic.

**Budget, measured with §7.1's lights in the same pass.** Rain is **+2 draw calls** and **8 000 triangles** desktop, 3 400 mobile — against §15's 350 k and 220 k, which is nothing. §7.1's five lights add no calls at all; what they add is per-fragment work on every lit surface in range, and the world is at **six dynamic lights of §15's ten and seven**.

Draw calls, at the peak, which is looking the length of the alley from §12.1's spawn: **desktop 96 of 140, mobile 92 of 90** after §16.11 — 20-frame maxima. Desktop did not move across a pass that added the gate shutter and notice, because §10.0.1 took the ripples from 64 emitters to 48 inside one instanced call. **Mobile is two over**, and it is recorded rather than rounded: §3.1's gate is the whole of it — one instanced call for 37 slats and one for the notice. Desktop *fell* by four across a pass that added the ripples, the gate plate and six brackets, because §3.5's bracket instancing gave back more than the pass spent. The fix is §3.7's merge-by-material lever, still unspent and still worth −4, which would put mobile at 88 with room to spare. It is the last recorded lever and it should be spent before anything else is added to that tier. The count moves by about five with how many of §3.6's vehicles are inside the frustum at the moment of sampling, which is where an earlier reading of 102/95 came from; **mobile sits at or just over §15's cap either way**, and none of §6.0's, §7's or §8.1's changes moved it, since all of them are scalars and uniforms on geometry that was already being submitted.

**How that is counted changed with §9.1, and the old method would now report `1`.** `renderer.info` resets at the start of every `render()`, and a composer calls `render` **24 times a frame** — so reading the counter after the frame reports the last fullscreen pass and nothing else. The figures above come from wrapping `render` and taking the largest call count of the frame, which is the scene pass. Every draw-call figure in this document before §9 was measured the simple way and is still comparable, because until now there was only one render.

**§15's draw-call line does not cover the composer, and should say so.** Those 24 invocations are the reflector's own scene render plus bloom's mipmap chain — full-screen work whose cost is fill rate, not draw calls, and which §15's ≤ 140 / ≤ 90 was never written to describe. **Mobile is at the cap, not comfortably inside it.** §3.7's merge-by-material lever remains unspent and still worth −4; it is still not applied, for the reason §3.7 gave. What §15 actually needs now is a second line for passes, decided when effects 2 and 3 land.

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
| **Title sign — project name** | **0.30 cap height max, horizontal, shrink-to-fit** | +0.10 em |
| **Board — blurb** | **0.075**, wrapped, max **4** lines at 1.45 line height | +0.02 em |
| **Board — tags** | **0.055**, `uiDim` | +0.12 em, uppercase |
| Door plate — "GITHUB" | 0.038 | +0.14 em |
| Station plate — `終電` | 0.55 | — |

**The 0.30 is a *maximum*, not a size, and that is what the shrink-to-fit is for.** §17 requires a longer project name to work *with no component edited*, and a cap height authored as a fixed number is a name length authored as a fixed number.

**The blurb is 0.075 and not 0.045, because the reading distance moved.** §2.1.1's pose went from 3.43 m to 5.63 m when the board grew, and at 5.63 m §12.1's portrait frame is 3.641 m across — about **107 device pixels per world metre** on a 390 px screen. 0.045 would arrive at under five pixels a glyph. At 0.075 it is eight, which a 1.5 DPR cap turns into twelve, and four lines of it in a 1.85 m column hold about 165 characters — enough for every description in `CONTENT.md` without truncating. **Type size on a surface in a world is a function of where the visitor stands**, and this is the one place in the document where that is written down rather than assumed.

**Nothing here sizes a control any more.** The arrow glyphs and the position dots are gone from this table because §2.1.2 moved them to the screen, where they are measured in pixels and not in metres.

**The tech list is gone, and it is recorded rather than deleted quietly.** §2.1 used to carry *description + tech* on an info panel; the board carries **title, blurb and tags**. `CONTENT.md`'s `Tech` field is now data with no surface. It stays in the content file — it is true, and §2.2's About material may want it — but nothing renders it, and that is a decision rather than an oversight. An orphaned type size left in this table would look like a surface someone forgot to build.

### 11.3 Neon flicker

Applied to the shopfront sign, to two decorative signs (indices 3 and 7), and to **all three banners**. A fixed, hand-authored sequence — not random per frame, so it is identical every run and cannot be accused of being noise:

`[1, 1, 0.2, 1, 0.05, 0.9, 1, 1, 1, 0.4, 1]` at 22 ms per step, then a **6.5 s** steady hold, then repeat. Reduced motion: constant 1.

**Each flickering thing gets a phase offset, and without one the effect inverts.** The sequence is 242 ms of stutter inside a 6.742 s period, so every subscriber reading the same clock stutters at the same instant — five objects blinking in perfect unison, which does not read as five failing tubes but as the whole street being switched. Offsets are **fractions of the period**, spread so no two coincide:

| | Offset |
|---|---|
| Shopfront sign | 0.00 |
| Decorative sign 3 | 0.17 |
| Decorative sign 7 | 0.53 |
| Banner 9 | 0.31 |
| Banner 10 | 0.68 |
| Banner 11 | 0.86 |

**A flicker is not a blink.** This sequence is a tube failing to strike — 242 ms of stutter, then seven seconds of nothing wrong. It is deliberately not a regular on/off pulse, which reads as a working indicator rather than as decaying signage, and §1's alley is the second thing.

### 11.4 Decorative signage — the fixed list

The only strings permitted in the surroundings. Assigned by index, never randomised, never project-related:

| Index | String | Goes to |
|---|---|---|
| 0 – 8 | `居酒屋` · `ラーメン` · `営業中` · `カラオケ` · `24H` · `喫茶` · `酒` · `定食` · `深夜` | §3.5's nine neon signs |
| 9 – 11 | `お好み焼` · `コインランドリー` · `自動販売機` | §3.5's three banners |
| 12 | `禁煙` | unassigned |
| 13 | `終電` | §3.1's station plate |
| **14 – 20** | **`焼鳥` · `すし` · `おでん` · `立呑` · `中華` · `スナック` · `甘味`** | **§3.4's seven lit sign boxes** |
| **21** | **`運転終了`** | **§3.1's gate notice** |

Any string not on this list and not from `CONTENT.md` does not go in the world.

**Seven strings were added, and the count is not a coincidence.** §3.4's sign boxes were built blank because §3.5 gave the projecting sign the string and left the box carrying nothing — which is the right rule for *which of two objects on the same wall wins*, and the wrong conclusion to draw about a box on a wall with no sign on it. Fourteen blank coloured slabs read as placeholder geometry rather than as shopfronts. The seven **lit** boxes take a string each; **the seven unlit ones stay blank**, because an unlit box is `shutter` and not emissive at all, and a shut shop's sign is exactly a slab you cannot read.

**`運転終了` is the railway's own phrase, which is why it is not `営業終了`.** *Service has ended* is what a gate posts when the last train has gone; *business has ended* is what a shop posts. It pairs with `終電` on the plate two metres above without repeating it — the plate names the thing that left and the notice says what that means for you. Index 2 `営業中` was not an option (it means **open**, and is already on a neon sign) and neither was 12 `禁煙`.

**The strings are food and drink, and that is the whole selection rule.** Indices 0–13 are what a *street* says about itself — trades, hours, a station name. 14–20 are what individual small premises say, which is what a sign box on a shopfront is: `焼鳥` yakitori, `すし` sushi, `おでん` oden, `立呑` a standing bar, `中華` Chinese, `スナック` a snack bar, `甘味` sweets. §4's warm-outnumbers-cool ratio already assigns the colours; this assigns what is written under them, and nothing here needs a fourteenth trade nobody would put on a lit box at 3am.

---

## 12. Navigation

### 12.1 Camera

| Value | Setting |
|---|---|
| **Eye height** | **1.68** |
| FOV | **62°** landscape / **70°** portrait |
| Near / far | 0.10 / 90.0 |
| Spawn | position `(0, 1.68, -19.5)`, yaw `0` (facing `+Z`), pitch `-4°` |

**This document's yaw is not three's, and the difference is exactly π.** Yaw `0` here faces `+Z`; a three.js camera at `rotation.y = 0` looks down `−Z`. For a world yaw ψ, three's rotation is **ψ + π**, giving a view direction of `(sin ψ, 0, cos ψ)`. Checked against the §12.6 stops rather than taken on trust: ψ = 0° → `+Z`, the alley ahead at spawn; ψ = −90° → `−X`, the west wall, where the payphone is; ψ = +90° → `+X`, the east wall and the vending machine. All three agree. **§2.1's board adds a fourth check and it is the one that matters**, because it is the only pose in the world that is neither axial nor authored: a group at ψ = +20° puts its local `+Z` on `(−0.342, 0, −0.940)`, which is §3.1's inward face normal, and its local `+X` on `(−0.940, 0, +0.342)`, which is the visitor's right at that same yaw. **The board's facing and the locked view's yaw are therefore one number through one helper** — get the convention wrong and the board faces into the wall, which looks like a layout bug and is not. **Convert once, at the point a camera is posed** — never by sprinkling `+ Math.PI` through the navigation code, where one missing conversion faces the visitor at a wall for reasons that look like a layout bug.

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
| Board | **6.50** | `E — view project` / tap |
| Vending machine | 2.20 | `E — about` / tap |
| Payphone | 2.00 | `E — contact` / tap |

Prompt fades in over 180 ms at the radius edge. `Escape` closes whatever is open, and **nothing else claims `Escape`**.

**The board's radius went 3.00 → 6.50, in two steps and for two different reasons.** A radius is measured from the station, and this station is on a wall the clamp cannot approach squarely: at 3.00 the in-range region inside `BOUNDS` was a sliver about 3.2 m wide and 1.4 m deep pinned against the `z = 21.4` clamp. Then §2.1's board grew to 3.20 m and its locked pose moved out to **5.627 m** to fit it in frame.

**A radius that does not contain its own locked pose is a lock you cannot enter from where it puts you** — press `E`, get pulled to 5.6 m, and the prompt that got you there is now out of range. 6.50 contains the pose with most of a metre to spare, and the board stays the widest of the three radii, which is the ordering §12.5 already had. It is large in absolute terms because the object is: 3.20 × 4.80 m is the biggest thing in the alley a visitor can touch.

**`Escape` has exactly one owner and it is not any of these.** Overlays, the locked view and anything else that can be dismissed register with a single stack; the top-most registration wins. This is written here rather than left to convention because `Escape` is the one key three different features will each feel entitled to.

**Movement input releases the locked view, and that needs one line elsewhere.** §12.3's key handler is gated on `canControl()`, so in `'locked'` mode a `W` never reaches it and "any movement input releases" would silently never fire. The gate stays — it is what stops a visitor walking while typing in a form — and a monotonic counter is bumped *above* it instead, which the locked view watches and nothing else does. **Only while locked**: the same counter ticks when someone types `w` into §2.3's contact form, and a consumer that watched it in `'overlay'` mode would close the form under them.

**Touch has to be able to release too, and that does not fall out of anything.** §12.3's on-screen stick is itself gated on `canControl()`, so on a phone a locked view freezes the one control that was supposed to escape it. The lock therefore carries **a visible close control for as long as it is held** — plus a tap on empty space, which R3F reports separately from a look-drag. This is the §17 stranger-on-a-phone test applied to the one state in the world that can trap them.

### 12.6 The guided path

For a visitor who does not want to walk. Reuses the locked-view camera (target pose, ease, release) — keep that general. **§2.1.1 builds that primitive and is its first consumer**, so this section inherits it rather than specifying it again.

| Stop | Camera position | Yaw | Pitch |
|---|---|---|---|
| 0 — spawn | `(0, 1.68, -19.5)` | `0°` | `-4°` |
| 1 — vending | `(+1.90, 1.68, +6.0)` | `+90°` | `-6°` |
| 2 — payphone | `(-1.80, 1.68, +14.0)` | `-90°` | `-8°` |
| 3 — board | §2.1.1's locked pose — `(-2.592, 1.68, +19.681)` | `+12.461°` | `+6.34°` |

**The order changed with §2.1's position, and the old one would have been absurd.** It ran spawn → shopfront → vending → payphone: with the showcase now at `z = +19.7`, that is a **39 m** first leg followed by two reversals back down the alley. Monotonic in `z` — spawn, vending, payphone, board — is the order a person would actually walk, and it ends on the surface the whole piece is for. **`legDurationSec` is unchanged at 2.6 because the legs are now 26 m, 8 m and 7 m** rather than 39; the old first leg would have moved the visitor at 15 m/s, six times §12.3's top speed.

**Stop 3 is not authored here.** It reads §2.1.1's pose, for the reason §7.1 gives about lights: a stop written as its own coordinate beside the thing it is a stop for drifts the moment that thing moves, and it drifts silently because a camera 2 m off still looks like a camera.

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
| **Locked view** (§2.1.1) | **linear, same 600 ms** — moves without acceleration rather than jumping |
| Project transition | hard cut, 0 ms |
| **Project auto-advance** (§2.1) | **off** — see below |
| Neon flicker | constant on |
| Ground normal scroll | frozen |
| Ripples | off — **removed, not stilled**, and §10.0 has why: a ring's radius is its only state, so a frozen one is a bullseye painted on the road |
| Steam | static, opacity 0.05 |
| Rain | opacity **0.22**, count **× 0.5**, speed unchanged (slower rain reads as broken, not as calm) |
| Chromatic aberration, noise | off |
| Bloom, vignette, fog, reflections | **unchanged** — they are not motion |

**The locked view moves rather than jumping, and that is the one place this table chooses the gentler of §13's two options.** §13 permits *"without acceleration, or jump"*. A jump is right for §12.6's guided path, which teleports the visitor to a stop they asked for. It is wrong here, because the lock starts from wherever the visitor happens to be standing and a cut would give them no way to tell whether they moved or the world did. Linear over the same 600 ms keeps the causal link and removes the easing, which is what the rule is actually asking for.

**Auto-advance comes off entirely, and this is the row that is about someone other than a games player.** Ten seconds of self-advancing content is motion under any reading, and content that updates on its own for more than five seconds is squarely what WCAG 2.2.2 is about. §2.1's *"stops on the first manual page"* is a real stop mechanism, but it only helps a visitor who has already touched something — a stranger who touches nothing still gets a board changing under them. Under reduced motion the board shows the first project and waits; the arrow plates, the keys and the swipe all still work, so **nothing becomes unreachable, it only stops happening by itself.** That is §13's whole rule applied to the one piece of the world that moves without being asked.

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
| Texture memory | ≤ **34 MB** | ≤ **9 MB** |
| Dynamic lights | **11** | 7 |
| Engine chunk (gzip) | ≤ **600 kB**, split so it caches independently of app code | same |
| Time to first frame after gate | ≤ **1.5 s** on a warm cache | ≤ 2.5 s |

**Turn-down ladder, in this order:** reflector resolution → post-processing passes → rain density (halve on mobile as a matter of course) → draw calls (instance harder before deleting anything) → shadow maps (already off).

**Desktop texture memory went 14 → 18 MB, and mobile did not move.** §3.5 flagged the overrun and ruled that *"the budget itself is what should be revisited, once"*; this is that once. The world stands at **16.94 MB** and every lever §3.5 listed was worse than the cap: dropping the sign canvases costs the legibility that makes a projecting sign worth projecting, and halving the puddle mask is §6's turn-down ladder, which exists for frame time and not for memory — and §10.0 has now given that mask a second job, so shrinking it degrades the ripples too.

**The number is 18 and not 17 on purpose.** A ceiling set to today's total has to be raised again by the next thing that arrives, and §16 item 6 — the project screenshots — is known not to fit at all. **Mobile stays at 9** and lands near 5.3, because every painter is tier-scaled; the two columns exist because they are two different machines, and 18 MB of texture is not what constrains a desktop GPU. **Mobile is the number that means something**, and it did not need to change.

**Desktop then went 18 → 34 with §2.1's board, which is the raise the paragraph above said was coming.** §16 item 6 predicted the screenshots would not fit and it was right; what it under-counted was the board's own painted face, which is a 1024² canvas and costs more than any single screenshot.

| Consumer | Desktop | Mobile |
|---|---|---|
| Everything before §2.1 | 17.61 | ~5.30 |
| §2.1 screenshots, 3 resident at 1024 × 544 / 512 × 272 | +8.91 | +2.13 |
| §2.1 board face, one canvas repainted per project | +5.59 | +1.40 |
| §2.1 project neon sign, 128 × 1024 / 64 × 512 | +0.70 | +0.17 |
| §6.2 ripple normal, now tier-split | — | **−1.05** |
| §3.4 surface grain — one canvas, `map` + `roughnessMap` | +1.40 | +0.35 |
| §3.4 surface normal — Sobel of the same field | +1.40 | +0.35 |
| **Total** | **35.61 of 34** | **8.65 of 9** |

**Desktop is 1.61 MB over and is being left over, deliberately and with the reason recorded.** §3.4's grain is the one thing in this world that answers *the walls look like plastic*, which is a complaint about the surface the visitor spends the whole session two metres from; the cap is a number chosen in §3.5 and raised once already. **Neither is a reason to fix this by picking whichever is easier to move.** What is not acceptable is fixing it silently — so it is written here as a breach rather than as a new ceiling, and it stays that way until the pass that measures the whole world at once (§16) decides between three levers that all exist and none of which has been tried: the grain canvases at 384² instead of 512² (−1.24 MB, and they are noise), the two §2.1 sign canvases sharing one painter, and §3.3's three bay variants at 384². **A budget that gets raised every time something wants room is not a budget; a budget that is silently exceeded is worse than both.**

**Mobile fits, at 8.65 of 9, and that is the column that means something.** Every painter in this pass is tier-split from the first line — the grain and its normal are 256² there — which is the discipline §16.12 went looking for when it found §6.2's ripple normal had never had a split at all.

**Draw calls, measured at spawn with the whole alley in frame: 101 of 140 desktop, 95 of 90 mobile.** §3.7 called 93 of 90 *"the same problem one section later"* and it still is. Since then §2.1's board arrived, §3.7's scooter became three merged instances instead of parts folded into existing buckets, and §3.3's reveal grid cost one. **Mobile has been over this cap for three sections and the lever §3.7 named has still not been spent**: merging by material rather than by `(geometry, material)` takes §3.7's twelve buckets to eight. That is four calls for nothing visual, which is exactly the margin, and it is recorded here for the third time rather than done because it is a change to how the whole prop layer is drawn and belongs in its own diff.

Triangles are not close on either tier — 157 k of 350 k desktop, 89 k of 220 k mobile — which is worth stating precisely because it is the number that *feels* like it should be the constraint and never has been. **In this world the ceiling is always draw calls.**

**Three resident, not four, and that is §17's rule rather than a tuning knob.** Keeping every screenshot in memory is O(N) in the project count, and §17 requires that a project added to `CONTENT.md` appear *with no component edited* — a fifth project must not silently put the world over budget. `{prev, current, next}` is O(1), and with four projects it is not even a compromise: the only non-resident screenshot is two pages away in either direction, so paging never waits.

**The board face is one canvas, repainted on project change, never four cached.** Four cached desktop faces would be 22 MB on their own — more than the entire world was before this section. §11.1's redraw policy already says *once on mount, and once per project change*, which is exactly this.

**Mobile again did not move, and again that is the number that means something.** It lands at 7.95 of 9 — and it only fits because §6.2's ripple normal turned out to be the one painter in the world that had never been tier-split. That saving is real headroom recovered, not an accounting trick: the map is genuinely too large for a phone and always was.

Everything repeated is `InstancedMesh` or drei `<Instances>`: shutters, lanterns, condensers, cables, crates, rain, steam, ripples. Geometries and materials are created once at module scope or in `useMemo`, never in a render body.

### 15.1 Which column the world reads

§6, §7, §9, §10 and §15 all table a desktop and a mobile value. One rule picks between them.

**Mobile when the pointer is coarse, or the viewport is 820 px or narrower.** The pointer test is the honest one — it is what actually distinguishes a phone. The width test exists so the mobile column can be exercised by resizing a desktop browser, which is how it gets checked during development.

**Resolved once at first read, then frozen for the life of the page.** It has to be: the tier feeds the Canvas's `antialias` flag, which is fixed at WebGL context creation and cannot be changed afterwards. A tier that flipped mid-session would leave the renderer and the values describing it disagreeing — a fault that shows up looking like it lives somewhere else entirely. A window dragged narrow after load keeps the tier it started with, by design.

Orientation is the exception and *is* live, because the §12.1 FOV split has to follow the device in the visitor's hands.

---

## 16. Deliberately not specified

These need a decision before the code that depends on them is written, and the brief will be updated rather than the value invented:

1. ~~**Screenshot pre-processing**~~ — **settled with §2.1: no build step.** The `#A6B2C6` tint in §8 does the whole darkening job, and the resize is done at runtime. See §16.12.
2. **The bend geometry at `z = +23`** — the *orientation* is settled (§3.1: across the end, 20° off square) and thickness is 1.00 (§3), so the shell builds it as a bare box. **What the opening reveals is now settled too — §3.6, the cross street.** What remains open is the return wall's own modelled form: the shuttered doors on its face. Lands with the rest of the §3.2 inventory.
3. **Font subsetting for the Japanese canvas faces** — currently system faces only; if a webfont ships, it must be subset to the fourteen strings in §11.4 and re-budgeted against §15.
4. **Whether the door opens a real tab or a confirm step on mobile** — popup blockers treat a canvas click differently across browsers.
5. **The gutter's 0.03 recess** — §3 resolves how the gutter *reads* (through the puddle mask) but not how it gets depth. It needs the floor to stop being a plane. Decide with the kerb and drain modelling.
6. ~~**§15's texture budget cannot hold §2.1's screenshots.**~~ — **settled with §2.1**, and it was right that they did not fit. The resize happens at runtime rather than in a build step, at 1024 × 544 desktop and 512 × 272 mobile, with three resident. §15 and §16.12 carry the arithmetic.
7. **Turning without a pointer** — §12.2 makes looking a drag and §12.3 spends the arrows on movement, so a visitor with a keyboard and no pointing device can walk but cannot turn. The answer this document already contains is §12.6's guided path and §12.7's top nav, which reach every surface without walking; whether that is *enough*, or whether a key should rotate the camera, is decided when those two exist and can be tested against the ten-second test in §17. Named rather than patched, because a `Q`/`E` binding invented now would be a second movement basis nobody asked for.

8. ~~**The alley mouth around `z = +22` is reserved.**~~ — **resolved: the showcase moved to the bend.** The reservation did its job. §2.1 is now on that wall and §16.12 records the move.

9. **§7's lights 4 and 5** — **2 and 3 are settled with §2.1** (§7 has the derivations). Lights 4 and 5 belong to §2.2's vending machine and §2.3's payphone, neither of which exists, and a light cannot be set against a surface that is not there. Light 5 is a `pointLight` at 2.5 cd and is wrong by §7.1's argument; light 4 is a `rectAreaLight` in cd/m², which that correction says nothing about and which §2.1's light 2 now gives a worked precedent for — luminance × area against the alley's candela. Both are set when their surfaces are built.

10. **The west wall's 5.20 m gap.** §3.4 reserves `z ∈ [−6.60, −1.40]` for a showcase that is now at the bend, so that stretch of west wall is bare and will read as one. **Filling it is deliberately not part of §2.1's build**, and the reason is the size of the blast radius rather than the size of the work: `STOREFRONT.reserved` feeds a largest-remainder apportionment, so removing the slot redraws every unit width, joint, doorway and sign box on that wall — which moves §3.5's sign `z` values, which moves the sign panel centres, which re-seats **§7.1's five dynamic lights**, which re-runs §3.7's five placement audits. That is a full re-verification of four sections to close a gap, and it deserves its own diff rather than riding in on the showcase's.

11. **Auto-advance while the visitor is locked in front of the board.** §2.1 stops the automatic paging on the first manual page, which is unambiguous for someone walking past. It does not say what should happen inside §2.1.1's locked view, where the visitor is deliberately reading. Both readings are defensible — the lock is the one place all four projects can be seen without walking, and it is also the one place someone is definitely mid-sentence. **Currently it keeps running.** Decided by watching it, not by arguing about it.

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

**Texture memory is over budget by 4.7% on desktop** and every lever is a value in this document. Open, and named in §3.5. **Resolved in §16.10** — §15's desktop figure was the value that was wrong.

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

### 16.8 Settled during the rain and lighting build

**The rain's derived figures** — streak length from §10's texture aspect, lean from §10's two speeds, the far box from §3's alley — are in §10.1 with their arithmetic beside them. Free choices, deliberately few: quads over points, one shared billboard yaw, and per-axis wrapping in the near box.

**Nine of §7's ten lights had never been mounted, and the world did not look unlit.** That is the finding worth keeping. §5.1's environment was carrying the entire alley — walls, metal, floor — while §7 sat at one light of ten, and because the result was *bright enough* nothing ever pointed at it. It surfaced only when the shapes it was casting were named out loud: a red circle and two coloured rectangles lying on the ground with nothing above them.

**"Give it a source" turned out to be impossible rather than merely undone.** A cube-mapped environment is sampled by direction, so everything in it is at infinity and its reflection is positioned by the camera; the four coloured formers slid across the floor as the visitor walked. No object can be placed over something that moves when you move. That is why they were removed rather than re-sited or dimmed — see §7.1.

**The thing that made the replacement decidable was measuring it rather than looking at it.** Removing the four left an alley that could not be walked, and the first two attempts at putting the light back — the hemisphere, then the surviving `void` former — both failed for the same reason and neither failure was obvious by eye. A sweep of 0.35 → 4.0 on the hemisphere moved the frame by 5%. **68% of the frame was environment, arriving through reflection**, and §4's near-black albedos are why: there was never any diffuse light to raise. Three measurements settled in ten minutes what an afternoon of adjusting values would have got wrong, and the final colour was solved to within 0.3% on the first try.

**A uniform environment is not the same object as a lightformer, and the difference is the whole answer.** Shape is what made the four unmotivated — an edge, a size, a place. Remove all three and what is left cannot be read as a thing, so it cannot be missing a source. That is the rule this section leaves behind: **anything in the environment that has a boundary needs a reason; anything uniform does not.**

**Matching a mean is not matching a look, and that is the second lesson of the measurement.** Solving the fill against the frame's average luminance was rigorous, reproducible, and landed within 0.3% — and it produced the wrong picture, because the average said nothing about *where* the light was. The four formers put their light in three patches; the fill spread the same total evenly, and evenly means mostly on the floor, because a wet road at grazing incidence mirrors the sky. **Measure the thing you actually care about.** Here that was the road, and the road is what §5.1's second solve is set against.

**The pale road was then blamed on three innocent things before the real cause was found.** In order: the ground's missing `envMapIntensity` — §8's only row without one, so a plausible suspect and demonstrably not it; then §5.1's fill; then §6's `mixStrength`. All three were tested by eye and two of the tests were worthless, because `MeshReflectorMaterial` rebuilds its material and quietly discarded every runtime value that was poked into it. **The answer came from reading pixels**: the road was `5, 13, 34` near the camera and `37, 61, 114` at range, which is not a lit surface but an accumulating veil — §10.1's rain, eight times too large. Two causes overlapped, the smaller one was found first, and the larger one was invisible until the frame buffer was sampled instead of looked at.

**Colour became a derived property.** §7's colour column was a palette plan written for an empty alley, and two of its five named light no nearby surface could emit. Seating each light on a §3.5 sign index — rather than on a coordinate — means the light follows the generator, takes the emitter's own colour, and cannot drift 2 m from its sign and still look plausible. The same reasoning §3.4 used for its layout, applied to light.

**§7's mobile rule was arithmetic mistaken for a preference.** *Drop 8, 9, 10* was how ten lights became §15's seven. Applied to a world with six built lights it dropped half of them and left a phone with two lit points in forty-four metres. It now reads as the cap it always was.

**Every emissive value was already right, and that was the trap.** The instinct on being asked for *"things lit up at the brief's value"* is to go and set them. They were set — 2.40, 1.10, 0.85, 1.30, 0.95, 2.60, 1.55 — and had been since §3.4. **What was missing was that an emissive material lights only itself**, which is a sentence §3.5 had already written about the banners and §3.6 about the far building, twice, without either time generalising it.

### 16.9 Settled during the reflection and emissive build

**The neon reflections this world lost were never a reflection of this world.** §5.1's four lightformers were, and §7.1 removed them for reasons that remain correct. What replaced them was a uniform fill, and a uniform environment reflected in a mirror is a uniform mirror — so the road became a flat sheet with no colour, no puddles and no signs in it. **The right replacement was not a better fake but the real one**, which had been rendering into a 1024² buffer, correctly, from the first day, and arriving on screen at 2.4% strength. §6.0 has the arithmetic.

**This is strictly better than what it replaces, and not as a matter of taste.** §7.1's objection to the lightformers was geometric: a cube map is sampled by direction, so everything in it is at infinity, so its reflection is positioned by the camera and slides across the ground as the visitor walks, and nothing can ever be put above it. A planar reflection of a real sign at a real height on a real wall is positioned by the *sign*. It cannot slide, and its source is directly above it by construction. The thing §7.1 said was impossible turned out to be already built.

**Three of §6's numbers were authored against the wrong model of the material, and all three failed in the same direction.** `mixStrength` as a fraction rather than a fraction-divided-by-albedo; `mixContrast` as a contrast rather than a recentre about a pivot the whole scene sits below; `mixBlur` as a blur fraction rather than one divided by the roughness twice. Each was individually plausible and each was reading a uniform's *name* instead of the line of GLSL it lands in. **Where a value goes through someone else's shader, the shader is the specification** — the same lesson §6.2 learned about `normalScale` and drei's reflection UV, one section earlier and without generalising it either.

**An hour was lost to a measurement bug, and the shape of it is worth keeping.** The frame-buffer probe cached `window.__probe` in a closure at definition time while the capture loop *replaced* the object every frame, so every reading after the first came from one frozen frame. It did not look like a broken probe. It looked like a finding: mixStrength swept `8 → 700` with the road identical to the byte, then the normal map and the distortion map removed with the road still identical to the byte — three independent dials all reading dead, which is far more convincing evidence of a stale buffer than of three dead dials, and was read as the opposite. **A row of numbers that does not move at all is a broken instrument; a row that moves wrongly is a finding.** The rebuilt probe mutates one buffer in place, so nothing can hold a stale reference to it.

**Two things measured as genuinely inert, and both are recorded so they are not tried again.** `envMapIntensity` on the reflector does nothing whatsoever — swept 1.0 → 0.0 with the road unchanged to the byte — which retires §8's missing wet-asphalt row as a suspect for good; it was blamed once already in §16.8. `scene.environmentIntensity` does work, and scales the road and everything else together, which is exactly why it is not the dial for *"brighter, but keep the street dark."*

**What made the whole thing decidable was measuring the right pixels.** §5.1's road figures were sampled by projecting a world point and reading it, and at eye height a point 25 m down a 46 m alley is **3.8° below the horizon** — the fog at the end of the street, not the floor. The road that fills the lower half of the frame was never in any of those numbers. Sampling by *screen row* and reporting the ground point each row actually lands on is the version that cannot be wrong about what it is looking at, and it is what the road figures in §6.0 and §7 are.

**The rain had to be hidden to measure anything.** Streaks crossing a scan row moved the side-to-side standard deviation by more than the dials did, and produced a sweep where 8 and 40 disagreed while 40 and 120 agreed. Six frames averaged with the rain switched off is the measurement; the rain is what is being seen through, not what is being measured.

### 16.11 Settled during the realism pass

**One bug in the ripple shader was three separate look complaints.** The cycle wrapped on the interval and the age divided by the life, so no ring could exceed age 0.786 — the `discard` guarding age > 1.0 was **dead code**, no ring ever faded (it was cut at alpha 0.028, a step rather than a fade), and every emitter restarted instantly in the same place. Reported as *"should fade out to nothing"* and *"should not reappear in exactly the same spot"*, which are the same line of arithmetic seen twice. §10.0.1 has the fix: two generations per emitter, which is `ceil(1.4 ÷ 1.1)` and therefore derived, and which is also what §10.0 had *claimed* was happening and had never built.

**The jitter is measured per emitter, and the measurement is what made it usable.** A global bound honest enough for the worst emitter is about 0.05 m and invisible. Probing eight points at each rung of a ladder against §6.2's own mask gave **36 of 48 emitters the full 0.36 m** and none of them zero — mean 0.313 m, six times what a single safe number would have allowed. The pattern generalises: *where a constraint varies per object, measure it per object rather than taking the worst case as a constant.*

**The lantern fault was occlusion, not intersection, and the brief was wrong about why it was possible.** §3.7 claimed lantern anchors were derived from §3.4's joints; only the standpipes ever were. The shades hang at `y ∈ [3.000, 3.360]`, entirely inside a lit box's span and 65 mm in front of its face — nothing touched, and a paper lantern simply blanked the middle of a painted sign. Two moved, and more importantly §3.7 gained §3.5's clearance rule with `audit()` enforcing it, because §3.4's layout is generated and the next collision would have arrived unannounced. **Deriving them was the wrong repair**: §3.4's joints leave 0.04–0.10 m of clear air beside a box and six of the arms would pass through a standpipe.

**§17's opening line had been false since the shell.** *"You turn round and the shutter is down"* — §3.1 had specified a roller shutter at the north end from the beginning and the wall was a bare facade box. Nothing in §16.1 through §16.10 noticed, because every one of those passes was checking the thing it had just built. **A definition-of-done is only a check if something actually runs it.**

**The slat pitch decided the gate the opposite way to intuition.** §8 carries a 24 × 1 corrugated-normal row and the gate is the world's only one-size shutter, so it looked like §8's case — but §3.4 never used that row, because a *repeat* scales with its surface and a *pitch* does not. The pitch belongs to the shutter, not to the opening, so a 9.00 m gate takes the same 0.09 m slats as a 3.60 m shop. "Bigger door, heavier slats" was the plausible wrong answer.

### 16.10 Settled during the signage and ripple build

**Three of the eight things asked for were not what they looked like, and finding that out was most of the work.** The nine neon signs were reported as untextured rectangles; they have carried §11.4 strings since §3.5. The flat rectangles were §3.4's fourteen sign boxes, blank *by decision*. The missing ground texture was §10's ripple emitters, fully specified for four sections and simply never built. **The lesson is that a visual complaint names a symptom and not a population** — "these rectangles" covered three different objects with three different histories, and had any of them been fixed on the strength of the description, the wrong one would have changed.

**A rule was over-applied, and that is a distinct failure from a rule being wrong.** §3.5's *the sign wins because it carries a §11.4 string and the box carries nothing* is correct about **which of two objects competing for one stretch of wall gets the words**. It was read as a statement about sign boxes in general, so all fourteen were built blank — including the nine with no sign anywhere near them. The rule kept its exact wording and gained a scope.

**§15's own numbers had to be the thing that moved, twice.** Texture memory had been over budget since §3.5 with every listed lever costing more than the overrun; the dynamic-light cap of ten was *exactly* full, so the station gate — §17's opening beat — could not be lit without changing a value. In both cases the correct fix was the budget, and in both cases the mobile column was left alone, because that is the column that describes a real constraint.

**Adding six brackets reduced the draw calls by fourteen.** The nine existing brackets shared a geometry and a material and were nine separate meshes; instancing them along with the six new ones collapsed 15 → 1, which is what made §10's ripple emitters fit on a mobile tier already sitting at 90 of 90. **The cheapest place to find headroom was inside the thing being extended**, not by cutting something else — and §15 had said so all along.

**A ring's radius is its only state, which is why §13 removes ripples rather than freezing them.** Every other entry in §13 stills a motion and leaves an object; this one cannot, because the object *is* the motion. §13 already read *off*; what was missing was the reason, and without it the next reader would have tried to make a static version.

**Where a value is authored against a knee, raise the distance and not the value.** §8.1's banner rung came up from 0.95 — where it had been set to match the station plate, a comparison about *material* rather than about visibility. Three 3.20 m banners are the largest lit surfaces above eye level and were sitting one hundredth of a step over the bloom threshold. The plate stayed, because it is genuinely meant to be barely there. **A shared rung hid the fact that one is read from forty metres and the other from four.**

**Mobile finished one draw call over the cap, and it is recorded rather than rounded.** Desktop 96 of 140 and **mobile 91 of 90**. The bracket instancing came in at −8 rather than the −14 first written down (nine brackets existed, not fifteen — the larger figure took the post-change count as the baseline), and the painted sign boxes then spent three of it: seven strings means seven canvases means seven materials means seven meshes, where colour-grouping gave four. §15.1's tier split absorbed most of that — **the painted faces are desktop-only**, and mobile keeps the wordless colour-grouped boxes it already had, because at its 128 × 64 canvas the glyphs were barely arriving anyway. That recovered three of the four. The last one is §3.7's merge-by-material lever, worth −4 and still unspent.

**Two shader failures in one build, both silent, both pointing away from themselves.** Turbopack documents a `type: 'raw'` module rule that would have let `shaders/` hold real `.glsl` files with no dependency; on 16.2.12 it resolved the import to `undefined`, `ShaderMaterial` fell back to three's own default — `gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)` — and the alley got twelve opaque red rectangles lying on the road with no error anywhere. Then, once the GLSL was reaching the GPU, `fog: true` on a `ShaderMaterial` compiled the fog chunk without supplying its uniforms, and three's per-frame `refreshFogUniforms` threw `undefined.value` from inside the renderer, blanking the canvas. **Neither symptom named a shader.** The GLSL now lives in `shaders/ripple.ts` as template literals, where a missing export is a compile error, and `UniformsLib.fog` is merged explicitly.

**The rings are placed from the mask, not scattered.** §6.2 already decides where water is, and a ring expanding on a dry island contradicts it in the most visible way available. Sampling the painted canvas rather than the weight function that generated it is the distinction that matters: the function describes the bias, the canvas describes the blobs, and a ring has to land in a blob. This gave §6.2's mask a second consumer at no cost in memory — the same argument it made for cloning the ripple normal onto the base plane.

### 16.12 Settled during the showcase build

**§16 item 8 is resolved, and the reservation is why there was anything to resolve.** The showcase moved from the west wall to the bend. That item was written when a `lantern`-coloured landmark was cancelled for the same spot, and its argument was that a decorative object placed there *could not be relabelled as the showcase afterwards — it would have to be deleted, and by then it will look load-bearing.* Nothing was there to delete. **The value of a reservation is only ever visible at the moment it is redeemed**, and it is invisible at every other moment, which is why it has to be written down rather than remembered.

**Moving a section falsifies the sections that cited it, and two of those citations were structural.** §3's wall thickness was *"set by the 0.55 shopfront recess"* and §3.3's window band base was *"the top of the §2.1 shopfront recess"*. The recess no longer exists. Both numbers stay: 4.60 is now load-bearing in the opposite direction — §3.3's floor counts, §3.4's band top, every §3.5 sign `z`, and the five §7.1 lights seated on those signs all derive from it, so re-deriving it would redraw both facades to move a line nothing is asking to move. **A value whose reason has expired is not automatically a value that is wrong**, but leaving it pointing at a deleted section is how a brief rots.

**The board's width could not be chosen, and the thing that decided it was §3's clamp.** The reading distance is fixed by where a visitor can physically stand, which on a wall at 20° to a rectangular clamp varies from 0.645 m to nine. That forces a locked pose; the pose fixes the distance at 3.4297 m; the distance and §12.1's portrait FOV fix the width at 2.059 m. §2.1's old 3.20 m lightbox is not merely too big here, it is **impossible** — it needs 5.44 m of standoff and the face normal leaves `BOUNDS` at 5.11.

**The lateral offset in the locked pose is not composition.** Head-on, the pose lands inside §3.7's dead vending machine at west `z = 20.3`, whose resolver stops the visitor at `x = −3.16`. Offset 0.45 m along the face it clears by 0.57 m. This is the class of fault that is only ever found by standing where the code puts you.

**The surrender order had been wrong since the gate light landed, and nothing had asked it.** §7 described mobile as holding *"six lights in the world"*; §16.10 had made it seven, so it was exactly full rather than comfortable, and `[10, 9, 8]` would have taken **light 10 — the one the visitor spawns 1.15 m from** — the first time §2 arrived. Highest-id-first was a proxy for importance that stopped tracking it. The new order is `[9, 8, 7, 6]`, and lights 10 and 11 are **not in it at all**: a budget that can reach the spawn light or §17's opening beat is not a budget.

**§6.2's ripple normal was the only painter in the world with no tier split**, found while budgeting mobile for the board. Every other canvas halves; this one shipped at 512² on both tiers from the ground build onward. Turning it down on mobile returned **1.05 MB — more than the board's entire painted face costs there**. §6's turn-down ladder already read *1024 → 512 → 256*; it was understood to be about the reflector target and it was always about this map too. **A value that is identical on both tiers is not a decision that was taken, it is one that was skipped**, and the way to find those is to go looking when a budget is tight rather than to raise the cap.

**Three screenshots resident and not four, because §17 is O(1) and a cache is not.** *A project added to `CONTENT.md` appears with no component edited* — so a fifth project must not put the world over §15. `{prev, current, next}` costs the same at four projects as at twelve, and with four it is not even a compromise: the one non-resident image is two pages away in either direction.

**The click guard was measured before anything was built on it.** §12.2 specifies *a pointer that travelled more than 6 px between down and up is a look, not a click*, and that constant had sat unused since the player build. A probe mesh confirmed both halves: a clean tap reports `delta` 0 with the camera unmoved, and a 60 px drag ending over the same mesh **still fires the click** — `delta` 113, camera yawed 14°. Without the guard that drag opens a door. Also confirmed: `Camera.tsx`'s `setPointerCapture` does not starve the raycast, because it captures on the canvas, which is the element the event system is already bound to. **A rule that has never had a consumer has never been tested**, and this one had one build's worth of assumptions resting on it.

### 16.13 Settled during the surface pass

**Three complaints, and all three were the same complaint: nothing in this world varies across its own surface.** A pole through a sign, a scooter that reads as crates, walls that read as plastic. §6 spent an entire section on the ground because it varies — puddles, ripples, a reflection — and every vertical surface beside it was one flat value with a highlight in the middle of it. **The alley was built as a set of correct objects and it needed to be built as a set of surfaces**, which is a different thing and is not visible in any number the budget tracks.

**The pole rule was written as a paragraph and shipped as a fault, twice.** `pole-through-sign-box` had a full derivation in a source comment for two passes while the thing it describes was on screen. Everything in `lib/props.ts` that *is* a rule — overlaps, doorways, reserved slots, awnings, lanterns over sign boxes — has caught something nobody was looking for; the one that was only prose caught nothing. **A placement rule that only lives in a comment is a rule that has not been checked**, and the cost of finding that out was four `audit()` failures on four consecutive edits and three screenshots from the person who has to look at it.

**The 1.30 m clearance is derived and the derivation says something about the alley.** A pole's silhouette does not land on its own `z`: it lands at `z_pole + (M − 1)(z_pole − z_eye)` with `M = 1.078`, so walking the alley swings it ±3.3 m. Taken literally, **no pole can be placed anywhere on either wall** — which is not a conclusion about poles, it is the corridor telling you that a 44 m sightline crosses everything with everything. Scoping the rule to the range where a sign is legible (±8 m) gives 1.29 m, and the figure a screenshot had already produced was 1.2. **A derivation that agrees with a measurement is worth more than either alone**, and one that returns "impossible" is usually asking a question with the wrong bounds rather than reporting a fact.

**Two vocabulary rules turned out to be one rule that had been transcribed wrong.** §3.2 and §3.4 both read *boxes and cylinders*, and §3.6 had already broken that for the cross-street cars with an argument that was never folded back: **the rule is "nothing at a fidelity nothing around it shares"**, and boxes were an implementation of it that held while every distance in the world was 20 m or more. The scooter stands at 2 m. Nothing about the principle changed; the transcription of it had quietly become the thing being enforced.

**`lib/carModels.ts` took a second caller with no changes, which is the only real test that split was drawn correctly.** It was written for §3.6 — bake the node transforms into the vertices, merge by material, normalise to a target length with the nose at `+X`, then *measure* rather than predict. All four of those are properties of turning a glTF into something instanceable, none is a property of a car, and the file knew the difference before there was any way to tell.

**Facade depth is normals, not shadows, and that is a standing property of this world rather than a trick used here.** §15 has shadow maps off and §7's ten lights are spent inside the alley, so a recessed window cannot be shaded by anything. It reads because a reveal is *a surface facing sideways*: the jamb and head faces take §7's grazing light at a different angle from the wall in front of them. §3.4's shopfronts have worked this way since they were built — the recess is faked by standing everything else proud — and §3.3 is that trick moved one band up.

**Two coplanar front faces is z-fighting across an entire facade, and the fix is 3 cm.** Piers run the full band height and spandrels the full bay width, so all thirty crossings have two boxes meeting; at equal depth their front faces coincide. Offsetting them by 0.03 makes the piers win every crossing and turns an artefact into a concrete-frame facade. The alternative — segmenting the piers per floor so nothing overlaps — is 342 instances instead of 114 to avoid a problem one number solves. **The first idea for a geometric conflict is usually more geometry, and it is usually wrong.**

**One greyscale canvas fills `map` and `roughnessMap` because in this world the polarity agrees.** Dark texels darken the §4 token *and* lower the §8 roughness — darker and glossier, which is wrong on a dry wall and exactly right on one standing in §10's rain. Both slots multiply, so the map can only take a surface away from its authored value in one direction: **nothing in this canvas can make a surface lighter or rougher than the palette says it is**, which is what makes it safe to put on every large flat surface at once.

**Instanced unit boxes stretch their UVs and there is no fixing it**, only choosing noise that survives it. A 6.20 m fascia and a 0.30 m pier sample the same 0 → 1 UV, so the texture arrives stretched by up to 4:1. Blotches and streaks smear and give the game away; isotropic aggregate speckle stretched 4:1 is still speckle. **This is a constraint of the technique that was chosen for the draw-call budget, and it is answered inside the technique rather than by abandoning it.**

### 16.14 Settled during the visibility pass

**The complaint was "the props are too dark" and the answer was not light.** Two levers were tried in the order anyone would try them, and both failed in a way that is worth recording: raising §7's hemisphere **eight-fold** and the five alley lights **three and a half times** changed the west wall barely at all. What changed it completely — at the *authored* light intensities — was §4.1's albedo correction. **1.2% of a large number is still a small number**, and every hour spent on the light side of that multiplication was an hour spent on the wrong term.

**The root cause was a category error in §4: a hex in a palette is an albedo, not a pixel.** Those five colours were picked by looking at a dark render, so they encode *how dark the wall should appear* — but three.js reads them as *what fraction of light the wall returns*, and the darkness was then applied a second time by §7 having almost no light in it and §5 eating what was left. Authoring both and multiplying them is how a wall ends up at 0.8% reflectance, which is darker than charcoal and about a fifth of fresh asphalt. **The scene is supposed to be dark because there is nothing lighting it, not because the surfaces are black.**

**Scaling five tokens by one factor beat re-choosing five colours.** ×1.75 per sRGB channel, ×3.83 linear, applied to all of them: the hues, the ordering and the distances between them survive exactly. **A palette is a set of relations**, and re-picking by eye to fix one member would have quietly changed all of them — which is the failure mode that makes a palette stop being a palette.

**`decay: 2` was the wrong falloff law and it had been wrong since §7.1.** Every one of these lights stands in for an *area* emitter — a square metre of neon, a lit acrylic panel, a backlit plate — and inverse-square is the far-field limit of an area source. Close to a panel the falloff is nearer linear, and "close" means within a few multiples of the panel's own size, which in a 9 m alley is everywhere a visitor can stand. At decay 2 almost the entire output landed within a metre of a sign nobody can reach. 1.45 delivers **8.0 lux** at knee height six metres away where 2 delivered 3.4, with the source unchanged.

**And `distance` is a cutoff, not a reach.** three.js windows the falloff to zero at that boundary, so props at 8.7 m from a light with `distance: 10` were being crushed toward black by the *window* rather than by the physics — at exactly the range where §7.1's five pools were meant to be overlapping. `reachReport()` said the pools were continuous and it was telling the truth about the wrong quantity. **Two numbers on one light meant two different things and only one of them was physical.**

**A second reflector was the obvious way to wet the cross street and the wrong one.** `MeshReflectorMaterial` renders the whole scene again from a mirrored camera; a second one doubles §15's most expensive pass. Extending the existing plane costs **nothing extra per frame** — the render target does not grow with the geometry — and pays in resolution spread instead, 13% coarser reflections everywhere. For a road seen through a 3.36 m slot at 30 m through fog, that is the cheap side of the trade. ***Add another one* is always the first idea and it is usually the expensive one.**

**The 0.2 m gap that caused it was a good decision that outlived its reason.** §3.6 started the carriageway at 26.2 because the reflector ended at 26.0 and a material seam under a light is ugly. It avoided a seam nobody would have noticed and created a hard edge between *wet* and *not wet* across the one view that opens out of the alley. **A boundary chosen to hide a small artefact produced a much louder one**, which is only ever visible from the far side of the thing being hidden.

---

## 17. Definition of done, for this world specifically

- You spawn facing an empty alley. You turn round and the shutter is down. You understand what happened without being told.
- The ground is the brightest thing in the frame and it is not a light source.
- Three things are lit warmer than everything else and they are the only three things you can touch.
- Nothing in the backdrop responds to a click.
- A project added to `CONTENT.md` appears on the board with no component edited.
- Every door opens the real deployment.
- The whole alley is walkable end to end in under twenty seconds, and nothing lets you out of it.
- **A stranger, on a phone, finds the contact details in ten seconds without walking anywhere.**
