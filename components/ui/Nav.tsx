'use client'

import { goTo, nextStop } from '@/lib/guidedPath'
import { releaseLock } from '@/lib/lockedView'
import { useOverlay } from '@/lib/overlays'
import { useMode } from '@/lib/store'
import { TOP_NAV } from '@/lib/world'

/**
 * §12.7 — the top nav. **About · Work · Contact · Next stop**, always, on every device.
 *
 * **This is what passes §17's test**, and the test is worth restating because it is the only
 * one that decides whether any of this works: *a stranger, on a phone, finds your contact
 * details in ten seconds without walking anywhere.* Every other route to contact — the walk,
 * the prompt, the guided path — is a nicety on top of these four buttons.
 *
 * **A sibling of the `<Canvas>`, like `ShowcaseControls` and `TouchStick`.** Being outside it
 * is what keeps a press here away from `Camera.tsx`'s look listener; being `pointer-events-
 * auto` on the buttons and `none` on the bar is what keeps the rest of the strip walkable.
 *
 * `Work` opens §2.1.1's locked view **from wherever the visitor is standing**, which is what
 * `lockTo` already does — it starts every move from the live camera. So the nav needs no
 * position of its own, and there is no fourth place for §2.1's pose to drift into.
 */

const [ABOUT, WORK, CONTACT, NEXT] = TOP_NAV

export default function Nav() {
  const overlay = useOverlay()
  const locked = useMode() === 'locked'

  /**
   * **Tighter under `sm`, because at 375 px the bar ran off the screen** — `Next stop` was
   * cut in half on the one device §17's test is written about, which is the whole nav failing
   * for the sake of 0.2em of letter-spacing. Padding and tracking are the two things that
   * scale; the labels do not shorten, because a nav that says different words on a phone is
   * two navs.
   */
  const item =
    'pointer-events-auto rounded-full px-2 py-1.5 text-[0.65rem] tracking-[0.08em] whitespace-nowrap uppercase transition-colors sm:px-3.5 sm:py-2 sm:text-xs sm:tracking-[0.2em]'
  const idle = `${item} text-white/55 hover:bg-white/10 hover:text-white`
  const active = `${item} bg-white/15 text-white`

  return (
    <nav
      aria-label="Sections"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-2"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
    >
      <div className="pointer-events-none flex max-w-full items-center gap-0.5 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur-md">
        {/* All three *travel*, and About and Contact open on arrival. See `goTo`. */}
        <button
          type="button"
          onClick={() => goTo('about', performance.now())}
          aria-current={overlay === 'about'}
          className={overlay === 'about' ? active : idle}
        >
          {ABOUT}
        </button>
        <button
          type="button"
          onClick={() => goTo('work', performance.now())}
          className={idle}
        >
          {WORK}
        </button>
        <button
          type="button"
          onClick={() => goTo('contact', performance.now())}
          aria-current={overlay === 'contact'}
          className={overlay === 'contact' ? active : idle}
        >
          {CONTACT}
        </button>

        {/* §12.6 — the tour. Grouped with the three destinations rather than parked in a
            corner: it is the fourth way to reach them, and a visitor who has not understood
            that they can walk needs it next to the things it walks to. */}
        <span aria-hidden className="mx-0.5 h-4 w-px bg-white/15 sm:mx-1" />
        <button type="button" onClick={() => nextStop(performance.now())} className={idle}>
          {NEXT}
        </button>
      </div>

      {/**
       * §12.6 — **the way out of the tour, and on a phone it is the only one.**
       *
       * Every desktop release is a keyboard or a pointer the tour does not own: `Escape`,
       * `WASD` through §12.5's movement counter, a click on empty space. A phone has none of
       * them — and §12.3's stick, which was the touch answer, is now *hidden* while locked
       * precisely because it does nothing there. That closed the last door: `Next stop` could
       * put a visitor into a held pose with no way back to walking.
       *
       * So it is a second pill under the bar, shown for exactly as long as the lock is held.
       * **Both tiers**, though only one needs it: a control that appears on a phone and not on
       * a desktop is a control nobody can tell you about, and it costs a desktop visitor one
       * row of pixels they can ignore.
       */}
      {locked && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.75rem)' }}>
          <button
            type="button"
            onClick={releaseLock}
            className="pointer-events-auto rounded-full border border-white/20 bg-black/70 px-3.5 py-1.5 text-[0.65rem] tracking-[0.08em] whitespace-nowrap text-white/75 uppercase backdrop-blur-md transition-colors hover:border-white/40 hover:text-white sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.2em]"
          >
            Return to freeroam
          </button>
        </div>
      )}
    </nav>
  )
}
