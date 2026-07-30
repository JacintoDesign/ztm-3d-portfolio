'use client'

import { useEffect } from 'react'
import { isLocked, releaseLock } from '@/lib/lockedView'
import { openProject } from '@/lib/openProject'
import type { Project } from '@/lib/projects'
import { page, useShowcaseIndex } from '@/lib/showcase'
import { useMode } from '@/lib/store'

/**
 * §2.1.2 — paging, the position indicator and *open*, drawn over the world.
 *
 * **They came off the board and the reason is legibility rather than taste.** Painted on the
 * face they were 0.20 m plates carrying 0.038 m type read at §2.1.1's 5.6 m — about six
 * device pixels a glyph on a phone. As DOM they are screen-space, so they are the same size
 * at every distance and on every device, and they get real hit targets, real focus rings and
 * real hover states, none of which a canvas texture on a quad has.
 *
 * **Only while the view is locked.** §12.7's top nav is the thing that is always present;
 * this appears with the lock and goes with it, so `Escape` closing the lock also closes
 * these — one thing on screen, one way out.
 *
 * A sibling of the `<Canvas>`, like `TouchStick`, so a pointerdown here never reaches the
 * canvas's look listener.
 */
export default function ShowcaseControls({ projects }: { projects: readonly Project[] }) {
  const mode = useMode()
  const index = useShowcaseIndex()
  const locked = mode === 'locked'
  /* N from the prop, not from the store — the store's copy exists for the frame loop. */
  const count = projects.length

  /**
   * §2.1's keyboard paging. Bound here rather than in `lib/input.ts` because these keys mean
   * nothing outside the locked view — and §12.3's handler is gated on `canControl()`, which
   * is false while locked, so they could not have lived there anyway.
   *
   * `Escape` is deliberately **not** handled: `lib/escape.ts` owns it, and §12.5 is explicit
   * that nothing else may claim it.
   */
  useEffect(() => {
    if (!locked) return

    function onKeyDown(event: KeyboardEvent): void {
      const back = event.key === 'ArrowLeft' || event.key === '['
      const forward = event.key === 'ArrowRight' || event.key === ']'
      if (!back && !forward) return
      event.preventDefault()
      page(back ? -1 : +1, performance.now())
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [locked])

  const project = projects[index]

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.75rem)',
        opacity: locked ? 1 : 0,
        /* §12.5's 180 ms, as a CSS transition rather than a JS interpolation — nothing here
           runs per frame, and it reverses correctly if the lock is released mid-fade. */
        transition: 'opacity 180ms ease-out',
        visibility: locked ? 'visible' : 'hidden',
      }}
    >
      {/**
       * §2.1.2 — the description, on the screen rather than on the wall.
       *
       * It was a 3.20 × 1.55 m painted panel carrying 0.12 m type read at 8.6 m: ten device
       * pixels a glyph on a phone, and that was *after* the type had been raised twice to
       * chase a reading distance the screen's width kept moving. Here it is screen-space, so
       * it is the same size at every distance and on every device, and the wall gets to be
       * the work rather than a description of it.
       */}
      <div className="pointer-events-none max-w-[34rem] px-6 text-center">
        <p className="text-xs tracking-[0.35em] text-white/45 uppercase">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          <span className="ml-3 tracking-[0.2em] text-white/70">{project?.name ?? ''}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {project?.description ?? ''}
        </p>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 p-1.5 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Previous project"
          onClick={() => page(-1, performance.now())}
          className="grid size-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          ‹
        </button>

        {/* N stops, read from the project list. Never hardcoded — §2.1. */}
        {projects.map((entry, i) => (
          <button
            key={entry.url || entry.name}
            type="button"
            aria-label={`Show ${entry.name}`}
            aria-current={i === index}
            onClick={() => page(i - index, performance.now())}
            className={
              i === index
                ? 'grid size-9 place-items-center rounded-full bg-[#FF2E6A] text-sm text-white'
                : 'grid size-9 place-items-center rounded-full text-sm text-white/55 transition-colors hover:bg-white/10 hover:text-white'
            }
          >
            {i + 1}
          </button>
        ))}

        <button
          type="button"
          aria-label="Next project"
          onClick={() => page(+1, performance.now())}
          className="grid size-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          ›
        </button>

        {/* §2.1.2 — the GitHub link came off the wall with the rest. It was a 0.30 × 0.18
            enamel plate carrying 0.038 m type at 7.3 m: about three device pixels a glyph. */}
        <button
          type="button"
          onClick={() => openProject(project?.github ?? '')}
          className="ml-1 rounded-full px-3 py-2 text-xs tracking-wide text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          GITHUB
        </button>

        <button
          type="button"
          onClick={() => openProject(project?.url ?? '')}
          className="rounded-full bg-[#FF2E6A] px-5 py-2 text-sm tracking-wide text-white transition-opacity hover:opacity-90"
        >
          OPEN
        </button>

        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            if (isLocked()) releaseLock()
          }}
          className="grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
