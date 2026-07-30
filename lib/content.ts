import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Project } from '@/lib/projects'

/**
 * §2.1 — reads the projects out of `CONTENT.md`.
 *
 * **Server only.** No `'use client'`, and nothing in `components/` may import it: it touches
 * the filesystem. `app/page.tsx` calls it and passes the result down as a plain prop, so no
 * markdown and no parser reaches the browser — the four projects arrive in the RSC payload
 * at about 1.4 kB with no fetch. That is also why §2.1's *fails quietly* rule applies only
 * to the screenshot and never to the text: by the time the world renders, the text is there
 * or the build failed.
 *
 * Importing the file as a string instead was tried and is recorded as broken: Turbopack's
 * documented `type: 'raw'` module rule resolves to `undefined` on 16.2.12 (§16.10, and the
 * comment in `next.config.ts`). Not re-litigated.
 *
 * **Three things about `CONTENT.md`'s shape that a naive parser gets wrong**, each found by
 * reading the file rather than assuming it:
 *
 *  1. `### NN — Name` is **not unique to projects**. There are nine such headings and five
 *     of them are `## Story Panels`. A parser that scanned for the heading shape would
 *     return nine projects, five with no URL, and §2.1's position indicator would show nine
 *     dots. So the scan is scoped to the `## Projects` section and stops at the next `##`.
 *  2. Descriptions are **hard-wrapped across source lines** with two-space indentation, so a
 *     line-based reader truncates them at the first newline.
 *  3. The heading splits on the **first** ` — ` only, because descriptions contain em dashes.
 */

const SECTION = 'Projects'

/** `- **Field:** value`, with the value running to the end of the line. */
const FIELD = /^-\s+\*\*([^*]+):\*\*\s*(.*)$/
/** `### 01 — Name`. The name is everything after the first em dash. */
const HEADING = /^###\s+(\S+)\s+—\s+(.+)$/

/** Values are sometimes wrapped in backticks in the source (the screenshot paths are). */
const clean = (value: string): string => value.trim().replace(/^`|`$/g, '')

const splitOn = (value: string, separator: string): string[] =>
  value
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

function sectionLines(markdown: string, heading: string): string[] {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) return []

  const rest = lines.slice(start + 1)
  /* Stops at the next `##` — a `###` is a project inside this section, and `####` would be
     deeper still. Anchoring on exactly two hashes is what scopes the scan. */
  const end = rest.findIndex((line) => /^##(?!#)/.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

/**
 * Reads `CONTENT.md` and returns §2.1's projects in document order.
 *
 * An entry missing a field gets an empty string rather than being dropped — §2.1's failure
 * rule is that the surface degrades quietly, and a project silently vanishing off the board
 * because someone mistyped `**URL:**` is the loudest possible failure.
 */
export async function loadProjects(): Promise<Project[]> {
  const markdown = await readFile(path.join(process.cwd(), 'CONTENT.md'), 'utf8')
  const lines = sectionLines(markdown, SECTION)

  const projects: Project[] = []
  let current: { number: string; name: string; fields: Map<string, string> } | null = null
  /* The field a continuation line belongs to. Trap 2: a description runs across lines and
     the continuations carry no marker of their own beyond being indented. */
  let lastField: string | null = null

  const flush = (): void => {
    if (current === null) return
    const get = (key: string): string => clean(current?.fields.get(key) ?? '')
    projects.push({
      number: current.number,
      name: current.name,
      description: get('Description'),
      tags: splitOn(get('Tags'), '·'),
      tech: splitOn(get('Tech'), ','),
      url: get('URL'),
      github: get('GitHub'),
      screenshot: get('Screenshot'),
    })
    current = null
    lastField = null
  }

  for (const line of lines) {
    const heading = HEADING.exec(line.trim())
    if (heading !== null) {
      flush()
      current = { number: heading[1] ?? '', name: heading[2]?.trim() ?? '', fields: new Map() }
      continue
    }

    if (current === null) continue

    const field = FIELD.exec(line.trim())
    if (field !== null) {
      lastField = field[1] ?? null
      if (lastField !== null) current.fields.set(lastField, field[2] ?? '')
      continue
    }

    /* A continuation: indented, non-empty, and not the start of anything. Joined with a
       space, because the wrap is a source-formatting choice and not part of the prose. */
    if (lastField !== null && /^\s+\S/.test(line)) {
      const existing = current.fields.get(lastField) ?? ''
      current.fields.set(lastField, `${existing} ${line.trim()}`.trim())
      continue
    }

    if (line.trim().length === 0) lastField = null
  }

  flush()
  return projects
}
