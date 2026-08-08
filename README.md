# 終電 / Last Train

A walkable 3D world, moved through in first person at eye level, that doubles as a portfolio. 3am in Tokyo — you've just missed the last train. A single back alley, forty-six metres end to end, wet asphalt reflecting neon, closed at both ends so there is no horizon to build.

Three things in the alley are lit warmer than the rest, and those three are the portfolio: a lit board at the bend showing one project at a time, a food cart that's the bio station, and a bank of mailboxes that's the contact station. Everything else is atmosphere — nothing in the surroundings carries content.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) · [React 19](https://react.dev/) · TypeScript (strict)
- [three.js](https://threejs.org/) + [@react-three/fiber](https://r3f.docs.pmnd.rs/) + [@react-three/drei](https://github.com/pmndrs/drei) + [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing)
- Tailwind CSS for the 2D overlay UI (nav, overlays, gate, hint) — never inside the Canvas
- Deployed on [Vercel](https://vercel.com/)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## Source of truth

This project generates its world and content from two documents rather than hardcoding either into components:

| Document | Governs |
|---|---|
| [`WORLD_BRIEF.md`](WORLD_BRIEF.md) | Every atmospheric, material, light and scale value; layout; navigation |
| [`CONTENT.md`](CONTENT.md) | The projects — name, description, tech, live URL, GitHub, screenshot |

`lib/world.ts` is a typed mirror of `WORLD_BRIEF.md`; no atmospheric value is invented or hardcoded inline. Adding, removing or replacing a project in `CONTENT.md` changes the showcase surface with no component edits.

## Structure

```
app/                      # Next.js App Router shell
components/
  world/                  # The single <Canvas> — ground, atmosphere, effects, showcase, stations
  player/                 # Movement, camera, interaction
  ui/                     # 2D overlay UI — nav, overlays, gate, controls hint
lib/
  world.ts                # Typed mirror of WORLD_BRIEF.md
  content.ts, projects.ts # CONTENT.md readers
  store.ts                # Mode machine (loading / play / locked / overlay)
  textures/                # Canvas-painted textures
shaders/                  # GLSL, as template literals
```

See [`CLAUDE.md`](CLAUDE.md) for the full build discipline and rules this project follows.

## Assets

### 3D models

| Model | Author | License | Source |
|---|---|---|---|
| Mazda RX-7 | IvOfficial | [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Poly Pizza](https://poly.pizza/m/SnIoWlh7S2) |
| Toyota AE86 | IvOfficial | [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Poly Pizza](https://poly.pizza/m/ZEFWmOPSgh) |
| Range Rover | IvOfficial | [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Poly Pizza](https://poly.pizza/m/8zk4o6nALW) |
| Vespa (scooter) | Jasmine Roberts | [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Poly Pizza](https://poly.pizza/m/blGLclvvdEM) |

The cars appear on the cross street past the bend; the Vespa appears parked along the alley wall. `lib/carModels.ts` prepares each model — node transforms baked into the vertices, merged by material, scaled and oriented — before it's placed.

### Project screenshots

The showcase surface's images (`/vibemail.jpg`, `/waypoint.jpg`, `/music.jpg`, `/scoundrel.jpg`) are screenshots of the author's own projects, listed with their sources in [`CONTENT.md`](CONTENT.md).

## License

Project code is not currently under an open license. The 3D assets above retain their original licenses as listed.
