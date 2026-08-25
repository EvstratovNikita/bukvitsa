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

// Fixed so the swarm doesn't reshuffle on every render.
const MOTES = [
  { left: 14, top: 78, size: 3.5, dur: 7.5, delay: -1.2 },
  { left: 24, top: 88, size: 2.5, dur: 9.0, delay: -4.0 },
  { left: 33, top: 72, size: 4.0, dur: 6.4, delay: -6.1 },
  { left: 41, top: 92, size: 2.8, dur: 8.2, delay: -2.6 },
  { left: 52, top: 80, size: 3.2, dur: 7.0, delay: -7.4 },
  { left: 60, top: 90, size: 2.4, dur: 9.6, delay: -0.5 },
  { left: 68, top: 74, size: 3.8, dur: 6.8, delay: -3.3 },
  { left: 77, top: 86, size: 3.0, dur: 8.6, delay: -5.7 },
  { left: 86, top: 79, size: 2.6, dur: 7.8, delay: -1.9 },
  { left: 8,  top: 84, size: 3.0, dur: 8.9, delay: -6.8 },
  { left: 46, top: 70, size: 2.2, dur: 10.2, delay: -4.7 },
  { left: 92, top: 90, size: 3.4, dur: 7.2, delay: -8.1 }
];

export function PetScene({ mode = 'owl', equipped = {} }) {
  return (
    <div className={`pet-scene pet-scene--${mode}`}>
      <svg
        className="pet-scene__svg"
        viewBox="-160 0 720 360"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Backdrop + tree gradients */}
          <linearGradient id="ps-sky" x1="0" x2="0.2" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--ps-sky-1)" />
            <stop offset="55%"  stopColor="var(--ps-sky-2)" />
            <stop offset="100%" stopColor="var(--ps-sky-3)" />
          </linearGradient>
          {/* Halo around the moon / sun */}
          <radialGradient id="ps-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--ps-halo)" stopOpacity="0.85" />
            <stop offset="45%"  stopColor="var(--ps-halo)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--ps-halo)" stopOpacity="0" />
          </radialGradient>
          {/* Ground mist lying between the far trees and the trunk */}
          <linearGradient id="ps-mist" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--ps-mist)" stopOpacity="0" />
            <stop offset="45%"  stopColor="var(--ps-mist)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--ps-mist)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ps-tree" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"   stopColor="var(--ps-trunk-3)" />
            <stop offset="18%"  stopColor="var(--ps-trunk-1)" />
            <stop offset="55%"  stopColor="var(--ps-trunk-2)" />
            <stop offset="100%" stopColor="var(--ps-trunk-3)" />
          </linearGradient>
          <radialGradient id="ps-hollow" cx="50%" cy="46%" r="62%">
            <stop offset="0%"   stopColor="var(--ps-hollow-1)" />
            <stop offset="62%"  stopColor="var(--ps-hollow-2)" />
            <stop offset="100%" stopColor="var(--ps-hollow-3)" />
          </radialGradient>
          {/* Warm light pooling at the bottom of the hollow */}
          <radialGradient id="ps-hearth" cx="50%" cy="88%" r="58%">
            <stop offset="0%"   stopColor="var(--ps-hearth)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--ps-hearth)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ps-leaf" x1="0" x2="0.6" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--ps-leaf-1)" />
            <stop offset="100%" stopColor="var(--ps-leaf-2)" />
          </linearGradient>
          <radialGradient id="ps-egg" cx="36%" cy="24%" r="84%">
            <stop offset="0%"   stopColor="var(--ps-egg-1)" />
            <stop offset="42%"  stopColor="var(--ps-egg-2)" />
            <stop offset="78%"  stopColor="var(--ps-egg-3)" />
            <stop offset="100%" stopColor="var(--ps-egg-4)" />
          </radialGradient>
          {/* Warm light bounced up from the hollow onto the shell */}
          <radialGradient id="ps-egg-bounce" cx="50%" cy="92%" r="62%">
            <stop offset="0%"   stopColor="var(--ps-hearth)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--ps-hearth)" stopOpacity="0" />
          </radialGradient>
          {/* Halo breathing around the egg while it waits */}
          <radialGradient id="ps-egg-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="var(--ps-hearth)" stopOpacity="0.34" />
            <stop offset="55%"  stopColor="var(--ps-hearth)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--ps-hearth)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ps-nest" x1="0" x2="0.3" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--ps-nest-1)" />
            <stop offset="100%" stopColor="var(--ps-nest-2)" />
          </linearGradient>

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

        {/* ---- Sky ---- */}
        <rect x="-160" y="0" width="720" height="360" fill="url(#ps-sky)" />

        {/* Moon by night, low sun by day — same shape, themed colours. */}
        <g className="pet-scene__moon">
          <circle cx="30" cy="72" r="58" fill="url(#ps-halo)" />
          <circle cx="30" cy="72" r="16" fill="var(--ps-moon)" />
          <circle cx="24" cy="67" r="3.4" fill="var(--ps-moon-crater)" opacity="0.5" />
          <circle cx="36" cy="78" r="2.2" fill="var(--ps-moon-crater)" opacity="0.4" />
          <circle cx="33" cy="63" r="1.5" fill="var(--ps-moon-crater)" opacity="0.35" />
        </g>

        {/* Stars — faded out by the light theme via --ps-star-op */}
        <g className="pet-scene__stars" fill="var(--ps-star)">
          <circle cx="35"  cy="40"  r="1.1" />
          <circle cx="80"  cy="22"  r="0.7" />
          <circle cx="128" cy="46"  r="0.5" />
          <circle cx="180" cy="14"  r="0.9" />
          <circle cx="220" cy="30"  r="0.6" />
          <circle cx="258" cy="12"  r="0.8" />
          <circle cx="392" cy="34"  r="0.6" />
          <circle cx="368" cy="96"  r="0.7" />
          <circle cx="42"  cy="104" r="0.8" />
          <circle cx="12"  cy="66"  r="0.6" />
          <circle cx="96"  cy="88"  r="0.5" />
          <circle cx="286" cy="72"  r="0.5" />
          <circle cx="-132" cy="52"  r="0.8" />
          <circle cx="-96"  cy="118" r="0.6" />
          <circle cx="-44"  cy="28"  r="0.7" />
          <circle cx="-18"  cy="140" r="0.5" />
          <circle cx="432"  cy="58"  r="0.8" />
          <circle cx="470"  cy="24"  r="0.6" />
          <circle cx="512"  cy="92"  r="0.7" />
          <circle cx="418"  cy="136" r="0.5" />
          <circle cx="536"  cy="46"  r="0.6" />
        </g>

        {/* Far treeline — two flat layers for depth */}
        <g fill="var(--ps-far-2)">
          <path d="M-170 208 L-142 154 L-114 208 Z" />
          <path d="M-126 212 L-92 144 L-58 212 Z" />
          <path d="M-70 210 L-42 158 L-14 210 Z" />
          <path d="M-10 210 L18 150 L44 210 Z" />
          <path d="M30 214 L62 138 L96 214 Z" />
          <path d="M86 212 L112 162 L140 212 Z" />
          <path d="M262 212 L292 152 L322 212 Z" />
          <path d="M312 214 L344 142 L378 214 Z" />
          <path d="M366 210 L392 158 L410 210 Z" />
          <path d="M400 212 L434 146 L468 212 Z" />
          <path d="M456 210 L484 156 L512 210 Z" />
          <path d="M500 212 L534 150 L568 212 Z" />
        </g>
        <g fill="var(--ps-far-1)">
          <path d="M-172 220 L-136 172 L-100 220 Z" />
          <path d="M-108 222 L-70 176 L-32 222 Z" />
          <path d="M-10 220 L22 176 L54 220 Z" />
          <path d="M46 222 L84 168 L122 222 Z" />
          <path d="M110 220 L140 182 L170 220 Z" />
          <path d="M244 220 L278 178 L312 220 Z" />
          <path d="M300 222 L340 170 L380 222 Z" />
          <path d="M372 220 L410 174 L448 220 Z" />
          <path d="M436 222 L476 172 L516 222 Z" />
          <path d="M498 220 L534 178 L570 220 Z" />
        </g>
        <rect x="-170" y="200" width="740" height="46" fill="url(#ps-mist)" />

        {/* ---- Main trunk ----
            Organic silhouette running off the top and bottom of the frame, so
            the owl lives inside a tree rather than on a brown rectangle. */}
        <path
          d="M 78 -10
             C 64 60 72 120 62 186
             C 54 246 68 300 60 370
             L 346 370
             C 334 300 348 244 340 184
             C 332 122 340 62 326 -10 Z"
          fill="url(#ps-tree)"
        />
        {/* Bark grain */}
        <g stroke="var(--ps-bark)" strokeWidth="1.3" opacity="0.5" fill="none" strokeLinecap="round">
          <path d="M90 -6 Q104 70 94 150 T104 366" />
          <path d="M124 0 Q112 90 132 170 T120 366" />
          <path d="M282 0 Q296 90 274 170 T292 366" />
          <path d="M314 -6 Q300 70 318 150 T306 366" />
          <path d="M106 40 Q98 96 110 150" />
          <path d="M296 214 Q308 268 292 330" />
        </g>
        {/* Moonlit edge on the lit side, deep shade on the other */}
        <path d="M 78 -10 C 64 60 72 120 62 186 C 54 246 68 300 60 370"
              stroke="var(--ps-trunk-rim)" strokeWidth="4" fill="none" opacity="0.55" />
        <path d="M 326 -10 C 340 62 332 122 340 184 C 348 244 334 300 346 370"
              stroke="var(--ps-bark)" strokeWidth="7" fill="none" opacity="0.35" />
        {/* Knots */}
        <g>
          <ellipse cx="98" cy="300" rx="9" ry="6" fill="var(--ps-bark)" opacity="0.6" />
          <ellipse cx="98" cy="299" rx="4.5" ry="2.8" fill="var(--ps-trunk-3)" opacity="0.7" />
          <ellipse cx="308" cy="112" rx="8" ry="5" fill="var(--ps-bark)" opacity="0.6" />
          <ellipse cx="308" cy="111" rx="4" ry="2.4" fill="var(--ps-trunk-3)" opacity="0.7" />
        </g>

        {/* ---- Hollow ----
            Slightly irregular opening; a raised lip catches the light on top
            and the inside glows warm from below. */}
        <path
          d="M 200 96
             C 258 96 309 142 310 206
             C 311 268 258 318 200 318
             C 142 318 89 268 90 206
             C 91 142 142 96 200 96 Z"
          fill="url(#ps-hollow)"
        />
        <path
          d="M 200 96
             C 258 96 309 142 310 206
             C 311 268 258 318 200 318
             C 142 318 89 268 90 206
             C 91 142 142 96 200 96 Z"
          fill="url(#ps-hearth)"
        />
        {/* Lip: lit rim above, dark undercut below */}
        <path d="M 90 206 C 91 142 142 96 200 96 C 258 96 309 142 310 206"
              stroke="var(--ps-lip)" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 90 206 C 89 268 142 318 200 318 C 258 318 311 268 310 206"
              stroke="var(--ps-lip-dark)" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5" />
        {/* Inner shadow so the cavity reads deep */}
        <path
          d="M 200 106
             C 252 106 300 148 301 206
             C 302 262 254 308 200 308
             C 146 308 98 262 99 206
             C 100 148 148 106 200 106 Z"
          fill="none" stroke="var(--ps-hollow-3)" strokeWidth="13" opacity="0.5"
        />

        {/* Nest hay at hollow bottom */}
        <g className="pet-scene__nest">
          {/* Bedding: a shallow bowl of twigs rather than a handful of lines */}
          <path
            d="M120 282 C 132 258 168 250 200 250 C 232 250 268 258 280 282
               C 262 298 232 304 200 304 C 168 304 138 298 120 282 Z"
            fill="url(#ps-nest)"
          />
          <path
            d="M120 282 C 132 258 168 250 200 250 C 232 250 268 258 280 282"
            fill="none" stroke="var(--ps-nest-rim)" strokeWidth="2.4" strokeLinecap="round" opacity="0.7"
          />
          <g stroke="var(--ps-nest-twig)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85">
            <path d="M128 280 Q160 266 196 262" />
            <path d="M204 262 Q242 266 272 280" />
            <path d="M134 290 Q172 280 200 278" />
            <path d="M200 278 Q232 280 266 290" />
            <path d="M146 272 L168 262" />
            <path d="M232 262 L254 272" />
            <path d="M186 296 L174 288" />
            <path d="M214 296 L226 288" />
          </g>
          {/* A little moss tucked into the near rim */}
          <g fill="var(--ps-moss)" opacity="0.8">
            <ellipse cx="146" cy="292" rx="11" ry="5" />
            <ellipse cx="252" cy="291" rx="9" ry="4.5" />
            <ellipse cx="200" cy="300" rx="13" ry="5" />
          </g>
        </g>

        {/* --- Egg group (egg + hatching modes) ---
            The shell is two fill-only halves (so the hatch animation can split
            them apart) tiled along the centre with NO inner stroke — so there's
            no seam line down the middle. A single outline path drawn on top
            gives one clean egg silhouette. Proportions are a natural egg
            (~1.45 tall:wide), not an elongated bean. */}
        <g className="pet-scene__egg">
          {/* Breathing halo, and the shadow the egg drops into the nest */}
          <circle className="pet-egg-halo" cx="200" cy="215" r="118" fill="url(#ps-egg-halo)" />
          <ellipse className="pet-egg-shadow" cx="200" cy="298" rx="52" ry="11" fill="#000" opacity="0.35" />
          {/* Whole shell — ONE solid filled silhouette (no seam). Shown while
              the egg waits; hidden the instant hatching starts so the two
              halves below can take over and split apart. */}
          <path
            className="pet-egg-whole"
            d="M200 130
               C 179 130, 148 168, 146 222
               C 144 270, 170 300, 200 300
               C 230 300, 256 270, 254 222
               C 252 168, 221 130, 200 130 Z"
            fill="url(#ps-egg)"
            stroke="#c6a571"
            strokeWidth="1.6"
          />
          {/* Left half — only used by the hatch split (hidden while intact) */}
          <g className="pet-egg-left">
            <path
              d="M200 130
                 C 179 130, 148 168, 146 222
                 C 144 270, 170 300, 200 300
                 L 200 130 Z"
              fill="url(#ps-egg)"
            />
          </g>
          {/* Right half — only used by the hatch split (hidden while intact) */}
          <g className="pet-egg-right">
            <path
              d="M200 130
                 C 221 130, 252 168, 254 222
                 C 256 270, 230 300, 200 300
                 L 200 130 Z"
              fill="url(#ps-egg)"
            />
          </g>
          {/* Warm bounce from the hollow floor, then the glossy highlight */}
          <path
            className="pet-egg-shade"
            d="M200 130
               C 179 130, 148 168, 146 222
               C 144 270, 170 300, 200 300
               C 230 300, 256 270, 254 222
               C 252 168, 221 130, 200 130 Z"
            fill="url(#ps-egg-bounce)"
          />
          <ellipse cx="181" cy="178" rx="15" ry="26" fill="#ffffff" opacity="0.32" transform="rotate(-10 181 178)" />
          <ellipse cx="188" cy="163" rx="5" ry="8" fill="#ffffff" opacity="0.55" transform="rotate(-16 188 163)" />
          {/* Rim light picked up from the lit side of the trunk */}
          <path
            className="pet-egg-shade"
            d="M166 152 C 152 176 147 202 147 226"
            fill="none" stroke="var(--ps-egg-rim)" strokeWidth="3" strokeLinecap="round" opacity="0.75"
          />
          {/* Speckles scattered over the lower two-thirds */}
          <g fill="#c2a06f" opacity="0.42" className="pet-egg-speckles">
            <ellipse cx="176" cy="212" rx="2.4" ry="1.5" />
            <ellipse cx="226" cy="222" rx="2.1" ry="1.3" />
            <ellipse cx="198" cy="262" rx="1.8" ry="1.1" />
            <ellipse cx="224" cy="190" rx="1.6" ry="1.0" />
            <ellipse cx="170" cy="246" rx="1.9" ry="1.2" />
            <ellipse cx="210" cy="248" rx="1.5" ry="1.0" />
          </g>
          {/* Static hairline fracture near the top — irregular, with a couple
              of little forks so it reads as cracked shell, not a stitched thread. */}
          <g
            className="pet-egg-crack-static"
            fill="none"
            stroke="#9c7748"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          >
            <path d="M171 170 L183 162 L189 171 L199 161 L206 172 L215 163 L226 171" />
            <path d="M199 161 L201 150 L197 142" />
            <path d="M206 172 L209 181" />
          </g>
          {/* Darker crack that widens mid-hatch (driven by .pet-egg-crack CSS) */}
          <path
            className="pet-egg-crack"
            d="M168 172 L185 160 L200 174 L214 159 L232 172"
            fill="none"
            stroke="#3b1f08"
            strokeWidth="2.2"
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
        {/* ---- Foreground ----
            Leaves hanging into the frame and grass along the bottom edge give
            the scene depth without crowding the owl. */}
        <g className="pet-scene__leaves">
          <g fill="url(#ps-leaf)" stroke="var(--ps-leaf-line)" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M-6 -4 C 28 0 47 18 44 41 C 21 41 0 25 -6 -4 Z" />
            <path d="M40 -6 C 66 3 78 24 72 44 C 51 38 38 19 40 -6 Z" />
            <path d="M406 -4 C 372 0 353 18 356 41 C 379 41 400 25 406 -4 Z" />
            <path d="M360 -6 C 334 3 322 24 328 44 C 349 38 362 19 360 -6 Z" />
            <path d="M-6 -4 C 28 0 47 18 44 41 C 21 41 0 25 -6 -4 Z" transform="translate(-150 6)" />
            <path d="M40 -6 C 66 3 78 24 72 44 C 51 38 38 19 40 -6 Z" transform="translate(-150 6)" />
            <path d="M406 -4 C 372 0 353 18 356 41 C 379 41 400 25 406 -4 Z" transform="translate(150 6)" />
            <path d="M360 -6 C 334 3 322 24 328 44 C 349 38 362 19 360 -6 Z" transform="translate(150 6)" />
          </g>
          <g stroke="var(--ps-leaf-vein)" strokeWidth="1" fill="none" opacity="0.55">
            <path d="M0 0 C 18 11 32 24 38 38" />
            <path d="M44 0 C 59 14 68 28 69 41" />
            <path d="M400 0 C 382 11 368 24 362 38" />
            <path d="M356 0 C 341 14 332 28 331 41" />
            <path d="M0 0 C 18 11 32 24 38 38" transform="translate(-150 6)" />
            <path d="M400 0 C 382 11 368 24 362 38" transform="translate(150 6)" />
          </g>
        </g>
        <g fill="var(--ps-grass)">
          <path d="M-170 360 L-170 344 C -140 336 -114 350 -86 340 C -58 330 -32 348 -4 338
                   C 20 330 46 348 70 338 C 96 328 120 346 150 338
                   C 182 330 210 350 244 340 C 276 330 302 348 332 338 C 358 330 384 344 410 338
                   C 438 330 464 348 492 340 C 520 332 546 346 570 340
                   L 570 360 Z" />
        </g>
        <g stroke="var(--ps-grass)" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M-136 342 q 4 -14 0 -24" />
          <path d="M-52 346 q -5 -15 -2 -25" />
          <path d="M36 344 q 4 -14 0 -24" />
          <path d="M120 340 q -5 -16 -2 -26" />
          <path d="M286 340 q 5 -15 1 -25" />
          <path d="M366 344 q -4 -14 0 -22" />
          <path d="M452 346 q 5 -15 1 -25" />
          <path d="M536 342 q -4 -14 0 -24" />
        </g>
      </svg>

      {/* Fireflies drifting up through the hollow. Plain spans so each one
          can carry its own duration/delay without a keyframe per particle. */}
      <div className="pet-scene__motes" aria-hidden="true">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="pet-scene__mote"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`
            }}
          />
        ))}
      </div>

      {/* Hand-drawn color owl SVG layered on top of the scene SVG.
          Visibility + animations driven by mode classes in PetScene CSS. */}
      <OwlSvg className="pet-scene__owl-img" equipped={equipped} perch />
    </div>
  );
}
