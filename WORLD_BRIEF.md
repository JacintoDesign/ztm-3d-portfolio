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
| Ground | `y = 0`, single plane 60 × 60 (overscan hidden by fog) |
| Kerb | 0.12 high, 0.60 wide, both sides, inner edge at `x = ±3.90` |
| Gutter channel | 0.22 wide at `x = ±3.72`, 0.03 deep — standing water, roughness 0.06 |
| **Walkable clamp** | **`x ∈ [-3.60, +3.60]`, `z ∈ [-21.0, +21.4]`** (hard, in addition to AABBs) |
| Player radius | 0.32 |

### 3.1 The two ends (there is no horizon)

- **North, `z = -23`** — the station ticket gate. Full-width wall, roller shutter down, a dark backlit `終電` plate above it at 4.2 m, three dead gate machines in silhouette. This is behind you at spawn; turning round is the story beat.
- **South, `z = +23`** — the alley bends left. A 6 m return wall of shuttered doors at 20° to the axis, so no vanishing point is visible, and fog closes it at 0.24 transmittance.
- **Above** — an overhead mat of cable and wire at `y ∈ [6.5, 9.0]`, plus three cross-alley banner wires. There is **no sky dome and no HDRI**: `scene.background` is a flat `#04060B` and the fog eats everything before the facade tops.

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
| Bicycles leaning | 4 | yes |
| Crates and beer cases stacked | 9 | yes |
| Traffic cone + barrier | 3 | yes |
| Steam vents (grates) | 3 | no |
| Overhead cable spans | 34 | no |
| Utility poles | 6 | yes |
| Puddle decals | 18 | no |
| Ripple emitters | 12 | no |

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
| Fog | `FogExp2`, colour `fogColor` `#0A0F1A`, **density `0.032`** |
| Fog check | ~0.62 transmittance at 23 m, ~0.24 at 40 m — the far end is legible but never resolves |
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
| `roughness` (base) | 0.18 | 0.22 |
| `metalness` | 0.0 | 0.0 |

- **Roughness map** — a puddle mask, generated once to a canvas: values `0.06` inside puddles, `0.55` on dry patches, blurred 14 px at the boundary. Same mask drives `distortionMap`.
- **Normal map** — a tiling ripple, `normalScale = [0.15, 0.15]`, UV repeat 8, scrolling `+0.012 u/s` in `z`. Off under reduced motion.
- **Reflections render at half the ground plane only** (`x ∈ [-6, 6]`); beyond that the fog has it anyway.

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
| Vertical signs | **2.40** | yes |
| Selection buttons | 2.10 | yes |
| Payphone lamp | 1.90 | yes |
| Vending front panel | **1.60** | just — soft halo |
| Lightbox surround strip | 1.40 | just |
| Paper lanterns | 1.30 | edge |
| Station `終電` plate | 0.95 | edge, deliberately |
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

### 12.3 Walking

| Value | Setting |
|---|---|
| Speed | **2.6 m/s** — one speed, no run. It is 3am and you are tired. |
| Acceleration | 12.0 m/s² |
| Damping | 10.0 /s |
| Input | `WASD` + arrows (desktop), on-screen stick (touch, bottom-left, 128 px, dead zone 0.12) — **both feed one intent vector** |
| Movement basis | camera yaw only, flattened to the ground plane |
| Head bob | amplitude **0.022**, frequency **1.9 Hz** at full speed, scaled by speed. Off under reduced motion. |
| Gate | movement runs only while `canControl(state)` — no exceptions |

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

---

## 16. Deliberately not specified

These need a decision before the code that depends on them is written, and the brief will be updated rather than the value invented:

1. **Screenshot pre-processing** — whether the four JPGs get a build-step darken/desaturate pass, or the `#A6B2C6` tint in §8 does the whole job. Decide when the shopfront is first lit.
2. **The bend geometry at `z = +23`** — §3.1 gives the angle and the fog, not the modelled form of the return wall.
3. **Font subsetting for the Japanese canvas faces** — currently system faces only; if a webfont ships, it must be subset to the fourteen strings in §11.4 and re-budgeted against §15.
4. **Whether the door opens a real tab or a confirm step on mobile** — popup blockers treat a canvas click differently across browsers.

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
