/**
 * §10 / §10.0 / §10.0.1 — the ripple ring shader, both stages.
 *
 * **Why this is a `.ts` file and not two `.glsl` files.** CLAUDE.md requires GLSL to live in
 * its own files under `shaders/` rather than as strings scattered through components, and this
 * satisfies that — but the first attempt used real `.glsl` files with Turbopack's built-in
 * `type: 'raw'` module rule, and on Next 16.2.12 that **silently produced `undefined`**. The
 * shader text never entered the bundle, `ShaderMaterial` received `undefined` for both stages,
 * and three substituted its own default — which is `gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)`,
 * an opaque red quad. Twelve red rectangles on the road, no console error, no build warning,
 * and nothing anywhere naming a shader. Template literals in a TypeScript module cannot fail
 * that way: a missing export is a compile error.
 *
 * **Two generations are alive per emitter, and §10.0.1 has why.** The cycle wraps on the
 * interval (1.1 s) while the age divides by the life (1.4 s), so a single generation could
 * never exceed age 0.786 — every ring was cut off at 79% of its life and restarted instantly
 * in the same place. `ceil(1.4 ÷ 1.1)` is 2, so exactly two rings can overlap and never three.
 */

/**
 * Everything per-cycle is resolved here, four vertices per instance, so the fragment stage
 * carries no transcendentals and no hashing.
 *
 * `aJitter` is the metres of centre travel this emitter's own puddle was measured to absorb at
 * mount. It is per-emitter and not global because a bound honest enough for the worst emitter
 * is about 0.07 m and invisible.
 */
export const rippleVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aJitter;

  varying vec2 vLocal;
  varying vec2 vAges;
  varying vec4 vRingA;
  varying vec4 vRingB;
  varying vec4 vPrevA;
  varying vec4 vPrevB;

  uniform float uTime;
  uniform float uLifeSec;
  uniform float uIntervalSec;
  uniform float uDecalDiameter;
  uniform float uSizeVariation;
  uniform float uWobble;

  #include <fog_pars_vertex>

  // Sin-free on purpose. This material compiles as GLSL ES 1.00, so there are no integer
  // operations, and the generation index climbs forever — a mediump sin of a large argument is
  // noise on a phone, which is a failure that would look like the ripples rather than the hash.
  vec3 hash31(float n) {
    vec3 p = fract(vec3(n) * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.xxy + p.yzz) * p.zyx);
  }

  // One generation's shape: where its centre sits, how far it reaches, and how far from
  // circular it is. All three vary per cycle, so a ring never repeats the one before it.
  void ring(float gen, out vec4 a, out vec4 b) {
    vec3 h0 = hash31(aPhase * 4096.0 + gen);
    vec3 h1 = hash31(aPhase * 4096.0 + gen + 0.5);

    // sqrt for a uniform disc. Without it the centres crowd the middle and the jitter reads
    // as a wobble about one point rather than as rain landing somewhere new.
    float jq = aJitter / uDecalDiameter;
    float rad = jq * sqrt(h0.x);
    float ang = 6.2831853 * h0.y;
    vec2 off = rad * vec2(cos(ang), sin(ang));

    // **The jitter is paid out of the reach, not out of the quad.** 0.5 is the quad edge in
    // local units, so this keeps every ring inside its own decal. An offset centre with an
    // unchanged reach would grow past the quad and arrive as a crescent.
    float reach = (0.5 - rad) * (1.0 - uSizeVariation + 2.0 * uSizeVariation * h0.z);

    a = vec4(off, reach, uWobble * (0.6 + 0.8 * h1.x));

    // Harmonic phases as cos/sin pairs, so the fragment stage needs no trigonometry.
    float p2 = 6.2831853 * h1.y;
    float p3 = 6.2831853 * h1.z;
    b = vec4(cos(p2), sin(p2), cos(p3), sin(p3));
  }

  void main() {
    vLocal = position.xy;

    float t = uTime + aPhase * uIntervalSec;

    // Wrapped, and the wrap is load-bearing: a fract-based hash loses low bits as its input
    // grows, and the generation index climbs about 0.9 per second forever. 1024 rings is
    // ~19 minutes per emitter before the sequence repeats, which nobody will see, and it keeps
    // the hash input inside the range where it still resolves.
    float k = mod(floor(t / uIntervalSec), 1024.0);
    float cycle = t - floor(t / uIntervalSec) * uIntervalSec;

    // .x is this generation's age, .y the previous one's — the tail that used to be deleted.
    vAges = vec2(cycle, cycle + uIntervalSec) / uLifeSec;

    ring(k, vRingA, vRingB);
    ring(k - 1.0, vPrevA, vPrevB);

    // The name matters — three's <fog_vertex> chunk reads mvPosition by that identifier.
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);

    #include <fog_vertex>

    gl_Position = projectionMatrix * mvPosition;
  }
`

/**
 * An expanding, slightly non-circular annulus, alpha-blended and never additive: §3.6 recorded
 * why and §10.1 repeated it — `FogExp2` mixes toward `fogColor` before the blend, so an
 * additive decal at range arrives sitting inside a visible dark box.
 *
 * Nothing is sampled. §10 specifies a radial *shader* rather than a texture, which is why
 * forty-eight emitters cost nothing against §15's memory budget.
 */
export const rippleFragmentShader = /* glsl */ `
  varying vec2 vLocal;
  varying vec2 vAges;
  varying vec4 vRingA;
  varying vec4 vRingB;
  varying vec4 vPrevA;
  varying vec4 vPrevB;

  uniform vec3 uColor;
  uniform float uPeakOpacity;
  uniform float uThickness;
  uniform float uBirthFrac;

  #include <fog_pars_fragment>

  /**
   * One generation's contribution.
   *
   * An age outside [0, 1] returns **0.0 and does not discard**: with two generations in flight
   * a dead one must not kill the fragment the live one is drawing into. That single line is the
   * difference between §10.0.1's fix and a shader that flickers.
   */
  float ringAlpha(float age, vec4 a, vec4 b) {
    if (age < 0.0 || age > 1.0) return 0.0;

    vec2 p = vLocal - a.xy;
    float d = length(p);

    // Not a circle. Ripples on a moving film are not, and a perfect one is the detail that
    // reads as drawn. cos(2t) is an ellipse to first order; cos(3t) removes the symmetry.
    // Harmonics come from the normalised direction by Chebyshev rather than from atan.
    vec2 n = p / max(d, 1e-4);
    float c2 = n.x * n.x - n.y * n.y;
    float s2 = 2.0 * n.x * n.y;
    float c3 = n.x * (4.0 * n.x * n.x - 3.0);
    float s3 = n.y * (3.0 - 4.0 * n.y * n.y);
    float wobble = a.w * ((c2 * b.x + s2 * b.y) + 0.6 * (c3 * b.z + s3 * b.w));

    // The wavefront travels out at a decaying rate — fast on impact, slowing as it spreads,
    // which is what a surface wave does. sqrt is the cheapest curve with that shape.
    float front = sqrt(age) * a.z * (1.0 + wobble);

    // A fraction of the current radius, so the ring thins as it grows (§10.0). Floored so the
    // first frames are not a sub-pixel line that aliases into dashes.
    float halfWidth = max(uThickness * front, 0.01);

    float band = 1.0 - smoothstep(0.0, 1.0, abs(d - front) / halfWidth);

    // Inside the wavefront the water is still disturbed, so a faint wash trails the ring.
    // max() on the divisor guards the age-0 frame, where front is exactly zero.
    float inner = (1.0 - smoothstep(0.0, max(front, 1e-4), d)) * 0.22;

    // Three fades multiply. 'life' and 'birth' between them mean the ring now reaches zero at
    // both ends — §10.0.1's whole point. 'edge' keeps an emitter from showing a hard circular
    // boundary where its quad stops.
    float life = 1.0 - age;
    float birth = smoothstep(0.0, uBirthFrac, age);
    float edge = 1.0 - smoothstep(0.35, 0.5, front);

    return (band + inner) * life * birth * edge;
  }

  void main() {
    float alpha = uPeakOpacity * (
      ringAlpha(vAges.x, vRingA, vRingB) +
      ringAlpha(vAges.y, vPrevA, vPrevB)
    );

    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uColor, min(alpha, 1.0));

    // §5 — a ring at the far end of a 46 m alley has to recede like the floor it sits on, or
    // it arrives at full strength in front of a wall that has already faded out.
    #include <fog_fragment>
  }
`
