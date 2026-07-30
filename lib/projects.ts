/**
 * §2.1 — the shape of a project, and nothing else.
 *
 * **Its own file, importing nothing.** `lib/content.ts` reads the filesystem, so it is a
 * server module; `components/world/Showcase.tsx` is a client one. A shared type has to be
 * reachable from both without dragging `node:fs` across the boundary — `import type` erases,
 * but a file that *only* holds types cannot be got wrong by someone later adding a value to
 * it. `lib/world.ts` proves the same pattern by importing nothing at all.
 */

export type Project = {
  /** The `NN` from the heading, kept as authored. Display only; never an index. */
  number: string
  name: string
  description: string
  /** Split on §2.1's ` · ` separator, already trimmed. */
  tags: readonly string[]
  /** Carried because CONTENT.md has it. §11.2 records that nothing renders it. */
  tech: readonly string[]
  url: string
  github: string
  /** A path under `public/`, as written. Empty when the entry has none. */
  screenshot: string
}
