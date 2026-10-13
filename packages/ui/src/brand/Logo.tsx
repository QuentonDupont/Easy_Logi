import { LogoMark, type LogoVariant } from "./LogoMark";

export interface LogoProps {
  /** Mark size in px; the wordmark scales from it (0.75×). */
  size?: number;
  variant?: LogoVariant;
  /** Hide the wordmark and render the mark alone. */
  markOnly?: boolean;
  className?: string;
}

/**
 * Mark + `easylogi` wordmark lockup. Wordmark is lowercase, one word,
 * `easy` bold (700) + `logi` regular (400), IBM Plex Sans, tight tracking.
 */
export function Logo({ size = 32, variant = "dark", markOnly = false, className }: LogoProps) {
  const wordColor = variant === "dark" ? "#0B1F33" : "#FFFFFF";
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.28 }}>
      <LogoMark size={size} variant={variant} />
      {markOnly ? null : (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: size * 0.75,
            letterSpacing: "-0.03em",
            color: wordColor,
            lineHeight: 1,
          }}
        >
          <span style={{ fontWeight: 700 }}>easy</span>
          <span style={{ fontWeight: 400 }}>logi</span>
        </span>
      )}
    </span>
  );
}
