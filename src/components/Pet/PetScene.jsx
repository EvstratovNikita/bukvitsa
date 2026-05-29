import { OwlSvg } from './OwlSvg.jsx';

// Pet scene — tree hollow at dusk with the egg / owl inside.
//
// Modes:
//   'egg'      — static egg sitting in the nest
//   'hatching' — wobble → crack → split → owl reveal (~3.2s)
//   'owl'      — settled owl (PNG illustration, CSS idle animations)
//
// Tree/sky/hollow/egg are still inline SVG; the owl itself is the rendered
// PNG asset overlaid on top of the SVG, animated via CSS transforms.

export function PetScene({ mode = 'owl', equipped = {} }) {
  return (
    <div className={`pet-scene pet-scene--${mode}`}>
      <svg
        className="pet-scene__svg"
        viewBox="0 0 400 360"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Backdrop + tree gradients */}
          <linearGradient id="ps-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"  stopColor="#1a2138" />
            <stop offset="100%" stopColor="#0c1020" />
          </linearGradient>
          <linearGradient id="ps-tree" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="#3b2412" />
            <stop offset="50%"  stopColor="#5a3a1f" />
            <stop offset="100%" stopColor="#3b2412" />
          </linearGradient>
          <radialGradient id="ps-hollow" cx="50%" cy="55%" r="55%">
            <stop offset="0%"   stopColor="#1e1408" />
            <stop offset="100%" stopColor="#06030a" />
          </radialGradient>
          <radialGradient id="ps-egg" cx="38%" cy="26%" r="82%">
            <stop offset="0%"   stopColor="#fffdf6" />
            <stop offset="55%"  stopColor="#f3e6cd" />
            <stop offset="100%" stopColor="#dcc097" />
          </radialGradient>

          {/* Owl gradients */}
          <radialGradient id="ps-owl-body" cx="50%" cy="38%" r="65%">
            <stop offset="0%"   stopColor="#b88656" />
            <stop offset="55%"  stopColor="#7d4f23" />
            <stop offset="100%" stopColor="#3d2410" />
          </radialGradient>
          <radialGradient id="ps-owl-belly" cx="50%" cy="35%" r="70%">
            <stop offset="0%"   stopColor="#fbe9c2" />
            <stop offset="60%"  stopColor="#e6c187" />
            <stop offset="100%" stopColor="#a87436" />
          </radialGradient>
          <radialGradient id="ps-owl-face" cx="50%" cy="40%" r="65%">
            <stop offset="0%"   stopColor="#f8e3b6" />
            <stop offset="70%"  stopColor="#d6a96a" />
            <stop offset="100%" stopColor="#8c5c2a" />
          </radialGradient>
          <linearGradient id="ps-owl-wing" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#6f4321" />
            <stop offset="100%" stopColor="#321c0c" />
          </linearGradient>
          <radialGradient id="ps-owl-iris" cx="45%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#ffe072" />
            <stop offset="55%"  stopColor="#d68a1a" />
            <stop offset="100%" stopColor="#6a3a02" />
          </radialGradient>
          <radialGradient id="ps-beak" cx="50%" cy="20%" r="80%">
            <stop offset="0%"   stopColor="#ffd066" />
            <stop offset="60%"  stopColor="#e8911a" />
            <stop offset="100%" stopColor="#7a4400" />
          </radialGradient>

          {/* Soft shadow under the owl */}
          <filter id="ps-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="4" result="off" />
            <feComponentTransfer><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Reusable feather chevron path for belly markings */}
          <path id="ps-chevron" d="M -10 0 Q 0 6 10 0" />
        </defs>

        {/* Sky */}
        <rect width="400" height="360" fill="url(#ps-sky)" />

        {/* Twinkling stars */}
        <g className="pet-scene__stars" fill="#fff">
          <circle cx="35"  cy="40"  r="0.9" />
          <circle cx="80"  cy="22"  r="0.6" />
          <circle cx="220" cy="18"  r="0.8" />
          <circle cx="320" cy="34"  r="0.6" />
          <circle cx="360" cy="70"  r="0.5" />
          <circle cx="42"  cy="100" r="0.7" />
          <circle cx="370" cy="130" r="0.4" />
          <circle cx="18"  cy="60"  r="0.5" />
        </g>

        {/* Tree slab */}
        <rect x="20" y="50" width="360" height="300" rx="22" fill="url(#ps-tree)" />
        {/* Bark grain */}
        <g stroke="#2a1808" strokeWidth="1.2" opacity="0.45" fill="none">
          <path d="M55 70 Q70 130 60 200 T70 340" />
          <path d="M110 60 Q100 140 130 210 T115 340" />
          <path d="M285 60 Q300 140 275 210 T295 340" />
          <path d="M340 70 Q330 140 350 200 T335 340" />
        </g>
        {/* Knots */}
        <ellipse cx="70"  cy="280" rx="9" ry="6" fill="#2a1808" opacity="0.55" />
        <ellipse cx="335" cy="120" rx="8" ry="5" fill="#2a1808" opacity="0.55" />

        {/* Hollow cavity */}
        <ellipse cx="200" cy="210" rx="130" ry="120" fill="url(#ps-hollow)" />
        <ellipse cx="200" cy="210" rx="130" ry="120" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="3" />
        {/* Inner shadow rim */}
        <ellipse cx="200" cy="218" rx="118" ry="106" fill="none" stroke="#06030a" strokeOpacity="0.7" strokeWidth="6" />

        {/* Nest hay at hollow bottom */}
        <g className="pet-scene__nest" stroke="#c89758" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M115 280 Q200 296 285 280" />
          <path d="M125 286 L150 274" />
          <path d="M160 290 L182 278" />
          <path d="M210 290 L234 278" />
          <path d="M245 284 L268 272" />
          <path d="M198 296 L188 286" />
          <path d="M222 296 L232 286" />
        </g>

        {/* --- Egg group (egg + hatching modes) ---
            Two halves so the hatch animation can split them apart. Egg shape:
            narrow rounded top, broad rounded base — a real egg, not a bean. */}
        <g className="pet-scene__egg">
          {/* Left half */}
          <g className="pet-egg-left">
            <path
              d="M200 118
                 C 181 118, 153 158, 151 222
                 C 150 274, 173 304, 200 304
                 L 200 118 Z"
              fill="url(#ps-egg)"
              stroke="#cdae82"
              strokeWidth="1.4"
            />
          </g>
          {/* Right half */}
          <g className="pet-egg-right">
            <path
              d="M200 118
                 C 219 118, 247 158, 249 222
                 C 250 274, 227 304, 200 304
                 L 200 118 Z"
              fill="url(#ps-egg)"
              stroke="#cdae82"
              strokeWidth="1.4"
            />
          </g>
          {/* Soft top highlight for a glossy shell */}
          <ellipse cx="184" cy="160" rx="20" ry="30" fill="#ffffff" opacity="0.30" />
          {/* Speckles */}
          <g fill="#c2a06f" opacity="0.42" className="pet-egg-speckles">
            <ellipse cx="178" cy="205" rx="2.4" ry="1.5" />
            <ellipse cx="224" cy="218" rx="2.1" ry="1.3" />
            <ellipse cx="195" cy="258" rx="1.8" ry="1.1" />
            <ellipse cx="226" cy="182" rx="1.6" ry="1.0" />
            <ellipse cx="170" cy="240" rx="1.9" ry="1.2" />
          </g>
          {/* Small static crack at the top — always visible while waiting */}
          <path
            d="M184 150 L193 138 L200 150 L207 137 L216 150"
            fill="none"
            stroke="#a8814a"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
          {/* Wider crack that grows mid-hatch */}
          <path
            className="pet-egg-crack"
            d="M178 150 L190 168 L200 152 L210 170 L222 152"
            fill="none"
            stroke="#3b1f08"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Sparkle burst on hatch — kept in SVG so it sits inside the scene */}
        <g className="pet-scene__sparks" fill="#f7c948">
          <circle cx="120" cy="150" r="2.8" />
          <circle cx="280" cy="150" r="2.8" />
          <circle cx="100" cy="220" r="2"   />
          <circle cx="300" cy="220" r="2"   />
          <circle cx="150" cy="105" r="2"   />
          <circle cx="250" cy="105" r="2"   />
          <circle cx="200" cy="95"  r="2.4" />
        </g>
      </svg>

      {/* Hand-drawn color owl SVG layered on top of the scene SVG.
          Visibility + animations driven by mode classes in PetScene CSS. */}
      <OwlSvg className="pet-scene__owl-img" equipped={equipped} />
    </div>
  );
}
