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
        {/* ---- LEFT WING (behind body) ---- */}
        <g className="owl-wing owl-wing--l">
          <path
            d="M 140 195
               Q 70 180 30 220
               Q 10 260 45 295
               Q 95 305 135 280
               Q 145 240 140 195 Z"
            fill="url(#owl-wing-grad)"
          />
          {/* feather striations */}
          <g stroke="#5a4a32" strokeWidth="1.2" opacity="0.55" fill="none" strokeLinecap="round">
            <path d="M 60 225 Q 75 245 70 270" />
            <path d="M 80 215 Q 95 235 95 265" />
            <path d="M 100 210 Q 115 235 120 270" />
            <path d="M 45 250 Q 60 270 60 290" />
          </g>
          {/* feather tip highlights */}
          <g fill="#f0e4ca" opacity="0.4">
            <ellipse cx="55" cy="280" rx="6" ry="3" transform="rotate(-30 55 280)" />
            <ellipse cx="80" cy="295" rx="6" ry="3" transform="rotate(-15 80 295)" />
            <ellipse cx="110" cy="295" rx="6" ry="3" transform="rotate(0 110 295)" />
          </g>
        </g>

        {/* ---- RIGHT WING (behind body) ---- */}
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
          <g fill="#f0e4ca" opacity="0.4">
            <ellipse cx="345" cy="280" rx="6" ry="3" transform="rotate(30 345 280)" />
            <ellipse cx="320" cy="295" rx="6" ry="3" transform="rotate(15 320 295)" />
            <ellipse cx="290" cy="295" rx="6" ry="3" transform="rotate(0 290 295)" />
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

        {/* ---- EYES (large dark with shiny highlights) ---- */}
        <g>
          {/* Left */}
          <circle cx="160" cy="170" r="34" fill="url(#owl-eye-grad)" />
          <circle cx="160" cy="170" r="34" fill="none" stroke="#000" strokeWidth="1.4" opacity="0.5" />
          <ellipse cx="172" cy="156" rx="9" ry="7" fill="#ffffff" />
          <circle cx="150" cy="180" r="3" fill="#ffffff" opacity="0.7" />
          <circle cx="164" cy="186" r="1.6" fill="#ffffff" opacity="0.5" />

          {/* Right */}
          <circle cx="240" cy="170" r="34" fill="url(#owl-eye-grad)" />
          <circle cx="240" cy="170" r="34" fill="none" stroke="#000" strokeWidth="1.4" opacity="0.5" />
          <ellipse cx="252" cy="156" rx="9" ry="7" fill="#ffffff" />
          <circle cx="230" cy="180" r="3" fill="#ffffff" opacity="0.7" />
          <circle cx="244" cy="186" r="1.6" fill="#ffffff" opacity="0.5" />
        </g>

        {/* ---- BEAK (small triangle pointing down) ---- */}
        <g>
          <path
            d="M 188 200
               Q 200 196 212 200
               Q 208 218 200 222
               Q 192 218 188 200 Z"
            fill="url(#owl-beak-grad)"
            stroke="#7a4400"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d="M 195 207 Q 200 209 205 207" stroke="#7a4400" strokeWidth="0.9" fill="none" />
        </g>

        {/* ---- FEET ---- */}
        <g>
          {/* Left foot */}
          <ellipse cx="172" cy="305" rx="15" ry="7" fill="url(#owl-foot-grad)" stroke="#7a4408" strokeWidth="0.8" />
          <g stroke="#8a4a08" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M 162 309 L 158 320" />
            <path d="M 172 312 L 172 322" />
            <path d="M 182 309 L 186 320" />
          </g>
          {/* Right foot */}
          <ellipse cx="228" cy="305" rx="15" ry="7" fill="url(#owl-foot-grad)" stroke="#7a4408" strokeWidth="0.8" />
          <g stroke="#8a4a08" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M 218 309 L 214 320" />
            <path d="M 228 312 L 228 322" />
            <path d="M 238 309 L 242 320" />
          </g>
        </g>

        {/* ---- EYELIDS for blink (hidden by default, scaleY via CSS) ---- */}
        <g className="owl-eyelid">
          <ellipse cx="160" cy="170" rx="34" ry="34" fill="#d4c4a0" />
          <ellipse cx="240" cy="170" rx="34" ry="34" fill="#d4c4a0" />
        </g>
      </g>
    </svg>
  );
}
