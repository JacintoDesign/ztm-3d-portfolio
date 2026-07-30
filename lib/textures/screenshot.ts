'use client'

import { CanvasTexture, ClampToEdgeWrapping, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { CANVAS_PAINTER, SHOWCASE, type Tier } from '@/lib/world'

/**
 * §2.1 / §16.6 — the project screenshots, downscaled at runtime.
 *
 * **The source JPEGs are 1920 × 1020 and decode to about 7.8 MB of RGBA each.** §16 item 6
 * predicted they would not fit and it was right: four of them is more than twice the whole
 * world's texture budget. They come down to 1024 × 544 desktop and 512 × 272 mobile here,
 * at load, with no build step and no dependency — §16 item 1 ruled that §8's `#A6B2C6` tint
 * does the darkening, so a pre-processing pass had nothing else left to do.
 *
 * **Three resident, never all of them.** An all-resident cache is O(N) in the project count,
 * and §17 requires a fifth project to change nothing but `CONTENT.md` — it must not silently
 * put the world over §15. With four projects `{prev, current, next}` is not even a
 * compromise: the one evicted image is two pages away in either direction, so paging never
 * waits on a decode.
 *
 * **Failure is the absence of a call, not a caught error.** `onReady` fires only on success.
 * A 404, a decode rejection, a missing `Screenshot:` field or no 2D context all end the same
 * way — nothing happens, and §2.1's aperture stays in the resting state it was *built* in.
 * There is no error path to get wrong because there is no error path.
 */

type Entry = { texture: CanvasTexture; lastUsed: number }

const cache = new Map<string, Entry>()
const inFlight = new Set<string>()
/** Monotonic, so eviction never needs a clock. */
let useCounter = 0

const keyFor = (path: string, tier: Tier): string => `${tier}:${path}`

/**
 * Drop everything outside `keep`. Called by the consumer with the paths it wants resident,
 * so the eviction policy lives with the thing that knows about paging rather than here.
 */
export function retainScreenshots(paths: readonly string[], tier: Tier): void {
  const keep = new Set(paths.map((path) => keyFor(path, tier)))
  for (const [key, entry] of cache) {
    if (keep.has(key)) continue
    /* Disposing releases the GPU upload; dropping the map alone would leave it resident and
       §15's whole reason for a resident *set* would quietly stop being true. */
    entry.texture.dispose()
    cache.delete(key)
  }
}

function finish(canvas: HTMLCanvasElement, tier: Tier): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = CANVAS_PAINTER.generateMipmaps
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = CANVAS_PAINTER.anisotropy[tier]
  texture.needsUpdate = true
  return texture
}

/**
 * Request a screenshot. `onReady` is called once, asynchronously, **only if it works**.
 *
 * Already-decoded images call back synchronously-ish on the next microtask rather than
 * immediately, so the consumer never has to handle "called back during my own render".
 */
export function requestScreenshot(
  path: string,
  tier: Tier,
  onReady: (texture: CanvasTexture) => void,
): void {
  if (typeof document === 'undefined') return
  if (path.length === 0) return

  const key = keyFor(path, tier)

  const cached = cache.get(key)
  if (cached !== undefined) {
    cached.lastUsed = ++useCounter
    queueMicrotask(() => onReady(cached.texture))
    return
  }

  if (inFlight.has(key)) return
  inFlight.add(key)

  const [width, height] = SHOWCASE.screenshotSize[tier]
  const image = new Image()
  /* Same origin — these are files in `public/`. Set anyway, because a canvas drawn from an
     image without it is tainted and `CanvasTexture` would then fail at upload rather than
     at load, which is much further from the cause. */
  image.crossOrigin = 'anonymous'

  const draw = (): void => {
    inFlight.delete(key)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx === null) return

    /* The browser's own downscale filter. Explicit rather than default, because `high` is
       what makes a 1.9× reduction read as a resize instead of as aliasing, and the default
       is not guaranteed across engines. */
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, 0, 0, width, height)

    const texture = finish(canvas, tier)
    cache.set(key, { texture, lastUsed: ++useCounter })
    onReady(texture)
  }

  /* `decode()` moves the work off the main thread and rejects rather than throwing, which
     is the whole failure path: a rejection simply never reaches `draw`. Falling back to
     `onload` keeps this working where `decode` is unimplemented. */
  const giveUp = (): void => {
    inFlight.delete(key)
  }

  image.onerror = giveUp
  if (typeof image.decode !== 'function') image.onload = draw

  // Handlers first, then the load — an image already in the HTTP cache can complete before
  // the next statement runs.
  image.src = path

  if (typeof image.decode === 'function') image.decode().then(draw, giveUp)
}

/** Dev-facing: how many screenshot textures are resident. §15's number, read rather than assumed. */
export const residentScreenshotCount = (): number => cache.size
