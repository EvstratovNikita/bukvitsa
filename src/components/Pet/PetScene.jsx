// The visual centerpiece of PetModal: a tree slab with a hollow, an egg
// inside, and the owl that hatches out of it. Renders one of three modes:
//   'egg'      — static egg (pre-hatch state, when the modal opens for the
//                first time and we're about to play the hatching sequence)
//   'hatching' — wobble → crack → split → owl reveal animation
//   'owl'      — settled owl (returning visits)
//
// All SVG inline so animations can be driven by CSS classes; no asset
// pipeline, no external files.

export function PetScene({ mode = 'owl' }) {
  return (
    <div className={`pet-scene pet-scene--${mode}`}>
      <svg
        className="pet-scene__svg"
        viewBox="0 0 240 220"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pet-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1a2138" />
            <stop offset="100%" stopColor="#101522" />
          </linearGradient>
          <linearGradient id="pet-tree" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#3b2412" />
            <stop offset="50%" stopColor="#5a3a1f" />
            <stop offset="100%" stopColor="#3b2412" />
          </linearGradient>
          <radialGradient id="pet-hollow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#1e1408" />
            <stop offset="100%" stopColor="#0a0604" />
          </radialGradient>
          <radialGradient id="pet-egg" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff7e2" />
            <stop offset="55%" stopColor="#f5d8a3" />
            <stop offset="100%" stopColor="#c9974c" />
          </radialGradient>
          <linearGradient id="pet-owl-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a47148" />
            <stop offset="100%" stopColor="#5a3318" />
          </linearGradient>
        </defs>

        {/* Sky backdrop */}
        <rect width="240" height="220" fill="url(#pet-sky)" />
        {/* Stars */}
        <g className="pet-scene__stars" fill="#fff">
          <circle cx="20"  cy="30" r="0.8" />
          <circle cx="60"  cy="18" r="0.5" />
          <circle cx="180" cy="22" r="0.7" />
          <circle cx="210" cy="50" r="0.5" />
          <circle cx="30"  cy="80" r="0.6" />
          <circle cx="220" cy="100" r="0.4" />
        </g>

        {/* Tree trunk slab */}
        <rect x="20" y="40" width="200" height="170" rx="14" fill="url(#pet-tree)" />
        {/* bark grain */}
        <g stroke="#2a1808" strokeWidth="1" opacity="0.5" fill="none">
          <path d="M40 60 Q60 90 50 130 T55 200" />
          <path d="M80 50 Q72 100 95 140 T85 200" />
          <path d="M150 50 Q165 100 145 150 T160 200" />
          <path d="M195 60 Q180 100 200 140 T185 200" />
        </g>

        {/* Hollow — oval cavity */}
        <ellipse cx="120" cy="125" rx="62" ry="58" fill="url(#pet-hollow)" />
        {/* hollow rim shadow */}
        <ellipse cx="120" cy="125" rx="62" ry="58" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="3" />

        {/* Hay/nest at bottom of hollow */}
        <g className="pet-scene__nest" stroke="#b88848" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M75 165 Q120 175 165 165" />
          <path d="M82 170 L96 162" />
          <path d="M100 172 L112 164" />
          <path d="M122 172 L138 164" />
          <path d="M145 170 L160 162" />
        </g>

        {/* --- Egg group (visible on egg + hatching modes) --- */}
        <g className="pet-scene__egg">
          {/* whole egg (left half) */}
          <g className="pet-egg-left">
            <path
              d="M120 95
                 C 100 95, 90 115, 90 140
                 C 90 160, 100 170, 120 170
                 L 120 95 Z"
              fill="url(#pet-egg)"
              stroke="#8a5a1d"
              strokeWidth="1.4"
            />
          </g>
          {/* whole egg (right half) */}
          <g className="pet-egg-right">
            <path
              d="M120 95
                 C 140 95, 150 115, 150 140
                 C 150 160, 140 170, 120 170
                 L 120 95 Z"
              fill="url(#pet-egg)"
              stroke="#8a5a1d"
              strokeWidth="1.4"
            />
          </g>
          {/* speckles */}
          <g fill="#8a5a1d" opacity="0.45" className="pet-egg-speckles">
            <ellipse cx="106" cy="120" rx="2.2" ry="1.4" />
            <ellipse cx="132" cy="135" rx="2"   ry="1.2" />
            <ellipse cx="118" cy="155" rx="1.7" ry="1.0" />
            <ellipse cx="135" cy="110" rx="1.4" ry="0.9" />
          </g>
          {/* crack line (appears mid-animation) */}
          <path
            className="pet-egg-crack"
            d="M105 130 L113 122 L118 132 L124 124 L132 134 L138 128"
            fill="none"
            stroke="#3b1f08"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* --- Owl group (visible on owl + hatching modes after reveal) --- */}
        <g className="pet-scene__owl">
          {/* tufts */}
          <path d="M96 92 L106 70 L112 96 Z" fill="#5a3318" />
          <path d="M144 92 L134 70 L128 96 Z" fill="#5a3318" />
          {/* body */}
          <ellipse cx="120" cy="135" rx="36" ry="38" fill="url(#pet-owl-body)" />
          {/* belly */}
          <ellipse cx="120" cy="148" rx="20" ry="22" fill="#e8c896" />
          {/* wings */}
          <path d="M88 130 Q80 150 92 168 Q98 156 100 138 Z" fill="#5a3318" />
          <path d="M152 130 Q160 150 148 168 Q142 156 140 138 Z" fill="#5a3318" />
          {/* eye whites */}
          <circle cx="106" cy="120" r="13" fill="#fff" />
          <circle cx="134" cy="120" r="13" fill="#fff" />
          {/* pupils */}
          <circle className="pet-owl-pupil" cx="106" cy="122" r="6" fill="#1a1300" />
          <circle className="pet-owl-pupil" cx="134" cy="122" r="6" fill="#1a1300" />
          {/* sparkle */}
          <circle cx="108" cy="119" r="1.6" fill="#fff" />
          <circle cx="136" cy="119" r="1.6" fill="#fff" />
          {/* beak */}
          <path d="M115 138 L125 138 L120 148 Z" fill="#f7c948" stroke="#8a5a1d" strokeWidth="0.8" />
          {/* feet */}
          <path d="M108 172 L108 178 M104 174 L108 174 M112 174 L108 174" stroke="#f7c948" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M132 172 L132 178 M128 174 L132 174 M136 174 L132 174" stroke="#f7c948" strokeWidth="1.6" strokeLinecap="round" />
          {/* eyelids for blink */}
          <g className="pet-owl-eyelid">
            <rect x="93"  y="105" width="26" height="0" fill="#5a3318" />
            <rect x="121" y="105" width="26" height="0" fill="#5a3318" />
          </g>
        </g>

        {/* Sparkle burst on hatch */}
        <g className="pet-scene__sparks" fill="#f7c948">
          <circle cx="80"  cy="100" r="2" />
          <circle cx="160" cy="100" r="2" />
          <circle cx="70"  cy="140" r="1.5" />
          <circle cx="170" cy="140" r="1.5" />
          <circle cx="100" cy="80"  r="1.5" />
          <circle cx="140" cy="80"  r="1.5" />
        </g>
      </svg>
    </div>
  );
}
