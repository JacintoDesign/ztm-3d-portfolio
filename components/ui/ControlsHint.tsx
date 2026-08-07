'use client'

import { useEffect, useRef } from 'react'

import { useControlsCorner } from '@/lib/controlsCorner'
import {
  closeControlsHint,
  openControlsHint,
  hasSeenControlsHint,
  useControlsHintOpen,
} from '@/lib/controlsHint'
import { resolveTier } from '@/lib/device'
import { useMode } from '@/lib/store'
import { CONTROLS_HINT } from '@/lib/world'

/**
 * §14.3 — the controls hint: a small panel over the world, shown once on its own and
 * reachable afterwards from a standing `?`.
 *
 * **A sibling of the `<Canvas>`, like `Nav` and `Overlays`.** Mounted from `World.tsx`
 * rather than `WorldMount.tsx` — unlike §14.2's mute toggle, nothing here is needed before
 * `Enter` is pressed, and mounting it inside the dynamic boundary means it sits under
 * `Gate.tsx`'s `z-[60]` for free instead of needing a z-index argument of its own.
 *
 * **The first-run trigger lives here, not in `Gate.tsx`'s `enter()`.** That handler is
 * §14.1's five ordered statements — audio unlock, the rain bed, the mode, the sweep, the
 * fade — and each one is there because getting its *order* wrong breaks something. Opening
 * the hint has no ordering dependency on any of them; it only needs to happen the first
 * time the world is actually controllable. Watching `useMode()` for its first `'play'`
 * says exactly that, without adding a sixth line to a handler that earns its length from
 * every line mattering.
 */
export default function ControlsHint() {
  const open = useControlsHintOpen()
  const mode = useMode()
  const handledFirstPlay = useRef(false)
  const corner = useControlsCorner()
  /** §15.1 — frozen for the session, the same read `TouchStick` makes to decide it exists
      at all. Picks which of `CONTROLS_HINT`'s two copies this visitor gets. */
  const isTouch = resolveTier() === 'mobile'

  useEffect(() => {
    if (mode !== 'play' || handledFirstPlay.current) return
    handledFirstPlay.current = true
    if (!hasSeenControlsHint()) openControlsHint()
  }, [mode])

  const lines = isTouch ? CONTROLS_HINT.touchLines : CONTROLS_HINT.lines

  return (
    <>
      {/**
       * §14.3 — the `?`. **Left of §14.2's mute toggle, on the same row, rather than
       * stacked under it** — both are fixed to the same edge, and a row of two reads as
       * one group of standing controls without pushing either one further from the corner
       * a thumb actually reaches. The offset is `MuteToggle`'s own width plus a gap, both
       * breakpoints, so the two stay the same distance apart as the toggle grows from
       * `size-8` to `size-9`. `z-40`, `Nav`'s value: it belongs to the world, live in every
       * mode that lets the visitor see it, and hidden behind §14.1's gate exactly as `Nav`
       * is.
       *
       * **`corner` picks `top` or `bottom`; `right` never moves.** `lib/controlsCorner.ts`
       * has the reasoning — a portrait phone reads this button from the same bottom-right
       * corner `TouchStick`'s thumb already lives in, everyone else reads it from the top
       * beside `Nav`.
       */}
      <button
        type="button"
        onClick={openControlsHint}
        aria-label="Show controls"
        /* `right` is an arbitrary class, not `style`, because it is the one property that
           actually changes between breakpoints — `MuteToggle` growing from `size-8` to
           `size-9` moves this button's offset by the same quarter-rem. `corner`'s edge is
           the one property that changes between *devices*, so it stays dynamic, in `style`,
           alongside the other safe-area insets in this file. */
        className="fixed right-[calc(env(safe-area-inset-right,0px)+3rem)] z-40 grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/55 text-sm text-white/70 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:right-[calc(env(safe-area-inset-right,0px)+3.25rem)] sm:size-9 sm:text-base"
        style={{
          [corner]: `calc(env(safe-area-inset-${corner}, 0px) + 0.75rem)`,
        }}
      >
        ?
      </button>

      {/**
       * The panel. Deliberately lighter than `Overlays.tsx`'s dialog — no focus trap, no
       * inert siblings — because four lines of static copy is not a form a visitor can lose
       * work in, and `Gate.tsx` already sets the precedent that not every full-screen panel
       * in this world needs one.
       */}
      <div
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          transition: 'opacity 180ms ease-out',
        }}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          onClick={closeControlsHint}
          className="pointer-events-auto absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]"
        />

        <div
          role="dialog"
          aria-label="Controls"
          className="pointer-events-auto relative w-full max-w-sm rounded-xl border border-white/10 bg-[#080B12]/95 p-6 text-white/80 shadow-2xl shadow-black/60 backdrop-blur-xl"
          style={{
            transform: open ? 'none' : 'translateY(0.5rem)',
            transition: 'transform 180ms ease-out',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs tracking-[0.35em] text-white/45 uppercase">Controls</p>
            <button
              type="button"
              aria-label="Close"
              onClick={closeControlsHint}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/**
           * **A label column and a detail column, divided row to row** — where this used to
           * be four run-on sentences (`WASD or the arrow keys to walk — or…`), readable once
           * and unscannable the second time a visitor reopens the panel hunting for one
           * answer. The label is the word an eye jumps to; the divider is what makes four
           * rows read as four rows rather than one paragraph with hard breaks in it — the
           * same `divide-y` `Overlays.tsx`'s contact list uses for the same reason.
           */}
          <ul className="mt-4 divide-y divide-white/10 border-t border-white/10">
            {lines.map((line) => (
              <li key={line.label} className="grid grid-cols-[4.5rem_1fr] gap-3 py-3">
                <span className="text-xs font-medium tracking-[0.08em] text-white/90 uppercase">
                  {line.label}
                </span>
                <span className="text-sm leading-relaxed text-white/60">{line.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
