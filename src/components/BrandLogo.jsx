export default function BrandLogo({
  className = "",
  label = "Table Generator",
  compact = false,
  variant = "primary",
  animated = true
}) {
  const resolvedVariant = compact ? "compact" : variant;
  const showWordmark = resolvedVariant !== "icon";

  return (
    <div
      className={`brand-lockup brand-lockup--${resolvedVariant} ${
        animated ? "is-animated" : ""
      } ${className}`}
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        className="brand-symbol"
        viewBox="0 0 96 72"
      >
        <path className="brand-symbol__slider" d="M14 13H82" />
        <path className="brand-symbol__slider" d="M14 28H82" />
        <path className="brand-symbol__slider" d="M14 43H82" />
        <circle className="brand-symbol__knob brand-symbol__knob--one" cx="35" cy="13" r="4.8" />
        <circle className="brand-symbol__knob brand-symbol__knob--two" cx="61" cy="28" r="4.8" />
        <circle className="brand-symbol__knob brand-symbol__knob--three" cx="47" cy="43" r="4.8" />
        <path className="brand-symbol__tabletop" d="M24 54H72" />
        <path className="brand-symbol__leg" d="M33 54L27 66" />
        <path className="brand-symbol__leg" d="M63 54L69 66" />
      </svg>
      {showWordmark ? <span className="brand-lockup__text">{label}</span> : null}
    </div>
  );
}
