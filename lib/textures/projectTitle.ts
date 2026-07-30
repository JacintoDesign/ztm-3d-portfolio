'use client'

import type { CanvasTexture } from 'three'
import { finishLightbox, paintLightbox } from '@/lib/textures/lightboxSign'
import { SHOWCASE, type Tier } from '@/lib/world'

/**
 * §2.1 — the project name, as a §3.4 lightbox: a lit coloured face with the name **cut out of
 * it in black**, exactly like every shop sign in this alley.
 *
 * It was white neon glyphs at §8.1's 4.20 rung and that was wrong twice over — `signWhite` at
 * that rung is over the knee on all three channels at once, so §9 had nothing left to bloom
 * *toward* and the sign read as a hole in the world; and a project name is a shopfront's name,
 * not a tube. The recipe now lives in `lightboxSign.ts`, shared with §3.6's brand sign, which
 * is the only other one of these in the world.
 *
 * Greyscale, `emissiveMap` only — §3.4's rule. The colour is `SHOWCASE.titleSign.color` on the
 * material, which is what lets one painter serve two signs in two colours.
 */

/** One texture, repainted in place on project change — never a new one per page. */
let live: { texture: CanvasTexture; tier: Tier } | null = null

export function projectTitleTexture(name: string, tier: Tier): CanvasTexture | null {
  const canvas = paintLightbox([{ text: name.toUpperCase(), face: 'latin' }], SHOWCASE.signCanvas[tier])
  if (canvas === null) return null

  if (live !== null && live.tier === tier) {
    live.texture.image = canvas
    live.texture.needsUpdate = true
    return live.texture
  }

  live = { texture: finishLightbox(canvas, tier), tier }
  return live.texture
}
