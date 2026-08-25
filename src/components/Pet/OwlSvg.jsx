// Hand-drawn vector owl — Букля.
//
// Layers, back to front:
//   contact shadow                      → soft ellipse under the feet
//   wings (left + right, behind body)   → single silhouette each, the tips of
//                                         the primaries are carved into the
//                                         lower edge so nothing floats loose
//   body + head (one shape)             → cream blob with scalloped plumage
//   facial disc                         → heart-shaped, with feather rays
//   eyes                                → amber iris, lid clipped to the eye
//   beak + open mouth                   → cavity, tongue, lower mandible
//   feet (+ optional perch)             → talons gripping a branch
//
// Animations are driven by classes on inner groups — CSS keyframes live in
// styles/index.css.
//
// Mirroring the right wing lives on an OUTER <g> while the flap animation
// sits on an inner one: a CSS transform overrides the same-named
// presentation attribute, so both on one node would drop the mirror on
// every keyframe.
//
// Click anywhere on the owl → joyful jump with the wings thrown up (~700ms).
// Debounced: while jumping, further clicks are ignored.

import { useId, useRef, useState } from 'react';
import { getDecoration } from '../../data/petDecorations.js';

const JUMP_MS = 700;

// Eyes of the current art.
const EYE_L = 163;
const EYE_R = 237;
const EYE_Y = 168;
const EYE_RAD = 30;

// Per-slot anchor for equipped items. These are still expressed in the
// PREVIOUS art's coordinate space (400×360, eyes at 166/234 × 172) because
// every hat, lens and amulet further down is drawn there. DECO_TRANSFORM maps
// that space onto the current owl in one place, so shop items keep fitting
// without re-drawing each of them.
const SLOT_POSITIONS = {
  head:   { x: 200, y: 50,  size: 110 }, // crown of the head
  eyes:   { x: 200, y: 178, size: 78  }, // straddles both eyes
  brooch: { x: 244, y: 256, size: 28  }, // small pin, mid-chest
  wingL:  { x: 80,  y: 250, size: 50  },
  wingR:  { x: 320, y: 250, size: 50  }
};
const DECO_TRANSFORM = 'translate(200 168) scale(1.088) translate(-200 -172)';
// Headwear needs its own, gentler mapping: the tallest hats start at y≈12 in
// the legacy space and the 1.088 scale pushed their tips past the top of the
// viewBox, which the SVG clips.
const HEAD_TRANSFORM = 'translate(200 172) scale(1.03) translate(-200 -172)';

// Wing amulets don't go through that mapping: the old wings were far wider,
// so a legacy anchor lands the charm half-way off the current one. Only a
// ~37px band of each wing shows past the body (x 63…100 at this height), so
// the charms get their own anchors and are scaled down to fit it.
const WING_SLOT_POS = {
  wingL: { x: 81,  y: 252 },
  wingR: { x: 319, y: 252 }
};
const WING_SLOT_SCALE = 0.72;

// Wing outline. The top starts inside the silhouette (y=118) and stays right
// of the body's left edge until y≈180, so the wing emerges from under the
// body instead of being pasted onto its side.
const WING_BLADE =
  'M 150 118 C 132 128 108 146 96 178 C 78 210 62 246 68 284 ' +
  'C 71 299 76 306 80 310 L 88 327 C 92 315 94 306 96 299 ' +
  'L 106 323 C 108 312 110 303 112 296 L 122 317 C 126 306 128 297 130 290 ' +
  'C 144 246 154 180 150 118 Z';

const BODY_SHAPE =
  'M 200 62 C 274 62 312 122 310 194 C 308 274 264 330 200 330 ' +
  'C 136 330 92 274 90 194 C 88 122 126 62 200 62 Z';

// Row of feather scallops: n arcs of width w centred on cx at height y.
function scallopRow(cx, y, w, n, h) {
  const step = w / n;
  const x0 = cx - w / 2;
  let d = '';
  for (let i = 0; i < n; i++) {
    d += `M ${(x0 + i * step).toFixed(1)} ${y} q ${(step / 2).toFixed(1)} ${h} ${step.toFixed(1)} 0 `;
  }
  return d;
}

function Scallops({ cx, y, w, n, h = 8, color = '#cbb083', op = 0.4 }) {
  return (
    <path
      d={scallopRow(cx, y, w, n, h)}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity={op}
    />
  );
}

// Thin feather strokes fanning out from an eye across the facial disc.
function DiscRays({ cx, cy, r0, r1, n, from, to, color }) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = from + (to - from) * (i / (n - 1));
    d += `M ${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)} `;
    d += `L ${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)} `;
  }
  return <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" fill="none" />;
}

// Radial fibres inside the iris.
function IrisFibers({ cx, cy, r0, r1, n, color }) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + 0.3;
    d += `M ${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)} `;
    d += `L ${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)} `;
  }
  return <path d={d} stroke={color} strokeWidth="0.9" strokeLinecap="round" opacity="0.55" fill="none" />;
}

function Wing({ side, uid }) {
  const mirror = side < 0 ? undefined : 'translate(400 0) scale(-1 1)';
  return (
    <g transform={mirror}>
      <g className="owl-wing">
        <path d={WING_BLADE} fill={`url(#${uid}-wing)`} stroke="#8a6538" strokeWidth="1.2" strokeLinejoin="round" />
        {/* coverts */}
        <Scallops cx={118} y={158} w={44} n={4} color="#f2e0c0" op={0.32} />
        <Scallops cx={108} y={184} w={50} n={4} color="#f2e0c0" op={0.28} />
        <Scallops cx={100} y={210} w={52} n={4} color="#f2e0c0" op={0.23} />
        <Scallops cx={98}  y={236} w={48} n={3} color="#f2e0c0" op={0.18} />
        <Scallops cx={98}  y={262} w={44} n={3} color="#f2e0c0" op={0.13} />
        {/* separations continuing the notches of the lower edge */}
        <g stroke="#7a5730" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.45">
          <path d="M 76 272 q 6 30 12 52" />
          <path d="M 92 266 q 8 30 14 52" />
          <path d="M 108 260 q 8 29 14 51" />
        </g>
        {/* shading where the body overlaps the wing */}
        <path d="M 146 124 q 14 84 -12 166 q 20 -10 24 -30 q 10 -70 0 -136 Z" fill="#2e1c0c" opacity="0.20" />
        <path
          d="M 146 122 C 126 134 106 152 96 180"
          stroke="var(--owl-rim)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </g>
  );
}

function Eye({ cx, cy, uid }) {
  const r = EYE_RAD;
  const clip = `${uid}-eye-${cx}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <circle cx={cx} cy={cy} r={r + 0.5} />
        </clipPath>
      </defs>

      {/* soft socket shadow */}
      <ellipse className="owl-socket" cx={cx} cy={cy + 2} rx={r + 5} ry={r + 5} fill="#8a6a44" opacity="0.16" />

      <g className="owl-eyeball">
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-sclera)`} />
        <circle cx={cx} cy={cy} r={r - 3} fill={`url(#${uid}-iris)`} />
        <IrisFibers cx={cx} cy={cy} r0={9} r1={r - 5} n={34} color="#a85c14" />
        <circle cx={cx} cy={cy} r={r - 3} fill="none" stroke="#7a3f0a" strokeWidth="2" opacity="0.7" />
        <circle className="owl-pupil" cx={cx} cy={cy} r="14" fill={`url(#${uid}-pupil)`} />
        {/* upper-lid shadow cast on the eyeball */}
        <path
          d={`M ${cx - r} ${cy} a ${r} ${r} 0 0 1 ${r * 2} 0 q ${-r} ${-r * 0.42} ${-r * 2} 0 Z`}
          fill="#3a1e06"
          opacity="0.30"
        />
        {/* light bounced back from below */}
        <path
          d={`M ${cx - 15} ${cy + 15} q 15 12 30 -2`}
          stroke="#ffd9a0"
          strokeWidth="3"
          fill="none"
          opacity="0.35"
          strokeLinecap="round"
        />
        <ellipse
          cx={cx - 9}
          cy={cy - 11}
          rx="8"
          ry="6"
          fill="#ffffff"
          opacity="0.95"
          transform={`rotate(-22 ${cx - 9} ${cy - 11})`}
        />
        <circle cx={cx + 10} cy={cy + 8} r="3.2" fill="#ffffff" opacity="0.55" />
        <g className="owl-shine">
          <ellipse
            cx={cx + 2}
            cy={cy - 4}
            rx="3"
            ry="12"
            fill="#fff6dd"
            opacity="0"
            transform={`rotate(-24 ${cx + 2} ${cy - 4})`}
          />
        </g>
      </g>

      {/* happy arc, shown instead of the eyeball */}
      <path
        className="owl-happy-eye"
        d={`M ${cx - 20} ${cy + 6} q 20 -26 40 0`}
        stroke="#3d2410"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />

      {/* half-closed lid for the sleepy mood */}
      <g className="owl-sleep-lid">
        <path
          d={`M ${cx - r} ${cy - 4} a ${r} ${r} 0 0 1 ${r * 2} 0 L ${cx + r} ${cy + 6} q ${-r} ${r * 0.5} ${-r * 2} 0 Z`}
          fill={`url(#${uid}-lid)`}
        />
        <path
          d={`M ${cx - r + 2} ${cy + 6} q ${r - 2} ${r * 0.45} ${(r - 2) * 2} 0`}
          stroke="#b89468"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Blink. The clip lives on the wrapper and the scale on the inner
          group: an element's own transform carries its clip-path along, so
          both on one node would slide together and clip nothing. */}
      <g clipPath={`url(#${clip})`}>
        <g className="owl-lid">
          <circle cx={cx} cy={cy} r={r + 2} fill={`url(#${uid}-lid)`} />
          <path
            d={`M ${cx - r * 0.8} ${cy + r * 0.5} q ${r * 0.8} ${r * 0.32} ${r * 1.6} 0`}
            stroke="#b89468"
            strokeWidth="1.8"
            fill="none"
            opacity="0.75"
            strokeLinecap="round"
          />
        </g>
      </g>
    </g>
  );
}

export function OwlSvg({ className = '', equipped = {}, perch = false }) {
  const [jumping, setJumping] = useState(false);
  const cooldown = useRef(false);
  // Gradient ids must be unique per instance, otherwise a second owl on the
  // page re-points the first one's fills at its own defs.
  const uid = `owl-${useId().replace(/:/g, '')}`;

  const onClick = () => {
    if (cooldown.current) return;
    cooldown.current = true;
    setJumping(true);
    setTimeout(() => {
      setJumping(false);
      cooldown.current = false;
    }, JUMP_MS);
  };

  // Head-worn slots ride inside the head group so hats follow the sway;
  // wing amulets stay outside it.
  const renderSlot = (slot) => {
    const id = equipped[slot];
    if (!id) return null;
    const d = getDecoration(id);
    const pos = SLOT_POSITIONS[slot];
    if (!d || !pos) return null;

    if (slot === 'eyes') {
      if (id === 'monocle') return <Monocle key={slot} />;
      if (id === 'glasses') return <Glasses key={slot} />;
      if (id === 'shades')  return <Shades  key={slot} />;
    }
    if (slot === 'head') {
      if (id === 'bow')      return <Bow      key={slot} />;
      if (id === 'academic') return <Academic key={slot} />;
      if (id === 'cap')      return <Cap      key={slot} />;
      if (id === 'tophat')   return <TopHat   key={slot} />;
      if (id === 'crown')    return <Crown    key={slot} />;
    }
    if (slot === 'wingL' || slot === 'wingR') {
      const wp = WING_SLOT_POS[slot];
      const fit = `translate(${wp.x} ${wp.y}) scale(${WING_SLOT_SCALE}) translate(${-wp.x} ${-wp.y})`;
      const Comp = WING_COMPS[id];
      return (
        <g key={slot} className={`owl-deco owl-deco--${slot} owl-deco--${id}`} transform={fit}>
          {Comp ? <Comp x={wp.x} y={wp.y} /> : (
            <text x={wp.x} y={wp.y} fontSize={pos.size} textAnchor="middle" dominantBaseline="central">
              {d.icon}
            </text>
          )}
        </g>
      );
    }

    // Emoji fallback for anything without a dedicated renderer.
    return (
      <g key={slot} className={`owl-deco owl-deco--${slot}`}>
        <text x={pos.x} y={pos.y} fontSize={pos.size} textAnchor="middle" dominantBaseline="central">
          {d.icon}
        </text>
      </g>
    );
  };

  return (
    <svg
      className={`owl-svg ${jumping ? 'owl-svg--jump ' : ''}${className}`.trim()}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      role="button"
      aria-label="Букля"
    >
      <defs>
        <radialGradient id={`${uid}-body`} cx="38%" cy="26%" r="82%">
          <stop offset="0%"   stopColor="#fffdf7" />
          <stop offset="34%"  stopColor="#f7ecd8" />
          <stop offset="70%"  stopColor="#e2cba6" />
          <stop offset="100%" stopColor="#a9825a" />
        </radialGradient>
        <radialGradient id={`${uid}-belly`} cx="50%" cy="34%" r="66%">
          <stop offset="0%"   stopColor="#fffefb" />
          <stop offset="60%"  stopColor="#fdf4e4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f3e2c4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-disc`} cx="50%" cy="34%" r="72%">
          <stop offset="0%"   stopColor="#fffdf6" />
          <stop offset="58%"  stopColor="#f9efdb" />
          <stop offset="82%"  stopColor="#f2e3c8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#eeddbe" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-wing`} cx="26%" cy="16%" r="96%">
          <stop offset="0%"   stopColor="#fbf0dc" />
          <stop offset="42%"  stopColor="#e2c79c" />
          <stop offset="78%"  stopColor="#bb9564" />
          <stop offset="100%" stopColor="#7d5a33" />
        </radialGradient>
        <radialGradient id={`${uid}-iris`} cx="38%" cy="30%" r="78%">
          <stop offset="0%"   stopColor="#ffdc93" />
          <stop offset="40%"  stopColor="#f0a63a" />
          <stop offset="78%"  stopColor="#c76e12" />
          <stop offset="100%" stopColor="#7d3f06" />
        </radialGradient>
        <radialGradient id={`${uid}-sclera`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff8ea" />
          <stop offset="100%" stopColor="#e6d0ab" />
        </radialGradient>
        <radialGradient id={`${uid}-pupil`} cx="40%" cy="34%" r="80%">
          <stop offset="0%"   stopColor="#2b1a0e" />
          <stop offset="55%"  stopColor="#120a06" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <linearGradient id={`${uid}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#f3e3c6" />
          <stop offset="100%" stopColor="#d8bf95" />
        </linearGradient>
        <linearGradient id={`${uid}-beak`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%"   stopColor="#ffe6a8" />
          <stop offset="38%"  stopColor="#f5b13a" />
          <stop offset="100%" stopColor="#9c5a12" />
        </linearGradient>
        <linearGradient id={`${uid}-talon`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffd08a" />
          <stop offset="100%" stopColor="#c07a22" />
        </linearGradient>
        <linearGradient id={`${uid}-branch`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8a6034" />
          <stop offset="45%"  stopColor="#5f3e1f" />
          <stop offset="100%" stopColor="#3a2412" />
        </linearGradient>

        <clipPath id={`${uid}-clip-body`}>
          <path d={BODY_SHAPE} />
        </clipPath>
        <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`${uid}-drop`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="var(--owl-drop)" />
        </filter>
      </defs>

      {/* contact shadow */}
      <ellipse cx="200" cy="378" rx="112" ry="13" fill="var(--owl-contact)" filter={`url(#${uid}-soft)`} />

      <g filter={`url(#${uid}-drop)`}>
        {perch && (
          <g>
            <path
              d="M 58 344 q 142 -14 284 0 q 5 13 0 24 q -142 13 -284 0 q -6 -12 0 -24 Z"
              fill={`url(#${uid}-branch)`}
              stroke="#2e1c0c"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <g stroke="#3a2412" strokeWidth="1.4" opacity="0.5" fill="none" strokeLinecap="round">
              <path d="M 94 350 q 30 4 62 3" />
              <path d="M 178 352 q 40 4 84 2" />
              <path d="M 106 361 q 46 4 92 2" />
              <path d="M 218 361 q 40 3 80 0" />
            </g>
            <path d="M 66 345 q 138 -13 268 0" stroke="var(--owl-rim)" strokeWidth="2" fill="none" opacity="0.5" />
          </g>
        )}

        {/* Everything that leaves the ground when the owl hops. */}
        <g className="owl-hop">
        <g className="owl-breathe">
          <Wing side={-1} uid={uid} />
          <Wing side={1}  uid={uid} />

          {/* wing amulets sit outside the head group so they don't sway */}
          {renderSlot('wingL')}
          {renderSlot('wingR')}

          <g className="owl-head">
            {/* ear tufts, behind the body so their base blends in */}
            <g className="owl-tuft-l">
              <path
                d="M 122 122 q -14 -46 -2 -80 q 8 -6 14 2 q 20 34 38 76 q -26 14 -50 2 Z"
                fill={`url(#${uid}-body)`}
                stroke="#c9ad82"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M 126 114 q -8 -34 0 -60" stroke="#b8996c" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
            </g>
            <g className="owl-tuft-r">
              <path
                d="M 278 122 q 14 -46 2 -80 q -8 -6 -14 2 q -20 34 -38 76 q 26 14 50 2 Z"
                fill={`url(#${uid}-body)`}
                stroke="#c9ad82"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M 274 114 q 8 -34 0 -60" stroke="#b8996c" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
            </g>

            <path d={BODY_SHAPE} fill={`url(#${uid}-body)`} stroke="var(--owl-edge)" strokeWidth="1.6" />

            {/* Side shading, clipped by the silhouette — the blur would
                otherwise spill a dark halo past the body's right edge, right
                into the seam with the wing. */}
            <g clipPath={`url(#${uid}-clip-body)`}>
              <path
                d="M 200 62 C 274 62 312 122 310 194 C 308 274 264 330 200 330 q 46 -132 0 -268 Z"
                fill="#8a6a42"
                opacity="0.08"
                filter={`url(#${uid}-soft)`}
              />
            </g>
            <ellipse cx="196" cy="252" rx="84" ry="76" fill={`url(#${uid}-belly)`} />

            {/* chest plumage */}
            <Scallops cx={196} y={210} w={132} n={9}  h={11} op={0.5} />
            <Scallops cx={196} y={234} w={144} n={10} h={11} op={0.45} />
            <Scallops cx={196} y={258} w={140} n={10} h={11} op={0.38} />
            <Scallops cx={196} y={282} w={120} n={8}  h={11} op={0.30} />
            <Scallops cx={196} y={304} w={90}  n={6}  h={10} op={0.22} />

            {/* rim light from the upper left */}
            <path d="M 200 62 C 150 62 108 96 95 152" stroke="var(--owl-rim)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
            <path d="M 214 63 C 262 68 296 100 306 150" stroke="var(--owl-rim)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.35" />
            {/* bounce light along the shaded edge, so the body reads apart
                from the wing behind it instead of merging into shadow */}
            <path d="M 307 176 C 306 246 270 312 216 328" stroke="var(--owl-rim)" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.45" />

            {/* facial disc — plain oval whose edge dissolves into the plumage */}
            <ellipse cx="200" cy="180" rx="94" ry="88" fill={`url(#${uid}-disc)`} />
            <DiscRays cx={EYE_L} cy={EYE_Y} r0={36} r1={50} n={11} from={Math.PI * 0.62}  to={Math.PI * 1.62} color="#c6a97e" />
            <DiscRays cx={EYE_R} cy={EYE_Y} r0={36} r1={50} n={11} from={Math.PI * -0.62} to={Math.PI * 0.38} color="#c6a97e" />

            {/* brows, shown when hungry */}
            <g className="owl-brow" stroke="#8a6a42" strokeWidth="5" strokeLinecap="round" fill="none">
              <path d={`M ${EYE_L - 24} ${EYE_Y - 40} q 22 -8 40 4`} />
              <path d={`M ${EYE_R + 24} ${EYE_Y - 40} q -22 -8 -40 4`} />
            </g>

            <g className="owl-blush" opacity="0.72">
              <ellipse cx="132" cy="212" rx="19" ry="11" fill="#ff9fb0" opacity="0.55" filter={`url(#${uid}-soft)`} />
              <ellipse cx="268" cy="212" rx="19" ry="11" fill="#ff9fb0" opacity="0.55" filter={`url(#${uid}-soft)`} />
            </g>

            <Eye cx={EYE_L} cy={EYE_Y} uid={uid} />
            <Eye cx={EYE_R} cy={EYE_Y} uid={uid} />

            {/* ---- BEAK + OPEN MOUTH ---- */}
            <g>
              <g className="owl-mouth">
                <path d="M 176 222 Q 200 258 224 222 Q 213 249 200 252 Q 187 249 176 222 Z" fill="#3a0f0a" />
                <path d="M 176 222 Q 200 258 224 222 Q 215 238 200 240 Q 185 238 176 222 Z" fill="#5a1a12" opacity="0.7" />
                <ellipse cx="200" cy="243" rx="8.5" ry="3.2" fill="#c4485a" opacity="0.9" />
                <ellipse cx="200" cy="242" rx="5" ry="1.3" fill="#e0798a" opacity="0.6" />
                <path
                  d="M 190 241 q 10 6 20 0 q -4 10 -10 11 q -6 -1 -10 -11 Z"
                  fill={`url(#${uid}-beak)`}
                  stroke="#8a4c0c"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path d="M 176 222 Q 200 258 224 222" stroke="#3a1508" strokeWidth="3.6" fill="none" strokeLinecap="round" />
              </g>

              <path
                d="M 200 192 q 12 2 13 13 q 0 10 -6 16 q -4 4 -7 5 q -3 -1 -7 -5 q -6 -6 -6 -16 q 1 -11 13 -13 Z"
                fill={`url(#${uid}-beak)`}
                stroke="#8a4c0c"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path d="M 195 199 q 5 -2 9 2 q -6 4 -7 11" stroke="#fff0c8" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
              <path d="M 208 202 q 2 8 -3 14" stroke="#7a3f06" strokeWidth="1.3" fill="none" opacity="0.4" strokeLinecap="round" />
              <ellipse cx="195" cy="199" rx="1.6" ry="1.1" fill="#7a3f06" opacity="0.55" />
              <ellipse cx="205" cy="199" rx="1.6" ry="1.1" fill="#7a3f06" opacity="0.55" />

              <path
                className="owl-smile-sad"
                d="M 182 250 q 18 -15 36 0"
                stroke="#7a3f06"
                strokeWidth="3.4"
                fill="none"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>

            {/* mood sparks */}
            <g className="owl-spark owl-spark--1" fill="#ffe6a8">
              <path d="M 96 132 l 3.4 8.6 8.6 3.4 -8.6 3.4 -3.4 8.6 -3.4 -8.6 -8.6 -3.4 8.6 -3.4 Z" />
            </g>
            <g className="owl-spark owl-spark--2" fill="#ffe6a8">
              <path d="M 306 108 l 2.8 7 7 2.8 -7 2.8 -2.8 7 -2.8 -7 -7 -2.8 7 -2.8 Z" />
            </g>
            <g className="owl-spark owl-spark--3" fill="#ffe6a8">
              <path d="M 318 214 l 2.2 5.6 5.6 2.2 -5.6 2.2 -2.2 5.6 -2.2 -5.6 -5.6 -2.2 5.6 -2.2 Z" />
            </g>

            {/* Zzz for the sleepy mood */}
            <g className="owl-zzz" fill="#cbb083" fontFamily="Inter, sans-serif" fontWeight="800">
              <text x="292" y="118" fontSize="20">Z</text>
            </g>
            <g className="owl-zzz owl-zzz--2" fill="#cbb083" fontFamily="Inter, sans-serif" fontWeight="800">
              <text x="302" y="132" fontSize="15">z</text>
            </g>
            <g className="owl-zzz owl-zzz--3" fill="#cbb083" fontFamily="Inter, sans-serif" fontWeight="800">
              <text x="310" y="144" fontSize="11">z</text>
            </g>

            {/* worn items, mapped from the legacy coordinate space */}
            <g transform={HEAD_TRANSFORM}>{renderSlot('head')}</g>
            <g transform={DECO_TRANSFORM}>
              {renderSlot('eyes')}
              {renderSlot('brooch')}
            </g>
          </g>
        </g>

        {/* feet — drawn over the perch so the toes grip it */}
        <g>
          <g stroke={`url(#${uid}-talon)`} strokeWidth="11" strokeLinecap="round" fill="none">
            <path d="M 170 316 L 170 342" />
            <path d="M 230 316 L 230 342" />
          </g>
          <g stroke={`url(#${uid}-talon)`} strokeWidth="9" strokeLinecap="round" fill="none">
            <path d="M 170 342 q -13 6 -18 18" />
            <path d="M 170 342 q 3 10 2 19" />
            <path d="M 170 342 q 14 5 19 17" />
            <path d="M 230 342 q -14 5 -19 17" />
            <path d="M 230 342 q -3 10 -2 19" />
            <path d="M 230 342 q 13 6 18 18" />
          </g>
          <g stroke="#b8761c" strokeWidth="1.6" opacity="0.6" fill="none" strokeLinecap="round">
            <path d="M 161 348 l 4 3" /><path d="M 179 348 l -4 3" />
            <path d="M 221 348 l 4 3" /><path d="M 239 348 l -4 3" />
          </g>
          <g stroke="#6a3d08" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M 152 360 q -4 3 -5 7" />
            <path d="M 172 361 q 1 4 0 7" />
            <path d="M 189 359 q 4 3 5 7" />
            <path d="M 211 359 q -4 3 -5 7" />
            <path d="M 228 361 q -1 4 0 7" />
            <path d="M 248 360 q 4 3 5 7" />
          </g>
        </g>
        </g>
      </g>
    </svg>
  );
}

// Inline-SVG round wire-rim glasses sitting on both eyes — nose bridge
// connects the two lenses, tiny temple arms wrap behind the head silhouette.
function Glasses() {
  return (
    <g className="owl-deco owl-deco--glasses">
      {/* Lenses (slight tint) */}
      <circle cx="166" cy="172" r="30" fill="rgba(170, 210, 255, 0.12)" />
      <circle cx="234" cy="172" r="30" fill="rgba(170, 210, 255, 0.12)" />
      {/* Wire rims */}
      <circle cx="166" cy="172" r="30" fill="none" stroke="#3a2a18" strokeWidth="3" />
      <circle cx="234" cy="172" r="30" fill="none" stroke="#3a2a18" strokeWidth="3" />
      {/* Bridge */}
      <path d="M 196 172 Q 200 168 204 172" stroke="#3a2a18" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* Highlights */}
      <path d="M 148 160 A 30 30 0 0 1 162 145" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" fill="none" />
      <path d="M 216 160 A 30 30 0 0 1 230 145" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" fill="none" />
      {/* Temple arms — short stubs reaching toward the ears */}
      <path d="M 136 174 L 122 178" stroke="#3a2a18" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M 264 174 L 278 178" stroke="#3a2a18" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

// Inline-SVG sunglasses — dark filled lenses joined by a flat bridge.
function Shades() {
  return (
    <g className="owl-deco owl-deco--shades">
      {/* Dark lenses */}
      <ellipse cx="166" cy="172" rx="32" ry="26" fill="#0a0a12" />
      <ellipse cx="234" cy="172" rx="32" ry="26" fill="#0a0a12" />
      {/* Frame outline */}
      <ellipse cx="166" cy="172" rx="32" ry="26" fill="none" stroke="#1a1a26" strokeWidth="3" />
      <ellipse cx="234" cy="172" rx="32" ry="26" fill="none" stroke="#1a1a26" strokeWidth="3" />
      {/* Bridge */}
      <path d="M 197 168 L 203 168 L 203 172 L 197 172 Z" fill="#1a1a26" />
      {/* Highlights — diagonal sheen */}
      <path d="M 148 158 L 178 168" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 216 158 L 246 168" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      {/* Temple stubs */}
      <path d="M 134 174 L 120 180" stroke="#1a1a26" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M 266 174 L 280 180" stroke="#1a1a26" strokeWidth="2.8" strokeLinecap="round" />
    </g>
  );
}

// ---------- HEAD pieces ----------
// All anchored around the owl's crown (x≈200, head-top at y≈75). Each shape
// is hand-drawn so it sits flush instead of an emoji floating above the head.

// Pink ribbon bow — central knot, two side loops, two short tails.
function Bow() {
  return (
    <g className="owl-deco owl-deco--bow">
      <defs>
        <linearGradient id="bow-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ff95c8" />
          <stop offset="50%" stopColor="#ff5fa3" />
          <stop offset="100%" stopColor="#c43075" />
        </linearGradient>
      </defs>
      {/* Left loop */}
      <path
        d="M 200 78
           Q 162 50 145 75
           Q 138 92 162 100
           Q 185 100 200 92 Z"
        fill="url(#bow-grad)"
        stroke="#7e1a4a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Right loop */}
      <path
        d="M 200 78
           Q 238 50 255 75
           Q 262 92 238 100
           Q 215 100 200 92 Z"
        fill="url(#bow-grad)"
        stroke="#7e1a4a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Left tail */}
      <path
        d="M 188 95
           L 176 122
           L 192 110 Z"
        fill="url(#bow-grad)"
        stroke="#7e1a4a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Right tail */}
      <path
        d="M 212 95
           L 224 122
           L 208 110 Z"
        fill="url(#bow-grad)"
        stroke="#7e1a4a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Center knot */}
      <rect x="190" y="76" width="20" height="24" rx="4"
            fill="#c43075" stroke="#7e1a4a" strokeWidth="1.2" />
      {/* Knot highlight */}
      <path d="M 192 80 Q 200 78 208 80" stroke="#ffc0dd" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

// Academic mortarboard — board + band in saturated royal blue (the
// classic black washed out against the dark scene background). Gold
// trim + gold tassel make it pop.
function Academic() {
  return (
    <g className="owl-deco owl-deco--academic">
      <defs>
        <linearGradient id="academic-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#5a78d0" />
          <stop offset="55%" stopColor="#2840a8" />
          <stop offset="100%" stopColor="#0e1c5e" />
        </linearGradient>
        <linearGradient id="academic-band-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#3a52b8" />
          <stop offset="100%" stopColor="#10206a" />
        </linearGradient>
      </defs>
      {/* Soft cap band under the board */}
      <path
        d="M 138 96
           Q 200 70 262 96
           L 260 110
           Q 200 92 140 110 Z"
        fill="url(#academic-band-grad)"
        stroke="#0a1450"
        strokeWidth="1.3"
      />
      {/* Mortarboard — wider parallelogram (slight tilt) */}
      <path
        d="M 200 28
           L 290 78
           L 200 102
           L 110 78 Z"
        fill="url(#academic-grad)"
        stroke="#0a1450"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Top sheen */}
      <path d="M 132 76 L 200 38 L 268 76" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" fill="none" />
      {/* Subtle inner edge highlight */}
      <path d="M 200 30 L 286 78" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
      {/* Button at center — golden */}
      <circle cx="200" cy="64" r="5" fill="#ffd864" stroke="#7a5a10" strokeWidth="0.9" />
      {/* Tassel — strap + bunch */}
      <path d="M 200 64 Q 244 76 260 110" stroke="#ffd864" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <g fill="#ffd864" stroke="#7a5a10" strokeWidth="0.5">
        <ellipse cx="262" cy="120" rx="6.5" ry="8" />
        <path d="M 256 124 L 254 138" stroke="#ffd864" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M 262 125 L 262 140" stroke="#ffd864" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M 268 124 L 270 138" stroke="#ffd864" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

// Baseball cap — like 🧢 emoji: rounded crown facing slightly right with
// a sweeping curved visor projecting forward-right (not symmetric). The
// crown sits low on the head, visor casts an underside shadow.
function Cap() {
  return (
    <g className="owl-deco owl-deco--cap">
      <defs>
        <linearGradient id="cap-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#4a8cff" />
          <stop offset="100%" stopColor="#1c4abf" />
        </linearGradient>
        <linearGradient id="cap-visor-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#1c4abf" />
          <stop offset="100%" stopColor="#0d2a70" />
        </linearGradient>
      </defs>
      {/* Crown — rounded dome, slightly forward-leaning so the back is
          taller than the front (emoji 🧢 silhouette). */}
      <path
        d="M 142 100
           Q 138 52 200 48
           Q 254 50 258 100
           Z"
        fill="url(#cap-grad)"
        stroke="#0d2a70"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Panel seams — six-panel cap, faint curved arcs from button outward */}
      <g stroke="rgba(0,0,0,0.22)" strokeWidth="0.9" fill="none">
        <path d="M 200 50 Q 180 70 168 100" />
        <path d="M 200 50 Q 220 70 232 100" />
      </g>
      {/* Front sweat-band stitch */}
      <path d="M 144 96 Q 200 110 256 96" stroke="rgba(0,0,0,0.28)" strokeWidth="1" fill="none" />
      {/* Highlight on the dome */}
      <path d="M 152 86 Q 150 58 190 52" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Visor — half-oval projecting forward (down on the SVG y-axis).
          Top edge tucks under the crown's front, both sides curve out
          and meet at the bottom centre — the classic 🧢 silhouette. */}
      <path
        d="M 142 100
           Q 200 92 258 100
           Q 264 130 200 134
           Q 136 130 142 100 Z"
        fill="url(#cap-visor-grad)"
        stroke="#0d2a70"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Visor underside shadow */}
      <path
        d="M 152 116 Q 200 132 248 116"
        stroke="rgba(0,0,0,0.40)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* Visor sheen on top */}
      <path
        d="M 158 102 Q 200 96 242 102"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Button on top of crown */}
      <circle cx="200" cy="50" r="3.8" fill="#ffd864" stroke="#0d2a70" strokeWidth="0.8" />
    </g>
  );
}

// Top hat — tall cylinder with a band, sitting on a wide flat brim.
function TopHat() {
  return (
    <g className="owl-deco owl-deco--tophat">
      <defs>
        <linearGradient id="tophat-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#2a2a36" />
          <stop offset="60%" stopColor="#0e0e16" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
      </defs>
      {/* Brim — wide ellipse hugging the head */}
      <ellipse cx="200" cy="106" rx="94" ry="12" fill="url(#tophat-grad)" stroke="#000" strokeWidth="1.1" />
      {/* Crown — tall trapezoid */}
      <path
        d="M 152 106
           L 158 14
           Q 200 6 242 14
           L 248 106 Z"
        fill="url(#tophat-grad)"
        stroke="#000"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Crown highlight */}
      <path d="M 168 22 L 174 102" stroke="rgba(255,255,255,0.20)" strokeWidth="1.7" />
      {/* Red ribbon band */}
      <path
        d="M 152 100
           Q 200 108 248 100
           L 248 86
           Q 200 94 152 86 Z"
        fill="#c43030"
        stroke="#7a1a1a"
        strokeWidth="1"
      />
      {/* Buckle */}
      <rect x="191" y="87" width="18" height="12" fill="#d4a948" stroke="#7a5a10" strokeWidth="1" />
      <rect x="195" y="91" width="10" height="4" fill="#7a5a10" />
    </g>
  );
}

// Royal crown — gold zigzag with three jewels, on a banded base.
function Crown() {
  return (
    <g className="owl-deco owl-deco--crown">
      <defs>
        <linearGradient id="crown-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ffe07a" />
          <stop offset="55%" stopColor="#f0b830" />
          <stop offset="100%" stopColor="#8a5a10" />
        </linearGradient>
      </defs>
      {/* Zigzag silhouette — wider + taller, 5 peaks for grandeur */}
      <path
        d="M 130 108
           L 142 64
           L 165 96
           L 182 50
           L 200 16
           L 218 50
           L 235 96
           L 258 64
           L 270 108 Z"
        fill="url(#crown-grad)"
        stroke="#5a3a08"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Base band */}
      <rect x="126" y="106" width="148" height="20" rx="4" fill="url(#crown-grad)" stroke="#5a3a08" strokeWidth="1.4" />
      {/* Base inner shadow */}
      <rect x="132" y="112" width="136" height="8" fill="rgba(122, 80, 12, 0.45)" />
      {/* Jewels at each peak */}
      <circle cx="142" cy="68" r="3.6" fill="#7ad97a" stroke="#1a5a1a" strokeWidth="0.6" />
      <circle cx="182" cy="54" r="4.4" fill="#ff5a6a" stroke="#7e1a1a" strokeWidth="0.7" />
      <circle cx="200" cy="24" r="6"   fill="#5fd0ff" stroke="#0a4a7a" strokeWidth="0.9" />
      <circle cx="218" cy="54" r="4.4" fill="#ff5a6a" stroke="#7e1a1a" strokeWidth="0.7" />
      <circle cx="258" cy="68" r="3.6" fill="#7ad97a" stroke="#1a5a1a" strokeWidth="0.6" />
      {/* Band jewels — three across */}
      <ellipse cx="170" cy="116" rx="6" ry="4.4" fill="#ff5a6a" stroke="#7e1a1a" strokeWidth="0.6" />
      <ellipse cx="200" cy="116" rx="7.5" ry="5.4" fill="#7ad97a" stroke="#1a5a1a" strokeWidth="0.7" />
      <ellipse cx="230" cy="116" rx="6" ry="4.4" fill="#5fd0ff" stroke="#0a4a7a" strokeWidth="0.6" />
      {/* Highlight glints */}
      <path d="M 140 76 L 144 92"  stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 197 32 L 201 60"  stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M 256 76 L 260 92"  stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

// ---------- WING AMULETS ----------
// All accept { x, y } so they can be placed on either wing slot. Each
// includes a soft halo so the gem reads against the dark wing.

function AmuletHalo({ x, y, color = 'rgba(255, 220, 130, 0.45)', r = 22 }) {
  return (
    <>
      <circle cx={x} cy={y} r={r + 6} fill="rgba(255, 240, 200, 0.20)" />
      <circle cx={x} cy={y} r={r} fill={color} />
    </>
  );
}

// Feather — curved rachis with barbs splayed out, gold-cream gradient.
function Feather({ x, y }) {
  const id = `feather-${x}`;
  return (
    <g transform={`translate(${x - 26} ${y - 26})`}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#fff3c0" />
          <stop offset="55%" stopColor="#f0c050" />
          <stop offset="100%" stopColor="#a86810" />
        </linearGradient>
      </defs>
      <AmuletHalo x={26} y={26} color="rgba(247, 201, 72, 0.45)" />
      {/* Vane — leaf-like outline */}
      <path
        d="M 26 4
           Q 50 18 44 38
           Q 38 52 26 52
           Q 14 52 8 38
           Q 2 18 26 4 Z"
        fill={`url(#${id})`}
        stroke="#7a4a08"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Central shaft (rachis) */}
      <path d="M 26 6 L 26 52" stroke="#7a4a08" strokeWidth="1.6" strokeLinecap="round" />
      {/* Barbs — diagonal hairs out from the shaft */}
      <g stroke="#a86810" strokeWidth="0.8" fill="none" strokeLinecap="round">
        <path d="M 26 14 L 18 12" /> <path d="M 26 14 L 34 12" />
        <path d="M 26 22 L 14 20" /> <path d="M 26 22 L 38 20" />
        <path d="M 26 30 L 12 30" /> <path d="M 26 30 L 40 30" />
        <path d="M 26 38 L 14 40" /> <path d="M 26 38 L 38 40" />
        <path d="M 26 46 L 18 48" /> <path d="M 26 46 L 34 48" />
      </g>
      {/* Quill tip */}
      <path d="M 26 52 L 26 60" stroke="#fff3c0" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

// Sparkle orb — purple/pink crystal ball with starbursts.
function Sparkle({ x, y }) {
  const id = `sparkle-${x}`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="#ffe0ff" />
          <stop offset="40%" stopColor="#d070ff" />
          <stop offset="100%" stopColor="#4a0e7a" />
        </radialGradient>
      </defs>
      {/* Outer aura */}
      <circle r="30" fill="rgba(208, 112, 255, 0.25)" />
      <circle r="22" fill={`url(#${id})`} stroke="#2a0848" strokeWidth="1.2" />
      {/* Specular highlight */}
      <ellipse cx="-7" cy="-9" rx="6" ry="4" fill="#ffffff" opacity="0.85" />
      <ellipse cx="6" cy="6" rx="3" ry="2" fill="#ffe0ff" opacity="0.55" />
      {/* Sparkle starbursts */}
      <g stroke="#fff3ff" strokeWidth="1.2" strokeLinecap="round">
        <path d="M 0 -30 L 0 -36" />
        <path d="M 0 30 L 0 36" />
        <path d="M -30 0 L -36 0" />
        <path d="M 30 0 L 36 0" />
      </g>
      <g fill="#fff3ff">
        <circle cx="-26" cy="-22" r="1.4" />
        <circle cx="24" cy="-24" r="1.6" />
        <circle cx="-22" cy="26" r="1.2" />
        <circle cx="26" cy="22" r="1.4" />
      </g>
    </g>
  );
}

// Crystal — faceted cut diamond, white/cyan.
function Crystal({ x, y }) {
  const idTop = `crys-top-${x}`;
  const idSide = `crys-side-${x}`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={idTop} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a8e8ff" />
        </linearGradient>
        <linearGradient id={idSide} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#7ec8e8" />
          <stop offset="100%" stopColor="#1e5a8a" />
        </linearGradient>
      </defs>
      {/* Halo */}
      <circle r="30" fill="rgba(168, 232, 255, 0.30)" />
      {/* Top crown facets */}
      <path d="M -22 -4 L -10 -14 L 10 -14 L 22 -4 L 0 -4 Z" fill={`url(#${idTop})`} stroke="#0e3a5a" strokeWidth="1" strokeLinejoin="round" />
      {/* Pavilion (bottom point) */}
      <path d="M -22 -4 L 22 -4 L 0 24 Z" fill={`url(#${idSide})`} stroke="#0e3a5a" strokeWidth="1" strokeLinejoin="round" />
      {/* Inner facet seams */}
      <path d="M -10 -4 L 0 24 M 10 -4 L 0 24 M -22 -4 L -10 -14 L 0 -4 L 10 -14 L 22 -4" stroke="#0e3a5a" strokeWidth="0.7" fill="none" />
      {/* Top sheen */}
      <path d="M -16 -6 L -6 -12 L -2 -6" stroke="#ffffff" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="6" cy="-10" r="1.2" fill="#ffffff" />
    </g>
  );
}

// Star — 5-point gold star with a comet trail.
function Star({ x, y }) {
  const id = `star-${x}`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={id} cx="40%" cy="35%" r="70%">
          <stop offset="0%"  stopColor="#fff3a0" />
          <stop offset="60%" stopColor="#f7c948" />
          <stop offset="100%" stopColor="#a86010" />
        </radialGradient>
      </defs>
      {/* Glow halo */}
      <circle r="28" fill="rgba(247, 201, 72, 0.30)" />
      {/* Comet trail */}
      <path
        d="M -18 14 Q -8 6 6 -4"
        stroke="rgba(255, 240, 160, 0.65)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M -22 18 Q -12 10 0 0"
        stroke="rgba(255, 240, 160, 0.35)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* 5-point star (centered) */}
      <path
        d="M 0 -22
           L 6 -7
           L 22 -7
           L 9 3
           L 14 18
           L 0 9
           L -14 18
           L -9 3
           L -22 -7
           L -6 -7 Z"
        fill={`url(#${id})`}
        stroke="#7a4a08"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Sheen */}
      <path d="M -3 -16 L 0 -4 L 3 -16" stroke="#fff8c8" strokeWidth="0.9" fill="none" />
    </g>
  );
}

const WING_COMPS = {
  feather: Feather,
  sparkle: Sparkle,
  crystal: Crystal,
  star:    Star
};

// Inline-SVG monocle worn over the right eye. Lens + thin gold rim,
// a small bead-cord clipping at the bottom hinting at the chain.
function Monocle() {
  return (
    <g className="owl-deco owl-deco--monocle">
      {/* Lens glass tint */}
      <circle cx="234" cy="172" r="30" fill="rgba(170, 210, 255, 0.15)"
              stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1" />
      {/* Gold rim (thicker) */}
      <circle cx="234" cy="172" r="30" fill="none" stroke="#d4a948" strokeWidth="3.5" />
      {/* Highlight on rim */}
      <path d="M 213 165 A 30 30 0 0 1 230 145" stroke="#fff3c0" strokeWidth="1.6" fill="none" />
      {/* Tiny knob at top */}
      <circle cx="234" cy="141" r="3" fill="#d4a948" stroke="#7a5a10" strokeWidth="0.6" />
      {/* Chain — small dotted curve dangling down */}
      <g fill="#d4a948">
        <circle cx="262" cy="200" r="1.2" />
        <circle cx="266" cy="210" r="1.2" />
        <circle cx="268" cy="220" r="1.2" />
        <circle cx="265" cy="230" r="1.2" />
      </g>
    </g>
  );
}
