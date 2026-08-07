'use client'

import { useEffect, useRef } from 'react'
import type { About } from '@/lib/about'
import type { Contact } from '@/lib/contact'
import { closeOverlay, useOverlay } from '@/lib/overlays'
import { openProject } from '@/lib/openProject'
import { stopAutoAdvance } from '@/lib/showcase'

/**
 * §2.2 / §2.3 — the two overlays, drawn over the world.
 *
 * **A side panel on desktop and a full sheet under `md`, from one class set.** Two
 * implementations of one overlay is two places to forget the focus trap.
 *
 * **Everything about *not moving while this is open* is already handled.** `lib/overlays.ts`
 * sets `'overlay'`, and §12.3's keys, `TouchStick`'s handlers and `Camera.tsx`'s pointer
 * handlers are all gated on `canControl()`. Nothing in this file mentions movement, which is
 * the point of the mode machine existing.
 *
 * **A sibling of the `<Canvas>`, like `ShowcaseControls`**, so a pointerdown in here never
 * reaches the canvas's look listener.
 *
 * `Escape` is deliberately **not** handled here: `lib/escape.ts` owns it and `lib/overlays.ts`
 * registers on that stack when it opens. §12.5 is explicit that nothing else may claim it.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function Overlays({ about, contact }: { about: About; contact: Contact }) {
  const which = useOverlay()
  const open = which !== null
  const panel = useRef<HTMLDivElement>(null)
  /* Where focus was before the overlay took it, so it can be given back. */
  const restoreTo = useRef<HTMLElement | null>(null)

  /**
   * Focus in, focus back, and the page behind held still.
   *
   * **`inert` on the siblings rather than a keydown trap**, because a hand-rolled trap has to
   * know about shadow roots, iframes and the browser's own address bar, and gets one of them
   * wrong. `inert` is the platform doing it: everything outside the panel stops being
   * focusable, clickable and readable by assistive tech at once.
   */
  useEffect(() => {
    if (!open) return

    const node = panel.current
    if (node === null) return

    restoreTo.current = document.activeElement as HTMLElement | null

    const siblings: HTMLElement[] = []
    for (const child of Array.from(document.body.children)) {
      if (child === node.parentElement || child.contains(node)) continue
      if (!(child instanceof HTMLElement)) continue
      if (child.inert) continue
      child.inert = true
      siblings.push(child)
    }

    /**
     * Within our own parent, everything that is not the panel — the canvas, the stick, the
     * prompt — is inert too. They are siblings of this component, not of `body`.
     *
     * **§12.7's nav is the exception, and it is deliberate.** The panel is a card in the
     * middle of the screen with the nav left uncovered above it, so a nav that is visible and
     * dead would be the worst of both: it looks like the way out and does nothing. Left live,
     * a visitor can go straight from About to Contact — which is the thing a nav is for.
     * That makes this a non-modal dialog, so it does not claim `aria-modal`.
     */
    const localSiblings: HTMLElement[] = []
    for (const child of Array.from(node.parentElement?.children ?? [])) {
      if (child === node || !(child instanceof HTMLElement) || child.inert) continue
      if (child.tagName === 'NAV' || child.querySelector('nav') !== null) continue
      child.inert = true
      localSiblings.push(child)
    }

    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const first = node.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? node).focus()

    return () => {
      for (const child of siblings) child.inert = false
      for (const child of localSiblings) child.inert = false
      document.body.style.overflow = overflow
      restoreTo.current?.focus?.()
    }
  }, [open])

  const heading = which === 'about' ? about.heading : contact.heading

  return (
    <div
      /**
       * **It starts below §12.7's nav rather than covering it.**
       *
       * This was a full-height sheet at `z-50`: the nav went under the scrim on desktop and
       * under the sheet itself on a phone. A nav that is *always present on every device* —
       * §12.7's first sentence — cannot be the thing an overlay hides, and it is the fastest
       * way from one panel to another. `paddingTop` clears the bar, the scrim starts under it,
       * and the nav stays lit and live above.
       */
      className="pointer-events-none fixed inset-0 z-50 flex flex-col sm:px-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        /* §12.5's 180 ms, as a CSS transition — nothing here runs per frame, and it reverses
           correctly if the overlay is dismissed mid-fade. */
        transition: 'opacity 180ms ease-out',
      }}
      aria-hidden={!open}
    >
      {/* The scrim, under the panel and under the nav. Clicking it closes. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={closeOverlay}
        className="pointer-events-auto absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]"
      />

      {/**
       * **A card in the middle, not a sheet down one side.**
       *
       * The side panel put the content against one edge and left the alley in the other two
       * thirds, which reads as a drawer bolted to a game rather than as the thing you opened.
       * Centred, it is a document with the world behind it — and it is the same shape on every
       * device, so there is one layout to get right instead of two.
       *
       * `role="dialog"` **without** `aria-modal`: §12.7's nav is deliberately left live above
       * it, and claiming modality while something outside is reachable is a lie to a screen
       * reader.
       */}
      <div
        ref={panel}
        role="dialog"
        aria-label={heading}
        tabIndex={-1}
        /* `mx-auto` at every width — it had `sm:mx-4` after it, which is a *margin* and so
           overrode the auto centring, pinning the card to the left edge from 640 px up. */
        className="pointer-events-auto relative mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden border border-white/10 bg-[#080B12]/95 text-white/80 shadow-2xl shadow-black/60 outline-none backdrop-blur-xl sm:my-auto sm:max-h-[min(44rem,100%)] sm:flex-none sm:rounded-xl"
        style={{
          transform: open ? 'none' : 'translateY(1rem)',
          transition: 'transform 180ms ease-out',
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <p className="text-xs tracking-[0.35em] text-white/45 uppercase">
            {which === 'about' ? about.eyebrow : 'Contact'}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={closeOverlay}
            className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* The card is a fixed box; the *content* scrolls inside it, so the header and the
            close control stay put however long §2.2's About runs. */}
        <div className="scroll-dark min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-8">
          {which === 'about' ? <AboutBody about={about} /> : <ContactBody contact={contact} />}
        </div>
      </div>
    </div>
  )
}

/**
 * §2.2's About.
 *
 * **Every count here is `CONTENT.md`'s.** Three stats and five story panels is what the file
 * says today; nothing below assumes either number, which is §2.1's *N surfaces from N
 * entries* rule carried across. The copy is rendered verbatim — condensing happens in
 * `CONTENT.md`, or there are two versions of the same words and one of them is in a React
 * file.
 */
function AboutBody({ about }: { about: About }) {
  return (
    <>
      <h2 className="text-2xl leading-snug font-medium text-balance text-white">
        {about.heading}
      </h2>

      {about.tagline.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-white/55">{about.tagline}</p>
      )}

      {about.role.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {about.role.map((line) => (
            <li
              key={line}
              className="rounded-full border border-white/12 px-3 py-1 text-[0.65rem] tracking-[0.15em] text-white/60 uppercase"
            >
              {line}
            </li>
          ))}
        </ul>
      )}

      {about.stats.length > 0 && (
        <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-5">
          {about.stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xl text-[#FF2E6A] tabular-nums">{stat.value}</dt>
              <dd className="mt-1 text-xs leading-snug text-white/50">{stat.label}</dd>
            </div>
          ))}
        </dl>
      )}

      <ol className="mt-6 space-y-5">
        {about.panels.map((story) => (
          <li key={story.number} className="grid grid-cols-[2.5rem_1fr] gap-3">
            <span className="pt-0.5 text-xs text-white/30 tabular-nums">{story.number}</span>
            <div>
              <h3 className="text-sm tracking-wide text-white/90">{story.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{story.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {[about.course, about.now].map((panel, i) =>
        panel === null ? null : (
          <section
            key={panel.label || i}
            className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-[0.65rem] tracking-[0.3em] text-white/40 uppercase">
              {panel.label}
            </p>
            <h3 className="mt-2 text-sm leading-snug text-white/90">{panel.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{panel.blurb}</p>
            {panel.url.length > 0 && (
              <button
                type="button"
                onClick={() => openProject(panel.url)}
                className="mt-4 rounded-full bg-[#FF2E6A] px-4 py-2 text-xs tracking-wide text-white transition-opacity hover:opacity-90"
              >
                {panel.linkLabel || 'Open'}
              </button>
            )}
          </section>
        ),
      )}

      {about.location.length > 0 && (
        <p className="mt-6 text-xs tracking-[0.2em] text-white/35 uppercase">{about.location}</p>
      )}
    </>
  )
}

/**
 * §2.3's Contact.
 *
 * **One row per channel, in `CONTENT.md`'s order** — the same list §2.3's bank builds its
 * boxes from, so the wall and this panel can never disagree about what the channels are.
 *
 * These are the real hit targets. §2.1.2's finding, applied: a 0.10 m plate on a wall read at
 * 1.60 m is not something a thumb can aim at, so the world's labels open *this* and this has
 * rows you can actually press.
 */
function ContactBody({ contact }: { contact: Contact }) {
  return (
    <>
      <h2 className="text-2xl leading-snug font-medium text-balance text-white">
        {contact.heading}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{contact.supporting}</p>

      <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
        {contact.channels.map((channel) => {
          /* A real `<a href>`, not a `window.open` button: `mailto:`/`tel:` schemes routed
             through `window.open` commonly leave a dead blank tab, sometimes silently no-op on
             mobile, and lose every native affordance a stranger would reach for first — long-
             press "Copy Email Address", middle-click, a screen reader announcing the link. Only
             http(s) channels get `target="_blank"`; a `mailto:`/`tel:` handoff has no "tab" to
             open in the first place. */
          const external = channel.href.startsWith('http')
          return (
            <li key={channel.href}>
              <a
                href={channel.href}
                onClick={() => stopAutoAdvance()}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span>
                  <span className="block text-[0.65rem] tracking-[0.3em] text-white/40 uppercase">
                    {channel.label}
                  </span>
                  <span className="mt-1 block text-sm text-white/85">{channel.handle}</span>
                </span>
                <span aria-hidden className="text-white/30">
                  ↗
                </span>
              </a>
            </li>
          )
        })}
      </ul>

      {contact.location.length > 0 && (
        <p className="mt-5 text-xs tracking-[0.2em] text-white/35 uppercase">
          {contact.location}
        </p>
      )}
    </>
  )
}
