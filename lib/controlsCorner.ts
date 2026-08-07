'use client'

import { resolveTier, useIsPortrait } from '@/lib/device'

/**
 * §14.2 / §14.3 — which corner the standing controls sit in: §14.2's mute toggle and
 * §14.3's `?`, the two buttons that live for as long as the world does rather than
 * appearing for one station or one mode.
 *
 * **Top-right everywhere except a portrait phone, where it is bottom-right.** §15.1's tier
 * is the same signal `TouchStick` already uses to decide it exists at all — a coarse
 * pointer or an ≤820 px viewport — and on a phone held upright that is also the hand
 * driving `TouchStick` out of the bottom-left corner. Top-right on that device is a reach
 * across the whole screen and past §12.7's nav, which already lives there; bottom-right is
 * the same thumb's own corner, empty, with `InteractPrompt` and `ShowcaseControls` both
 * centred rather than run to the edges.
 *
 * **Landscape is excluded even on a mobile tier device.** `useIsPortrait` is reactive for
 * exactly this: a phone rotated flat has the top corner back within reach and the standing
 * controls should follow it there rather than staying pinned to a rule written for the
 * other orientation.
 */
export type ControlsCorner = 'top' | 'bottom'

export function useControlsCorner(): ControlsCorner {
  const portrait = useIsPortrait()
  return resolveTier() === 'mobile' && portrait ? 'bottom' : 'top'
}
