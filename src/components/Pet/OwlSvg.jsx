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
const SLOT_POSITIONS = {
  head:   { x: 200, y: 50,  size: 110 }, // crown of the head
  eyes:   { x: 200, y: 178, size: 78  }, // straddles both eyes
  brooch: { x: 248, y: 230, size: 28  }, // small pin, right side of chest
  wingL:  { x: 80,  y: 250, size: 50  },
  wingR:  { x: 320, y: 250, size: 50  }
};

export function OwlSvg({ className = '', equipped = {} }) {
  const [jumping, setJumping] = useState(false);
  const cooldown = useRef(false);

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
        {/* ---- LEFT WING (behind body) — striations only, no floating tips ---- */}
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

          if (slot === 'eyes' && id === 'monocle') {
            return <Monocle key={slot} />;
          }

          const isWing = slot === 'wingL' || slot === 'wingR';
          return (
            <g key={slot} className={`owl-deco owl-deco--${slot}`}>
              {isWing && (
                <>
                  <circle cx={pos.x} cy={pos.y} r={pos.size * 0.55}
                          fill="rgba(255, 240, 200, 0.25)" />
                  <circle cx={pos.x} cy={pos.y} r={pos.size * 0.45}
                          fill="rgba(255, 220, 130, 0.45)" />
                </>
              )}
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
