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

import { useId, useRef, useState, memo } from 'react';
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
      <g>
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
  return (
    <g>
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
    </g>
  );
}

// Сомкнутое веко. Лежит в своём слое-div (owl-lids), моргание — прозрачность
// и сжатие этого слоя: видеокарта, без перерисовки SVG.
function EyeLid({ cx, cy, uid }) {
  const r = EYE_RAD;
  const clip = `${uid}-lid-${cx}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <circle cx={cx} cy={cy} r={r + 0.5} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g>
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

function OwlSvgView({ className = '', equipped = {}, perch = false }) {
  const [jumping, setJumping] = useState(false);
  const cooldown = useRef(false);
  // Gradient ids must be unique per instance, otherwise a second owl on the
  // page re-points the first one's fills at its own defs. Наряды тоже: из
  // главного меню сова меню остаётся в DOM (content-visibility: hidden), и
  // шапка в экране Букли брала её невидимый градиент — рисовался один контур.
  // Градиент наряда лежит в самом наряде (в той же <svg>), id — с uid.
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
      if (id === 'hw-batglasses') return <BatGlasses key={slot} />;
    }
    if (slot === 'head') {
      if (id === 'bow')      return <Bow key={slot} uid={uid} />;
      if (id === 'academic') return <Academic key={slot} uid={uid} />;
      if (id === 'cap')      return <Cap key={slot} uid={uid} />;
      if (id === 'tophat')   return <TopHat key={slot} uid={uid} />;
      if (id === 'crown')    return <Crown key={slot} uid={uid} />;
      if (id === 'hw-witchhat') return <WitchHat key={slot} uid={uid} />;
    }
    if (slot === 'brooch' && id === 'hw-pumpkin') return <PumpkinBrooch key={slot} uid={uid} />;
    if (slot === 'wingL' || slot === 'wingR') {
      const wp = WING_SLOT_POS[slot];
      const fit = `translate(${wp.x} ${wp.y}) scale(${WING_SLOT_SCALE}) translate(${-wp.x} ${-wp.y})`;
      const Comp = WING_COMPS[id];
      return (
        <g key={slot} className={`owl-deco owl-deco--${slot} owl-deco--${id}`} transform={fit}>
          {Comp ? <Comp x={wp.x} y={wp.y} uid={uid} /> : (
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

  // Стопка слоёв одного размера: снизу неподвижные ветка и тень, сверху
  // птица. Всё, что движется (прыжок, дыхание, крылья, голова, уши, веки,
  // искры), — transform и opacity слоёв-div: их делает видеокарта, SVG
  // рисуется один раз. Анимация внутри SVG перерисовывала бы его каждый
  // кадр — на телефоне это съедало главный поток и тормозило нажатия.
  return (
    <div
      className={`owl ${jumping ? 'owl--jump ' : ''}${className}`.trim()}
      onClick={onClick}
      role="button"
      aria-label="Букля"
    >
      <svg className="owl-svg owl-svg--base" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-contact`}>
            <stop offset="0%"   stopColor="var(--owl-contact)" />
            <stop offset="55%"  stopColor="var(--owl-contact)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--owl-contact)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-branch`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#8a6034" />
            <stop offset="45%"  stopColor="#5f3e1f" />
            <stop offset="100%" stopColor="#3a2412" />
          </linearGradient>
        </defs>

        {/* contact shadow */}
        <ellipse cx="200" cy="378" rx="126" ry="20" fill={`url(#${uid}-contact)`} />

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
      </svg>

      {/* Всё, что отрывается от ветки при прыжке. Подвижные части — отдельные
          слои-div (крылья, голова вместе с телом, уши): их поворачивает
          видеокарта, SVG внутри не перерисовывается. Моргание и искры — тоже
          слои; внутри SVG совы ничего не анимируется.
          Все слои — один и тот же кадр 400×400, точки вращения в CSS заданы
          в процентах этого кадра. Градиенты объявлены в слое тела, остальные
          слои ссылаются на них по id (в пределах документа это работает). */}
      <div className="owl-hop">
      <div className="owl-breathe">
        <div className="owl-part owl-wing owl-wing--l">
          <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><Wing side={-1} uid={uid} /></svg>
        </div>
        <div className="owl-part owl-wing owl-wing--r">
          <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><Wing side={1} uid={uid} /></svg>
        </div>
        {/* wing amulets sit outside the head so they don't sway */}
        {(equipped.wingL || equipped.wingR) && (
          <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {renderSlot('wingL')}
            {renderSlot('wingR')}
          </svg>
        )}

        <div className="owl-part owl-head">
          {/* ear tufts, behind the body so their base blends in */}
          <div className="owl-part owl-tuft owl-tuft--l">
            <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g>
                <path
                  d="M 122 122 q -14 -46 -2 -80 q 8 -6 14 2 q 20 34 38 76 q -26 14 -50 2 Z"
                  fill={`url(#${uid}-body)`}
                  stroke="#c9ad82"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M 126 114 q -8 -34 0 -60" stroke="#b8996c" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
              </g>
            </svg>
          </div>
          <div className="owl-part owl-tuft owl-tuft--r">
            <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g>
                <path
                  d="M 278 122 q 14 -46 2 -80 q -8 -6 -14 2 q -20 34 -38 76 q 26 14 50 2 Z"
                  fill={`url(#${uid}-body)`}
                  stroke="#c9ad82"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M 274 114 q 8 -34 0 -60" stroke="#b8996c" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          <svg className="owl-svg owl-svg--bird" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
              <clipPath id={`${uid}-clip-body`}>
                <path d={BODY_SHAPE} />
              </clipPath>
              {/* Мягкие пятна — градиентами, не SVG-фильтрами. Части совы
                  шевелятся, и SVG перерисовывается каждый кадр; размытия
                  (feGaussianBlur/feDropShadow) при этом пересчитывались заново,
                  и на iPhone прыжок дёргался, а нажатия запаздывали. Тень от
                  всей совы — CSS drop-shadow на слое (см. index.css). */}
              <radialGradient id={`${uid}-blush`}>
                <stop offset="0%"   stopColor="#ff9fb0" />
                <stop offset="100%" stopColor="#ff9fb0" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#8a6a42" stopOpacity="0" />
                <stop offset="100%" stopColor="#8a6a42" />
              </linearGradient>
            </defs>
            <path d={BODY_SHAPE} fill={`url(#${uid}-body)`} stroke="var(--owl-edge)" strokeWidth="1.6" />

            {/* Side shading, clipped by the silhouette so it never spills
                past the body's right edge into the seam with the wing. */}
            <g clipPath={`url(#${uid}-clip-body)`}>
              <path
                d="M 200 62 C 274 62 312 122 310 194 C 308 274 264 330 200 330 q 46 -132 0 -268 Z"
                fill={`url(#${uid}-side)`}
                opacity="0.12"
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
              <ellipse cx="132" cy="212" rx="27" ry="18" fill={`url(#${uid}-blush)`} opacity="0.55" />
              <ellipse cx="268" cy="212" rx="27" ry="18" fill={`url(#${uid}-blush)`} opacity="0.55" />
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
          </svg>

          {/* Моргание и искры — тоже слои-div: анимируются только прозрачность
              и transform слоя, SVG внутри нарисован один раз. */}
          <div className="owl-part owl-lids">
            <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <EyeLid cx={EYE_L} cy={EYE_Y} uid={uid} />
              <EyeLid cx={EYE_R} cy={EYE_Y} uid={uid} />
            </svg>
          </div>
          <div className="owl-part owl-spark owl-spark--1">
            <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 96 132 l 3.4 8.6 8.6 3.4 -8.6 3.4 -3.4 8.6 -3.4 -8.6 -8.6 -3.4 8.6 -3.4 Z" fill="#ffe6a8" /></svg>
          </div>
          <div className="owl-part owl-spark owl-spark--2">
            <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 306 108 l 2.8 7 7 2.8 -7 2.8 -2.8 7 -2.8 -7 -7 -2.8 7 -2.8 Z" fill="#ffe6a8" /></svg>
          </div>
          <div className="owl-part owl-spark owl-spark--3">
            <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 318 214 l 2.2 5.6 5.6 2.2 -5.6 2.2 -2.2 5.6 -2.2 -5.6 -5.6 -2.2 5.6 -2.2 Z" fill="#ffe6a8" /></svg>
          </div>

          <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
          </svg>
        </div>
      </div>

      {/* feet — drawn over the perch so the toes grip it */}
      <svg className="owl-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
      </svg>
      </div>
    </div>
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
function Bow({ uid }) {
  return (
    <g className="owl-deco owl-deco--bow">
      <defs>
        <linearGradient id={`${uid}-bow-grad`} x1="0" x2="0" y1="0" y2="1">
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
        fill={`url(#${uid}-bow-grad)`}
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
        fill={`url(#${uid}-bow-grad)`}
        stroke="#7e1a4a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Left tail */}
      <path
        d="M 188 95
           L 176 122
           L 192 110 Z"
        fill={`url(#${uid}-bow-grad)`}
        stroke="#7e1a4a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Right tail */}
      <path
        d="M 212 95
           L 224 122
           L 208 110 Z"
        fill={`url(#${uid}-bow-grad)`}
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
function Academic({ uid }) {
  return (
    <g className="owl-deco owl-deco--academic">
      <defs>
        <linearGradient id={`${uid}-academic-grad`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#5a78d0" />
          <stop offset="55%" stopColor="#2840a8" />
          <stop offset="100%" stopColor="#0e1c5e" />
        </linearGradient>
        <linearGradient id={`${uid}-academic-band-grad`} x1="0" x2="0" y1="0" y2="1">
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
        fill={`url(#${uid}-academic-band-grad)`}
        stroke="#0a1450"
        strokeWidth="1.3"
      />
      {/* Mortarboard — wider parallelogram (slight tilt) */}
      <path
        d="M 200 28
           L 290 78
           L 200 102
           L 110 78 Z"
        fill={`url(#${uid}-academic-grad)`}
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
function Cap({ uid }) {
  return (
    <g className="owl-deco owl-deco--cap">
      <defs>
        <linearGradient id={`${uid}-cap-grad`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#4a8cff" />
          <stop offset="100%" stopColor="#1c4abf" />
        </linearGradient>
        <linearGradient id={`${uid}-cap-visor-grad`} x1="0" x2="0" y1="0" y2="1">
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
        fill={`url(#${uid}-cap-grad)`}
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
        fill={`url(#${uid}-cap-visor-grad)`}
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
function TopHat({ uid }) {
  return (
    <g className="owl-deco owl-deco--tophat">
      <defs>
        <linearGradient id={`${uid}-tophat-grad`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#2a2a36" />
          <stop offset="60%" stopColor="#0e0e16" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
      </defs>
      {/* Brim — wide ellipse hugging the head */}
      <ellipse cx="200" cy="106" rx="94" ry="12" fill={`url(#${uid}-tophat-grad)`} stroke="#000" strokeWidth="1.1" />
      {/* Crown — tall trapezoid */}
      <path
        d="M 152 106
           L 158 14
           Q 200 6 242 14
           L 248 106 Z"
        fill={`url(#${uid}-tophat-grad)`}
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
function Crown({ uid }) {
  return (
    <g className="owl-deco owl-deco--crown">
      <defs>
        <linearGradient id={`${uid}-crown-grad`} x1="0" x2="0" y1="0" y2="1">
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
        fill={`url(#${uid}-crown-grad)`}
        stroke="#5a3a08"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Base band */}
      <rect x="126" y="106" width="148" height="20" rx="4" fill={`url(#${uid}-crown-grad)`} stroke="#5a3a08" strokeWidth="1.4" />
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
function Feather({ x, y, uid }) {
  const id = `${uid}-feather`;
  return (
    <g transform={`translate(${x - 26} ${y - 26})`}>
      <defs>
        <linearGradient id={`${uid}-feather`} x1="0" x2="0" y1="0" y2="1">
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
function Sparkle({ x, y, uid }) {
  const id = `${uid}-sparkle`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={`${uid}-sparkle`} cx="35%" cy="30%" r="70%">
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
function Crystal({ x, y, uid }) {
  const idTop = `${uid}-crys-top`;
  const idSide = `${uid}-crys-side`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={`${uid}-crys-top`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a8e8ff" />
        </linearGradient>
        <linearGradient id={`${uid}-crys-side`} x1="0" x2="0" y1="0" y2="1">
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
function Star({ x, y, uid }) {
  const id = `${uid}-star`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={`${uid}-star`} cx="40%" cy="35%" r="70%">
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

// ---------- ХЭЛЛОУИН 2026 (награды ленты «Ночи тыкв») ----------
// Рисуются в том же старом пространстве координат, что и обычные наряды.
// Свечение — полупрозрачными кругами, без SVG-фильтров: фильтры на слоях
// совы мерцали под размытием модалок.

// Шляпа ведьмы — высокий конус с заломленным кончиком, широкие поля,
// тыквенная лента с золотой пряжкой и пара звёздочек.
function WitchHat({ uid }) {
  return (
    <g className="owl-deco owl-deco--hw-witchhat">
      <defs>
        <linearGradient id={`${uid}-hw-hat-grad`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%"  stopColor="#6a3fa0" />
          <stop offset="50%" stopColor="#331a52" />
          <stop offset="100%" stopColor="#140a22" />
        </linearGradient>
        <linearGradient id={`${uid}-hw-hat-brim`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#4a2a72" />
          <stop offset="100%" stopColor="#170b26" />
        </linearGradient>
      </defs>
      {/* Поля */}
      <ellipse cx="200" cy="104" rx="108" ry="15" fill={`url(#${uid}-hw-hat-brim)`} stroke="#0b0612" strokeWidth="1.4" />
      <path d="M 100 102 Q 200 92 300 102" stroke="rgba(190, 150, 255, 0.35)" strokeWidth="1.6" fill="none" />
      {/* Конус с заломом кончика вправо */}
      <path
        d="M 150 104
           C 162 80 176 54 190 34
           C 198 22 210 12 226 12
           C 240 12 252 20 260 34
           C 248 27 236 27 228 33
           C 224 58 238 84 250 104 Z"
        fill={`url(#${uid}-hw-hat-grad)`}
        stroke="#0b0612"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Блик по левому склону */}
      <path d="M 166 94 C 174 72 184 54 196 38" stroke="rgba(255,255,255,0.18)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Лента */}
      <path
        d="M 152 100
           Q 200 109 249 100
           L 244 85
           Q 200 93 158 85 Z"
        fill="#ff8a1f"
        stroke="#8a3a06"
        strokeWidth="1"
      />
      <path d="M 158 88 Q 200 96 244 88" stroke="#ffc27a" strokeWidth="1.2" fill="none" opacity="0.7" />
      {/* Пряжка */}
      <rect x="189" y="85.5" width="22" height="15" rx="2.5" fill="none" stroke="#f7c948" strokeWidth="3" />
      <rect x="196" y="90" width="8" height="6" fill="#f7c948" />
      {/* Звёздочки */}
      <path d="M 184 58 l 2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2 Z" fill="#ffd36b" />
      <path d="M 214 40 l 1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z" fill="#ffd36b" opacity="0.85" />
      <circle cx="252" cy="31" r="2.4" fill="#ffd36b" />
    </g>
  );
}

// Очки «Летучие мыши» — тёплые оранжевые линзы, оправа с перепончатыми
// крылышками у висков и крошечными ушками на переносице.
function BatGlasses() {
  const wing = 'M 137 160 C 126 148 112 139 92 134 C 98 143 98 151 94 158 C 102 156 108 160 110 167 C 116 162 124 164 128 171 C 131 173 134 175 137 177 Z';
  return (
    <g className="owl-deco owl-deco--hw-batglasses">
      <circle cx="166" cy="172" r="30" fill="rgba(255, 138, 31, 0.22)" />
      <circle cx="234" cy="172" r="30" fill="rgba(255, 138, 31, 0.22)" />
      {/* Крылья — левое и зеркальное правое */}
      <g fill="#2a1438" stroke="#12081c" strokeWidth="1.2" strokeLinejoin="round">
        <path d={wing} />
        <path d={wing} transform="translate(400 0) scale(-1 1)" />
      </g>
      <g stroke="rgba(255, 150, 60, 0.55)" strokeWidth="1" fill="none" strokeLinecap="round">
        <path d="M 134 162 L 100 140" /><path d="M 133 166 L 106 156" />
        <path d="M 266 162 L 300 140" /><path d="M 267 166 L 294 156" />
      </g>
      {/* Оправа */}
      <circle cx="166" cy="172" r="30" fill="none" stroke="#2a1438" strokeWidth="4" />
      <circle cx="234" cy="172" r="30" fill="none" stroke="#2a1438" strokeWidth="4" />
      <circle cx="166" cy="172" r="27.5" fill="none" stroke="#ff8a1f" strokeWidth="1" opacity="0.6" />
      <circle cx="234" cy="172" r="27.5" fill="none" stroke="#ff8a1f" strokeWidth="1" opacity="0.6" />
      {/* Переносица с ушками */}
      <path d="M 196 172 Q 200 166 204 172" stroke="#2a1438" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 196.5 168 L 197.5 161 L 200 165.5 L 202.5 161 L 203.5 168 Z" fill="#2a1438" />
      {/* Блики */}
      <path d="M 148 160 A 30 30 0 0 1 162 145" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" />
      <path d="M 216 160 A 30 30 0 0 1 230 145" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" fill="none" />
    </g>
  );
}

// Брошь «Тыквочка» — тыковка-фонарь с хвостиком и листиком; глаза и рот
// светятся изнутри.
function PumpkinBrooch({ uid }) {
  return (
    <g className="owl-deco owl-deco--hw-pumpkin" transform="translate(244 256)">
      <defs>
        <radialGradient id={`${uid}-hw-pumpkin-grad`} cx="38%" cy="32%" r="75%">
          <stop offset="0%"  stopColor="#ffc06a" />
          <stop offset="55%" stopColor="#f07a12" />
          <stop offset="100%" stopColor="#a8410a" />
        </radialGradient>
      </defs>
      <circle r="21" fill="rgba(255, 170, 60, 0.26)" />
      <ellipse cx="-6.5" cy="1" rx="8.5" ry="10.5" fill={`url(#${uid}-hw-pumpkin-grad)`} stroke="#7a3204" strokeWidth="1" />
      <ellipse cx="6.5" cy="1" rx="8.5" ry="10.5" fill={`url(#${uid}-hw-pumpkin-grad)`} stroke="#7a3204" strokeWidth="1" />
      <ellipse cx="0" cy="0.5" rx="8" ry="11.5" fill={`url(#${uid}-hw-pumpkin-grad)`} stroke="#7a3204" strokeWidth="1" />
      {/* Лицо */}
      <g fill="#ffe08a">
        <path d="M -5.5 -2.5 L -2.5 -2.5 L -4 -5.5 Z" />
        <path d="M 2.5 -2.5 L 5.5 -2.5 L 4 -5.5 Z" />
        <path d="M -5 2.5 L -3 4.5 L -1 3 L 1 4.5 L 3 3 L 5 2.5 Q 0 8 -5 2.5 Z" />
      </g>
      {/* Хвостик и листик */}
      <path d="M -0.5 -11 Q 0 -15.5 3 -17.5" stroke="#4f7a2a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M 1 -13 Q 8 -17 11 -12 Q 5 -10 1 -13 Z" fill="#7bbf4a" stroke="#3d6a20" strokeWidth="0.6" />
      <ellipse cx="-4" cy="-5" rx="2.6" ry="1.4" transform="rotate(-30 -4 -5)" fill="#ffffff" opacity="0.35" />
    </g>
  );
}

// Ведьмин фонарик — кованый фонарь со свечой, тёплое стекло и ореол.
function Lantern({ x, y, uid }) {
  const id = `${uid}-hw-lantern`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <radialGradient id={`${uid}-hw-lantern`} cx="50%" cy="55%" r="65%">
          <stop offset="0%"  stopColor="#fff6c8" />
          <stop offset="45%" stopColor="#ffb84a" />
          <stop offset="100%" stopColor="#d9621a" />
        </radialGradient>
      </defs>
      <circle r="31" fill="rgba(255, 170, 60, 0.24)" />
      <circle r="21" fill="rgba(255, 200, 110, 0.22)" />
      {/* Дужка и крышка */}
      <path d="M -7 -24 Q 0 -33 7 -24" stroke="#2a1a10" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M -13 -17 L 13 -17 L 8 -24 L -8 -24 Z" fill="#2a1a10" />
      {/* Стекло */}
      <rect x="-11" y="-17" width="22" height="29" rx="3" fill={`url(#${id})`} stroke="#2a1a10" strokeWidth="2" />
      <g stroke="#2a1a10" strokeWidth="1.3" opacity="0.75">
        <path d="M -4 -17 L -4 12" /><path d="M 4 -17 L 4 12" />
      </g>
      {/* Огонёк */}
      <path d="M 0 -10 C 4.5 -4 4.5 2 0 4.5 C -4.5 2 -4.5 -4 0 -10 Z" fill="#fffbe6" />
      <path d="M 0 -4 C 2 -1 2 2 0 3 C -2 2 -2 -1 0 -4 Z" fill="#ffb84a" />
      {/* Основание и лиловая ленточка */}
      <rect x="-13" y="11" width="26" height="5.5" rx="1.6" fill="#2a1a10" />
      <path d="M 7 -24 q 6 2 8 8 q -5 -1 -8 -3 Z" fill="#8b5cf6" stroke="#4a2a8a" strokeWidth="0.6" />
    </g>
  );
}

const WING_COMPS = {
  feather: Feather,
  sparkle: Sparkle,
  crystal: Crystal,
  star:    Star,
  'hw-lantern': Lantern
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

// Большая SVG-сова (сотни узлов): перерисовываем только при смене наряда.
export const OwlSvg = memo(OwlSvgView);
