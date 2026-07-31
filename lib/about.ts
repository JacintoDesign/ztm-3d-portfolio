/**
 * §2.2 — the shape of the About material, and nothing else.
 *
 * `lib/projects.ts`'s pattern, for its reasons: `lib/content.ts` reads the filesystem and is
 * a server module, `components/ui/Overlays.tsx` is a client one, and a shared type has to be
 * reachable from both without dragging `node:fs` across the boundary. A file that *only*
 * holds types cannot be got wrong by someone later adding a value to it.
 */

export type Stat = {
  /** `8+`, `100+` — kept as authored. Never parsed as a number. */
  value: string
  label: string
}

export type StoryPanel = {
  /** The `NN` from the heading. Display only; never an index. */
  number: string
  title: string
  body: string
}

/** The two panels at the end of the overlay. Same shape; the label distinguishes them. */
export type AboutPanel = {
  label: string
  title: string
  blurb: string
  /** Empty when the panel has no link — the *now* panel does not. */
  url: string
  linkLabel: string
}

export type About = {
  eyebrow: string
  heading: string
  /** `Senior Developer at CBC · Instructor at Zero to Mastery`. Split on ` · ` for display. */
  role: readonly string[]
  tagline: string
  location: string
  stats: readonly Stat[]
  /** Five today. **The overlay must not assume that** — §2.1's rule, applied here. */
  panels: readonly StoryPanel[]
  course: AboutPanel | null
  now: AboutPanel | null
}
