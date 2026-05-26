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

export function PetScene({ mode = 'owl' }) {
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
          <radialGradient id="ps-egg" cx="35%" cy="30%" r="75%">
            <stop offset="0%"   stopColor="#fff7e2" />
            <stop offset="55%"  stopColor="#f5d8a3" />
            <stop offset="100%" stopColor="#b3833f" />
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

        {/* --- Egg group (egg + hatching modes) --- */}
        <g className="pet-scene__egg">
          {/* Left half */}
          <g className="pet-egg-left">
            <path
              d="M200 130
                 C 165 130, 145 165, 145 220
                 C 145 268, 165 290, 200 290
                 L 200 130 Z"
              fill="url(#ps-egg)"
              stroke="#8a5a1d"
              strokeWidth="1.6"
            />
          </g>
          {/* Right half */}
          <g className="pet-egg-right">
            <path
              d="M200 130
                 C 235 130, 255 165, 255 220
                 C 255 268, 235 290, 200 290
                 L 200 130 Z"
              fill="url(#ps-egg)"
              stroke="#8a5a1d"
              strokeWidth="1.6"
            />
          </g>
          {/* Speckles */}
          <g fill="#8a5a1d" opacity="0.45" className="pet-egg-speckles">
            <ellipse cx="175" cy="180" rx="2.5" ry="1.5" />
            <ellipse cx="225" cy="200" rx="2.2" ry="1.4" />
            <ellipse cx="195" cy="240" rx="1.8" ry="1.1" />
            <ellipse cx="230" cy="160" rx="1.6" ry="1.0" />
            <ellipse cx="170" cy="225" rx="1.9" ry="1.2" />
          </g>
          {/* Crack — appears mid-animation */}
          <path
            className="pet-egg-crack"
            d="M170 200 L182 188 L188 202 L196 192 L204 206 L214 196 L226 210"
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
      <OwlSvg className="pet-scene__owl-img" />
    </div>
  );
}
