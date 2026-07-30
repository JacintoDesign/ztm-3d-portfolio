import type { NextConfig } from 'next'

/**
 * §15 asks for the engine (three + @react-three/*) to land in its own chunk so it
 * caches independently of application code.
 *
 * There is deliberately no splitChunks configuration here. The split already comes
 * from the `next/dynamic({ ssr: false })` boundary in components/world/WorldMount.tsx
 * — everything reachable only through that import lands in its own async chunk. Next 16
 * builds with Turbopack, which does not expose webpack's splitChunks anyway, so a
 * hand-written cacheGroups block would be config that silently does nothing.
 *
 * The chunk size is checked against the §15 600 kB gzip budget at build time, not
 * asserted here.
 */
/**
 * **There is deliberately no `turbopack.rules` entry for `*.glsl` here, and it was tried.**
 * Turbopack documents a built-in `type: 'raw'` module rule that returns a file's contents as
 * a string, which would have let `shaders/` hold real `.glsl` files with no dependency. On
 * 16.2.12 it silently resolved the import to `undefined`: the shader text never entered the
 * bundle, `ShaderMaterial` was constructed with `undefined` for both stages, and three
 * substituted its own default — `gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)`. The symptom was
 * twelve opaque red rectangles lying on the road, with no console error, no build warning and
 * nothing anywhere mentioning a shader.
 *
 * `shaders/ripple.ts` holds the GLSL as template literals instead. A missing export there is
 * a compile error, and no bundler configuration sits between the text and the GPU.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
