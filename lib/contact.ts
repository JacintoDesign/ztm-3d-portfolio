/**
 * §2.3 — the shape of the contact material, and nothing else.
 *
 * `lib/projects.ts`'s pattern; see `lib/about.ts` for why these types live apart from the
 * parser that produces them.
 */

export type Channel = {
  /** `Email`, `GitHub` — what goes on the mailbox label. Kept as authored, cased as written. */
  label: string
  /** `contact@jacinto.design`, `in/jacintowong` — what the overlay shows under the label. */
  handle: string
  /** Absolute, including `mailto:`. `lib/openProject.ts` opens it. */
  href: string
}

export type Contact = {
  heading: string
  supporting: string
  location: string
  /**
   * Six today, in document order — **and nothing may assume six.** §2.3's bank fills a
   * 3-wide grid in this order and grows a row rather than requiring a component edit, which
   * is §2.1's *N surfaces from N entries* rule carried across to this station.
   */
  channels: readonly Channel[]
}
