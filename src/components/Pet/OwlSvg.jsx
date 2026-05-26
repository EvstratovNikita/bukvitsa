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

export function OwlSvg({ className = '' }) {
  return (
    <svg
      className={`owl-svg ${className}`.trim()}
      viewBox="0 0 400 360"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
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

        {/* ---- BEAK (hooked owl-style: narrow rounded top, curved tip pointing down) ---- */}
        <g>
          <path
            d="M 194 202
               Q 200 199 206 202
               Q 209 210 206 216
               Q 203 222 200 224
               Q 197 222 194 216
               Q 191 210 194 202 Z"
            fill="url(#owl-beak-grad)"
            stroke="#7a4400"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Highlight on top ridge */}
          <path d="M 197 204 Q 200 202 203 204" stroke="#ffe4a0" strokeWidth="0.7" fill="none" opacity="0.7" />
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
      </g>
    </svg>
  );
}
