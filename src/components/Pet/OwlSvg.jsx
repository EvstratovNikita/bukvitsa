// Hand-drawn vector owl, designed to match the cream-coloured baby owl PNG
// reference (round body, big black eyes with bright sparkles, small orange
// beak, two outspread feathered wings, orange feet).
//
// Layers, back to front:
//   wings (left + right, behind body)  → rotate around shoulder for "wiggle"
//   body                                → main cream-white blob
//   feather texture (subtle dots)
//   beak                                → small triangular orange shape
//   feet                                → two orange ovals + toes
//   eyes                                → black saucers + tiny white sparkles
//   eyelids                             → invisible by default, scaleY for blink
//
// Animations are driven entirely by classes on inner groups — CSS keyframes
// live in styles/index.css.
//
// Click anywhere on the owl → joyful jump animation (~700ms). Debounced:
// while jumping, further clicks are ignored.

import { useRef, useState } from 'react';
import { getDecoration } from '../../data/petDecorations.js';

const JUMP_MS = 700;

// Per-slot anchor for the emoji glyph rendered on the owl.
// Wing positions are centred on each wing's visual midpoint so amulets
// stay aligned with the wing during the flap / jump animation (they
// render INSIDE the wing group and inherit its transform).
const SLOT_POSITIONS = {
  head:   { x: 200, y: 50,  size: 110 }, // crown of the head
  eyes:   { x: 200, y: 178, size: 78  }, // straddles both eyes
  brooch: { x: 244, y: 256, size: 28  }, // small pin, mid-chest above lower wing edge
  wingL:  { x: 80,  y: 250, size: 50  },
  wingR:  { x: 320, y: 250, size: 50  }
};

export function OwlSvg({ className = '', equipped = {} }) {
  const [jumping, setJumping] = useState(false);
  const cooldown = useRef(false);

  // Build a wing-deco node by id; used inside each wing group so the
  // amulet rotates/lifts with the wing during the flap animation.
  const renderWingDeco = (slot, id) => {
    if (!id) return null;
    const d = getDecoration(id);
    const pos = SLOT_POSITIONS[slot];
    if (!d || !pos) return null;
    const Comp = WING_COMPS[id];
    if (Comp) {
      return (
        <g className={`owl-deco owl-deco--${slot} owl-deco--${id}`}>
          <Comp x={pos.x} y={pos.y} />
        </g>
      );
    }
    // Emoji fallback (unknown id) — keep the halo so it still pops.
    return (
      <g className={`owl-deco owl-deco--${slot}`}>
        <circle cx={pos.x} cy={pos.y} r={pos.size * 0.55} fill="rgba(255, 240, 200, 0.25)" />
        <circle cx={pos.x} cy={pos.y} r={pos.size * 0.45} fill="rgba(255, 220, 130, 0.45)" />
        <text x={pos.x} y={pos.y} fontSize={pos.size} textAnchor="middle" dominantBaseline="central">
          {d.icon}
        </text>
      </g>
    );
  };

  const onClick = () => {
    if (cooldown.current) return;
    cooldown.current = true;
    setJumping(true);
    setTimeout(() => {
      setJumping(false);
      cooldown.current = false;
    }, JUMP_MS);
  };

  return (
    <svg
      className={`owl-svg ${jumping ? 'owl-svg--jump ' : ''}${className}`.trim()}
      viewBox="0 0 400 360"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      role="button"
      aria-label="Букля"
    >
      <defs>
        <radialGradient id="owl-body-grad" cx="50%" cy="35%" r="70%">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1e8d4" />
          <stop offset="100%" stopColor="#9a8868" />
        </radialGradient>
        <radialGradient id="owl-belly-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8dcc0" />
        </radialGradient>
        <radialGradient id="owl-wing-grad" cx="50%" cy="40%" r="75%">
          <stop offset="0%"  stopColor="#e8dcc0" />
          <stop offset="55%" stopColor="#b8a484" />
          <stop offset="100%" stopColor="#5a4a32" />
        </radialGradient>
        <radialGradient id="owl-eye-grad" cx="40%" cy="35%" r="70%">
          <stop offset="0%"  stopColor="#4a3a55" />
          <stop offset="60%" stopColor="#1a1020" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <linearGradient id="owl-beak-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ffd066" />
          <stop offset="55%" stopColor="#f0931a" />
          <stop offset="100%" stopColor="#a85a08" />
        </linearGradient>
        <linearGradient id="owl-foot-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ffc870" />
          <stop offset="100%" stopColor="#c87018" />
        </linearGradient>
        <filter id="owl-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.5" />
          <feOffset dx="0" dy="5" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#owl-shadow)">
        {/* ---- LEFT WING (behind body) — striations only, no floating tips.
             Amulet rendered INSIDE this group so it moves with the wing
             during the flap / jump animation. */}
        <g className="owl-wing owl-wing--l">
          <path
            d="M 140 195
               Q 70 180 30 220
               Q 10 260 45 295
               Q 95 305 135 280
               Q 145 240 140 195 Z"
            fill="url(#owl-wing-grad)"
          />
          <g stroke="#5a4a32" strokeWidth="1.2" opacity="0.55" fill="none" strokeLinecap="round">
            <path d="M 60 225 Q 75 245 70 270" />
            <path d="M 80 215 Q 95 235 95 265" />
            <path d="M 100 210 Q 115 235 120 270" />
            <path d="M 45 250 Q 60 270 60 290" />
          </g>
          {renderWingDeco('wingL', equipped.wingL)}
        </g>

        {/* ---- RIGHT WING ---- */}
        <g className="owl-wing owl-wing--r">
          <path
            d="M 260 195
               Q 330 180 370 220
               Q 390 260 355 295
               Q 305 305 265 280
               Q 255 240 260 195 Z"
            fill="url(#owl-wing-grad)"
          />
          <g stroke="#5a4a32" strokeWidth="1.2" opacity="0.55" fill="none" strokeLinecap="round">
            <path d="M 340 225 Q 325 245 330 270" />
            <path d="M 320 215 Q 305 235 305 265" />
            <path d="M 300 210 Q 285 235 280 270" />
            <path d="M 355 250 Q 340 270 340 290" />
          </g>
          {renderWingDeco('wingR', equipped.wingR)}
        </g>

        {/* ---- MAIN BODY ---- */}
        <ellipse cx="200" cy="195" rx="108" ry="118" fill="url(#owl-body-grad)" />

        {/* Belly highlight — slightly brighter centre */}
        <ellipse cx="200" cy="225" rx="60" ry="70" fill="url(#owl-belly-grad)" opacity="0.7" />

        {/* Subtle feather speckle texture on sides */}
        <g fill="#c9b896" opacity="0.35">
          <ellipse cx="130" cy="180" rx="3.5" ry="2" />
          <ellipse cx="125" cy="210" rx="4"   ry="2" />
          <ellipse cx="135" cy="240" rx="3.5" ry="2" />
          <ellipse cx="150" cy="260" rx="4"   ry="2" />
          <ellipse cx="270" cy="180" rx="3.5" ry="2" />
          <ellipse cx="275" cy="210" rx="4"   ry="2" />
          <ellipse cx="265" cy="240" rx="3.5" ry="2" />
          <ellipse cx="250" cy="260" rx="4"   ry="2" />
          <ellipse cx="200" cy="125" rx="3"   ry="1.8" />
          <ellipse cx="185" cy="118" rx="2.5" ry="1.5" />
          <ellipse cx="215" cy="118" rx="2.5" ry="1.5" />
        </g>

        {/* ---- EAR TUFTS ----
             Two solid pointed tufts sitting ON the head crown, tilted outward
             (like the reference). Same cream gradient as the body so the base
             blends seamlessly into the head; the tip rises above the silhouette
             with a soft outline. */}
        <g className="owl-tufts" stroke="#c2b08c" strokeWidth="2" strokeLinejoin="round">
          {/* Left tuft — tip up-left */}
          <path d="M 150 104 Q 138 72 146 40 Q 168 60 184 100 Q 168 110 150 104 Z" fill="url(#owl-body-grad)" />
          {/* Right tuft — tip up-right */}
          <path d="M 250 104 Q 262 72 254 40 Q 232 60 216 100 Q 232 110 250 104 Z" fill="url(#owl-body-grad)" />
          {/* Inner shading streak for a soft feathered tip */}
          <path d="M 152 100 Q 146 74 150 48" stroke="#cbb897" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round" />
          <path d="M 248 100 Q 254 74 250 48" stroke="#cbb897" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round" />
        </g>

        {/* ---- FACIAL DISC (rings around eyes, like a real owl) ---- */}
        <g fill="none">
          <circle cx="166" cy="172" r="35" stroke="#d8c7a2" strokeWidth="3.5" opacity="0.75" />
          <circle cx="234" cy="172" r="35" stroke="#d8c7a2" strokeWidth="3.5" opacity="0.75" />
          {/* faint inner disc tint */}
          <circle cx="166" cy="172" r="33" stroke="#fff6e2" strokeWidth="1.4" opacity="0.5" />
          <circle cx="234" cy="172" r="33" stroke="#fff6e2" strokeWidth="1.4" opacity="0.5" />
        </g>

        {/* ---- CHEEK BLUSH ---- */}
        <g>
          <ellipse cx="146" cy="206" rx="13" ry="8" fill="#ffb3c2" opacity="0.4" />
          <ellipse cx="254" cy="206" rx="13" ry="8" fill="#ffb3c2" opacity="0.4" />
        </g>

        {/* ---- EYES (smaller, more proportionate) ---- */}
        <g>
          {/* Left */}
          <circle cx="166" cy="172" r="26" fill="url(#owl-eye-grad)" />
          <circle cx="166" cy="172" r="26" fill="none" stroke="#000" strokeWidth="1.2" opacity="0.5" />
          <ellipse cx="175" cy="162" rx="7" ry="5.5" fill="#ffffff" />
          <circle cx="158" cy="180" r="2.4" fill="#ffffff" opacity="0.7" />

          {/* Right */}
          <circle cx="234" cy="172" r="26" fill="url(#owl-eye-grad)" />
          <circle cx="234" cy="172" r="26" fill="none" stroke="#000" strokeWidth="1.2" opacity="0.5" />
          <ellipse cx="243" cy="162" rx="7" ry="5.5" fill="#ffffff" />
          <circle cx="226" cy="180" r="2.4" fill="#ffffff" opacity="0.7" />
        </g>

        {/* ---- BEAK + SMILE ----
             Layout (y axis, shifted down +6 vs prev for a friendlier face):
               205-219 upper beak
               219-236 mouth (wide visible smile)
               232-239 lower beak */}
        <g>
          {/* Mouth interior */}
          <path
            d="M 184 219
               Q 200 238 216 219
               Q 208 234 200 236
               Q 192 234 184 219 Z"
            fill="#2a0808"
          />
          {/* Tongue glint */}
          <ellipse cx="200" cy="228" rx="8" ry="3" fill="#c44048" opacity="0.85" />

          {/* Upper beak — lowered */}
          <path
            d="M 190 205
               Q 200 201 210 205
               Q 207 217 200 219
               Q 193 217 190 205 Z"
            fill="url(#owl-beak-grad)"
            stroke="#7a4400"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d="M 196 207 Q 200 205 204 207" stroke="#ffe4a0" strokeWidth="0.7" fill="none" opacity="0.7" />

          {/* Lower beak */}
          <path
            d="M 194 232
               Q 200 235 206 232
               Q 204 238 200 239
               Q 196 238 194 232 Z"
            fill="url(#owl-beak-grad)"
            stroke="#7a4400"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Smile line — thicker stroke from corner to corner */}
          <path
            d="M 184 219 Q 200 236 216 219"
            stroke="#2a0808"
            strokeWidth="3.6"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* ---- FEET (chicken-style: 3 forward toes + 1 back, with claw tips) ---- */}
        {/* Left leg */}
        <g>
          {/* Leg stub */}
          <path d="M 172 290 L 172 305" stroke="#c87018" strokeWidth="6" strokeLinecap="round" />
          {/* Foot toes — 3 forward splayed + 1 back */}
          <g stroke="#c87018" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M 172 305 L 160 320" />   {/* outer-left toe */}
            <path d="M 172 305 L 172 322" />   {/* middle toe */}
            <path d="M 172 305 L 184 320" />   {/* outer-right toe */}
            <path d="M 172 305 L 167 315" />   {/* back toe (short) */}
          </g>
          {/* Tiny claw tips */}
          <g stroke="#6a3408" strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M 159 320 L 156 322" />
            <path d="M 172 322 L 172 325" />
            <path d="M 185 320 L 188 322" />
          </g>
        </g>
        {/* Right leg (mirror) */}
        <g>
          <path d="M 228 290 L 228 305" stroke="#c87018" strokeWidth="6" strokeLinecap="round" />
          <g stroke="#c87018" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M 228 305 L 216 320" />
            <path d="M 228 305 L 228 322" />
            <path d="M 228 305 L 240 320" />
            <path d="M 228 305 L 233 315" />
          </g>
          <g stroke="#6a3408" strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M 215 320 L 212 322" />
            <path d="M 228 322 L 228 325" />
            <path d="M 241 320 L 244 322" />
          </g>
        </g>

        {/* ---- EYELIDS for blink (hidden by default) ---- */}
        <g className="owl-eyelid">
          <ellipse cx="166" cy="172" rx="26" ry="26" fill="#d4c4a0" />
          <ellipse cx="234" cy="172" rx="26" ry="26" fill="#d4c4a0" />
        </g>

        {/* ---- EQUIPPED DECORATIONS ----
             Wing items get a bright halo so the emoji reads against the
             dark wing. Monocle has a custom inline-SVG renderer (lens +
             chain) so we don't fall back to the 🧐 face emoji. */}
        {Object.entries(equipped).map(([slot, id]) => {
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

          // Wing slots are rendered INSIDE the wing groups above so
          // they inherit the flap transform. Skip them here.
          if (slot === 'wingL' || slot === 'wingR') return null;

          return (
            <g key={slot} className={`owl-deco owl-deco--${slot}`}>
              <text
                x={pos.x}
                y={pos.y}
                fontSize={pos.size}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {d.icon}
              </text>
            </g>
          );
        })}
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
