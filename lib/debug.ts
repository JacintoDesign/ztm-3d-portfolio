'use client'

/**
 * A development-only handle on the live world, for verifying against `WORLD_BRIEF.md`.
 *
 * The brief is written in numbers — eye height 1.68, top speed 2.6, the clamp at ±3.60 —
 * and several of them cannot be checked by looking at the render. This exposes the
 * objects that hold them at `window.__world`, so the values can be read while walking
 * rather than inferred from a screenshot.
 *
 * `process.env.NODE_ENV` is inlined at build time, so the whole thing is dead code in a
 * production bundle and never reaches a visitor.
 */

type DebugWorld = Record<string, unknown>

export function expose(key: string, value: unknown): void {
  if (process.env.NODE_ENV === 'production') return
  if (typeof window === 'undefined') return

  const scope = window as unknown as { __world?: DebugWorld }
  scope.__world ??= {}
  scope.__world[key] = value
}
