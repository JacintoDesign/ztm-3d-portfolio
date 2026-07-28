import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    /**
     * React Compiler's immutability rule assumes values flowing through a component are
     * immutable data. React Three Fiber is the opposite: the scene graph is a live tree
     * of three.js objects, and animation *is* mutation of it. CLAUDE.md requires exactly
     * what this rule forbids — "animate by mutating refs, not by re-rendering", and never
     * allocate or setState inside a frame loop. Scrolling a texture offset by assigning a
     * new Vector2 sixty times a second would be the bug, not the fix.
     *
     * Scoped to the files that touch the scene graph, so the rule keeps protecting the
     * 2D overlay code where it is correct.
     */
    files: ['components/world/**/*.tsx', 'components/player/**/*.tsx', 'lib/textures/**/*.ts'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]

export default config
