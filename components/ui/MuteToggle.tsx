'use client'

import { toggleMuted, useMuted } from '@/lib/audio'
import { useControlsCorner } from '@/lib/controlsCorner'

/**
 * §14.2 — the mute toggle. Top-right on most devices, above everything including §14.1's
 * gate; bottom-right on a portrait phone — see `lib/controlsCorner.ts` for why the corner
 * itself moves.
 *
 * **Above the gate specifically, not merely present.** `Gate.tsx` is `z-[60]`, the highest
 * stacking value anything else in the world uses; this is `z-[65]` so it renders *through*
 * that panel rather than under it. Nothing else in the world needs to be seen before `Enter`
 * is pressed — this does, because muting is a decision that belongs before the button that
 * starts making sound, not after it.
 *
 * **A sibling of `Gate` and `World` in `WorldMount.tsx`, mounted unconditionally.** It is not
 * part of `Nav.tsx`: §12.7's nav is gated to appear only once the gate has gone, and this has
 * to outlive that boundary at both ends — visible before the gate closes, and still there
 * for as long as the visitor stays, through every mode the world has. `useControlsCorner`
 * works the same before the gate as after — it reads §15.1's tier and orientation, neither
 * of which waits on the Canvas.
 *
 * **Reads `useMuted()`, which is safe before `unlock()` has ever run.** The preference lives
 * in `localStorage` and is read the moment this mounts, independent of whether an
 * `AudioContext` exists yet — a returning visitor sees the correct icon on the very first
 * paint, not after they press a button that has not appeared yet.
 */
export default function MuteToggle() {
  const muted = useMuted()
  const corner = useControlsCorner()

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute' : 'Mute'}
      className="fixed z-[65] grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/55 text-white/70 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:size-9"
      style={{
        [corner]: `calc(env(safe-area-inset-${corner}, 0px) + 0.75rem)`,
        right: 'calc(env(safe-area-inset-right, 0px) + 0.5rem)',
      }}
    >
      {muted ? (
        /* Speaker with a slash — the universally-read "off" mark, rather than a crossed-out
           speaker-with-waves, which at 32px collapses into an unreadable knot of strokes. */
        <svg viewBox="0 0 24 24" fill="none" className="size-4 sm:size-[1.05rem]" aria-hidden>
          <path
            d="M4 9v6h4l5 5V4L8 9H4Z"
            fill="currentColor"
          />
          <path
            d="M16.5 8.5l5 7M21.5 8.5l-5 7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        /* Speaker with two nested arcs — sound waves, the same silhouette convention as the
           muted glyph's speaker body so toggling reads as one icon changing, not two icons
           swapping. */
        <svg viewBox="0 0 24 24" fill="none" className="size-4 sm:size-[1.05rem]" aria-hidden>
          <path d="M4 9v6h4l5 5V4L8 9H4Z" fill="currentColor" />
          <path
            d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  )
}
