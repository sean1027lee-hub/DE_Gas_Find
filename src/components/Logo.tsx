/** App mark: a tiny price sign. Mirrors the PWA icon. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#13171c" />
      <rect x="10" y="17" width="44" height="3.5" rx="1.75" fill="#7aa5ff" />
      <text
        x="11"
        y="47"
        fill="#fff3d6"
        fontFamily="JetBrains Mono Variable, ui-monospace, monospace"
        fontWeight="800"
        fontSize="24"
        letterSpacing="-1"
      >
        1,7
      </text>
      <text x="45" y="35" fill="#fff3d6" fontFamily="JetBrains Mono Variable, ui-monospace, monospace" fontWeight="800" fontSize="14">
        9
      </text>
    </svg>
  );
}
