/* ============================================================================
   Alternative hero backdrops — so not every feature hero wears the same blob.
   Shapes exported from Haikei (blob-scene, wave), re-drawn here inline so they
   can be recoloured to each page's accent gradient. Full-bleed, behind content.
   ========================================================================== */

let seq = 0

/* Two organic blobs anchored in opposite corners (top-right + bottom-left). */
export function HeroScene({ from, to, flip = false }: { from: string; to: string; flip?: boolean }) {
  const id = `heroscene-${seq++}`
  return (
    <svg
      viewBox="0 0 900 600"
      preserveAspectRatio="none"
      aria-hidden
      className={'pointer-events-none absolute inset-0 h-full w-full ' + (flip ? '[transform:scaleX(-1)]' : '')}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <g transform="translate(900, 0)">
        <path
          d="M0 405.6C-43.2 401.5 -86.4 397.4 -123.9 381.4C-161.5 365.3 -193.4 337.2 -226.9 312.3C-260.4 287.3 -295.4 265.5 -323.6 235.1C-351.8 204.8 -373.2 165.9 -385.8 125.3C-398.3 84.7 -402 42.4 -405.6 0L0 0Z"
          fill={`url(#${id})`}
          fillOpacity="0.92"
        />
      </g>
      <g transform="translate(0, 600)">
        <path
          d="M0 -405.6C41.3 -395.9 82.5 -386.2 120.8 -371.9C159.1 -357.6 194.5 -338.7 230.4 -317.1C266.3 -295.5 302.6 -271.2 328.2 -238.4C353.7 -205.6 368.4 -164.4 379.5 -123.3C390.6 -82.2 398.1 -41.1 405.6 0L0 0Z"
          fill={`url(#${id})`}
          fillOpacity="0.4"
        />
      </g>
    </svg>
  )
}

/* A single sweeping wave that fills one side with a soft curved edge. */
export function HeroWave({ from, to, flip = false }: { from: string; to: string; flip?: boolean }) {
  const id = `herowave-${seq++}`
  return (
    <svg
      viewBox="0 0 900 600"
      preserveAspectRatio="none"
      aria-hidden
      className={'pointer-events-none absolute inset-0 h-full w-full ' + (flip ? '' : '[transform:scaleX(-1)]')}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path
        d="M499 0L482.8 33.3C466.7 66.7 434.3 133.3 402.5 200C370.7 266.7 339.3 333.3 334.2 400C329 466.7 350 533.3 360.5 566.7L371 600L0 600L0 566.7C0 533.3 0 466.7 0 400C0 333.3 0 266.7 0 200C0 133.3 0 66.7 0 33.3L0 0Z"
        fill={`url(#${id})`}
        fillOpacity="0.9"
      />
    </svg>
  )
}
