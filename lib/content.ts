import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { About, AboutPanel, Stat, StoryPanel } from '@/lib/about'
import type { Channel, Contact } from '@/lib/contact'
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
/**
 * `**Field:** value` at the start of a line — the *prose* form, without the list bullet.
 *
 * `CONTENT.md` uses both and they are not interchangeable. The `Projects` section puts every
 * field in a bulleted list; `Intro`, `Latest Course Panel`, `Now Panel` and `Contact` write
 * them as standalone paragraphs. A parser built on `FIELD` alone finds nothing outside
 * `Projects` and returns an empty About with no error anywhere.
 */
const PROSE_FIELD = /^\*\*([^*]+):\*\*\s*(.*)$/
/**
 * `- **Label** — handle — href`, §2.3's channel row.
 *
 * The same `- **X** — y` shape as the stats rows, deliberately, because it is the shape this
 * file already had. **Split on the first two em dashes only**: a handle may contain one and a
 * greedy split would put half of it in the href.
 */
const BULLET_PAIR = /^-\s+\*\*([^*]+)\*\*\s+—\s+(.+)$/

/** Values are sometimes wrapped in backticks in the source (the screenshot paths are). */
const clean = (value: string): string => value.trim().replace(/^`|`$/g, '')

const splitOn = (value: string, separator: string): string[] =>
  value
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

/**
 * One read per call, and **it was a module-level cache for about ten minutes.**
 *
 * The cache looked free: `app/page.tsx` asks for three payloads, the page is `force-static`,
 * so three reads happen at build and never again. What it actually did was pin the file's
 * contents for the lifetime of the *dev server process* — so editing `CONTENT.md` changed
 * nothing until a restart, and the §17 check that a seventh channel appears with no component
 * edited **could not be run at all**. A cache that survives longer than the thing it caches
 * is a correctness bug wearing a performance costume.
 *
 * Three reads of a 4 kB file at build time is not a cost worth a stale-content class of bug.
 */
const markdown = (): Promise<string> =>
  readFile(path.join(process.cwd(), 'CONTENT.md'), 'utf8')

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
  const lines = sectionLines(await markdown(), SECTION)

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

/* ── §2.2 / §2.3 ──────────────────────────────────────────────────────────────
 *
 * Two more payloads out of the same file, through the same `sectionLines` scanner. What is
 * *not* shared is the field syntax: `Projects` bullets its fields and every other section
 * writes them as prose paragraphs, which is trap 1 above wearing different clothes — a
 * parser reusing `FIELD` outside `Projects` matches nothing and returns an empty About with
 * no error to point at. `PROSE_FIELD` is that difference, named once.
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * `**Field:** value` pairs in a block, with `CONTENT.md`'s hard wrapping rejoined.
 *
 * Continuations here are **not indented** — unlike the project descriptions, which are. So
 * the test is different: a non-empty line that starts no new field belongs to the last one.
 */
function proseFields(lines: readonly string[]): Map<string, string> {
  const fields = new Map<string, string>()
  let last: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    const field = PROSE_FIELD.exec(trimmed)
    if (field !== null) {
      last = field[1] ?? null
      if (last !== null) fields.set(last, field[2] ?? '')
      continue
    }
    if (trimmed.length === 0) {
      last = null
      continue
    }
    /* A heading or a bullet ends the run; anything else is a wrapped continuation. */
    if (/^[#\-*|]/.test(trimmed)) {
      last = null
      continue
    }
    if (last !== null) fields.set(last, `${fields.get(last) ?? ''} ${trimmed}`.trim())
  }

  return fields
}

/** One of the two trailing panels. `null` when the section is absent rather than empty. */
function panel(source: string, heading: string): AboutPanel | null {
  const lines = sectionLines(source, heading)
  if (lines.length === 0) return null

  const fields = proseFields(lines)
  const get = (key: string): string => clean(fields.get(key) ?? '')

  return {
    label: get('Label'),
    title: get('Title'),
    blurb: get('Blurb'),
    url: get('URL'),
    linkLabel: get('Link label'),
  }
}

/**
 * Reads `CONTENT.md` and returns §2.2's About material.
 *
 * **Nothing here is a fixed count.** Three stats and five story panels is what the file says
 * today; the overlay lays out whatever it is handed. §2.1's *N surfaces from N entries* rule
 * is the same rule and §17 tests it on the projects, so it would be strange to hard-code the
 * number of story beats one section over.
 *
 * Missing fields come back as empty strings, per `loadProjects`' rule: this surface degrades
 * quietly, and a story panel vanishing because someone mistyped a heading is the loudest
 * possible failure.
 */
export async function loadAbout(): Promise<About> {
  const source = await markdown()

  const intro = proseFields(sectionLines(source, 'Intro'))
  const get = (key: string): string => clean(intro.get(key) ?? '')

  /* The stats are a bulleted `- **8+** — Years as senior developer` run inside `## Intro`,
     under a `### Stats` heading that `sectionLines` deliberately does not stop at. */
  const stats: Stat[] = []
  for (const line of sectionLines(source, 'Intro')) {
    const row = BULLET_PAIR.exec(line.trim())
    if (row === null) continue
    stats.push({ value: clean(row[1] ?? ''), label: clean(row[2] ?? '') })
  }

  const panels: StoryPanel[] = []
  {
    const lines = sectionLines(source, 'Story Panels')
    let current: StoryPanel | null = null
    const flush = (): void => {
      if (current !== null && current.body.length > 0) panels.push(current)
      current = null
    }
    for (const line of lines) {
      const trimmed = line.trim()
      const heading = HEADING.exec(trimmed)
      if (heading !== null) {
        flush()
        current = { number: heading[1] ?? '', title: heading[2]?.trim() ?? '', body: '' }
        continue
      }
      if (current === null || trimmed.length === 0 || trimmed === '---') continue
      current.body = `${current.body} ${trimmed}`.trim()
    }
    flush()
  }

  return {
    eyebrow: get('Eyebrow'),
    heading: get('Heading'),
    role: splitOn(get('Role'), '·'),
    tagline: get('Tagline'),
    location: get('Location'),
    stats,
    panels,
    course: panel(source, 'Latest Course Panel'),
    now: panel(source, 'Now Panel (Currently building)'),
  }
}

/**
 * Reads `CONTENT.md` and returns §2.3's contact material.
 *
 * **The channel list is the length it is.** §2.3's bank builds one box per entry and §12.7's
 * overlay one row, so a seventh channel is a seventh box and a seventh row with no component
 * edited — which is the thing §17 checks by adding one and taking it away again.
 *
 * A row missing its href is **dropped**, and that is the one place this file departs from
 * *degrade quietly*: an empty string is a sensible screenshot and a sensible description, but
 * a mailbox that opens nothing is a dead control on the one surface §17 times a stranger
 * against. Better absent than broken.
 */
export async function loadContact(): Promise<Contact> {
  const source = await markdown()
  const lines = sectionLines(source, 'Contact')

  const fields = proseFields(lines)
  const get = (key: string): string => clean(fields.get(key) ?? '')

  const channels: Channel[] = []
  for (const line of lines) {
    const row = BULLET_PAIR.exec(line.trim())
    if (row === null) continue
    /* `handle — href`. Split on the **last** em dash: a handle may contain one, an href
       may not, so the tail is unambiguous where the head is not. */
    const rest = row[2] ?? ''
    const at = rest.lastIndexOf('—')
    if (at === -1) continue
    const href = clean(rest.slice(at + 1))
    if (href.length === 0) continue
    channels.push({
      label: clean(row[1] ?? ''),
      handle: clean(rest.slice(0, at)),
      href,
    })
  }

  return {
    heading: get('Heading'),
    supporting: get('Supporting'),
    location: get('Location'),
    channels,
  }
}
