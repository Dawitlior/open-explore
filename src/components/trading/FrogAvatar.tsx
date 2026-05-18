/**
 * FrogAvatar — inline SVG "Pepe"-inspired friendly green frog used as a default
 * profile picture inside the Settings hub.  Renders crisply at any size and
 * does not depend on any external image asset.
 */
interface Props {
  size?: number;
  borderColor?: string;
  background?: string;
}

export const FrogAvatar = ({ size = 48, borderColor = 'rgba(0,0,0,0.12)', background = '#bfe27a' }: Props) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background,
      border: `2px solid ${borderColor}`,
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
    }}
    aria-label="Frog avatar"
  >
    <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* head */}
      <ellipse cx="50" cy="60" rx="40" ry="34" fill="#7ab53a" />
      <ellipse cx="50" cy="64" rx="32" ry="22" fill="#9ed154" />
      {/* eye bumps */}
      <circle cx="30" cy="32" r="16" fill="#7ab53a" />
      <circle cx="70" cy="32" r="16" fill="#7ab53a" />
      {/* eye whites */}
      <circle cx="30" cy="32" r="12" fill="#ffffff" />
      <circle cx="70" cy="32" r="12" fill="#ffffff" />
      {/* pupils */}
      <circle cx="32" cy="34" r="5" fill="#0d1b0a" />
      <circle cx="72" cy="34" r="5" fill="#0d1b0a" />
      <circle cx="33.5" cy="32.5" r="1.6" fill="#ffffff" />
      <circle cx="73.5" cy="32.5" r="1.6" fill="#ffffff" />
      {/* nostrils */}
      <circle cx="44" cy="58" r="1.2" fill="#3a5a1f" />
      <circle cx="56" cy="58" r="1.2" fill="#3a5a1f" />
      {/* smile */}
      <path d="M28 70 Q50 88 72 70" stroke="#2c3f15" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* cheek blush */}
      <circle cx="22" cy="66" r="3.5" fill="#f5a3b7" opacity="0.55" />
      <circle cx="78" cy="66" r="3.5" fill="#f5a3b7" opacity="0.55" />
    </svg>
  </div>
);

export default FrogAvatar;
