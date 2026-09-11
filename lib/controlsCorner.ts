'use client'

import { useIsNarrow, useIsPortrait } from '@/lib/device'

/**
 * §14.2 / §14.3 — which corner the standing controls sit in: §14.2's mute toggle and
 * §14.3's `?`, the two buttons that live for as long as the world does rather than
 * appearing for one station or one mode.
 *
 * **Top-right everywhere except a portrait phone, where it is bottom-right.** The cut is
 * the live viewport — §15.1's ≤820 px, read reactively — and `useIsPortrait`, not the
 * frozen tier. `resolveTier()` is cached at first paint for the Canvas (`gl.antialias`);
 * these buttons are not the Canvas. A desktop window dragged to iPhone width, or DevTools
 * switched to a phone after load, has to move the pair without a reload.
 *
 * On a phone held upright that is also the hand driving `TouchStick` out of the
 * bottom-left corner. Top-right on that device is a reach across the whole screen and past
 * §12.7's nav, which already lives there; bottom-right is the same thumb's own corner.
 * `ShowcaseControls` lifts above that row on the same cut, so the pair is not sharing
 * a baseline with the pager.
 *
 * **Landscape is excluded even on a narrow viewport.** A phone rotated flat has the top
 * corner back within reach and the standing controls follow it there.
 */
export type ControlsCorner = 'top' | 'bottom'

export function useControlsCorner(): ControlsCorner {
  const portrait = useIsPortrait()
  const narrow = useIsNarrow()
  return narrow && portrait ? 'bottom' : 'top'
}
