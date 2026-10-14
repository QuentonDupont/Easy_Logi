import * as React from "react";

export type LogoVariant = "dark" | "light";

export interface LogoMarkProps extends Omit<React.SVGProps<SVGSVGElement>, "viewBox"> {
  /** Rendered width/height in px. */
  size?: number;
  /** `dark` for light backgrounds (ink tile), `light` for ink backgrounds (white tile). */
  variant?: LogoVariant;
  /** Accessible label; omit (and keep `decorative`) when a wordmark sits beside it. */
  title?: string;
}

/**
 * The Easy Logi "Stack E" mark: three cargo lanes form an E; the short middle
 * lane ends in the orange dot — the part, found and on its way.
 *
 * The orange dot (`--el-signal`, #E8590C) is the only orange in the logo and is
 * never recoloured. The `dark` variant swaps the tile and bars for light backgrounds;
 * the `light` variant is for ink backgrounds. The dot stays orange in both.
 */
export function LogoMark({ size = 32, variant = "dark", title, ...props }: LogoMarkProps) {
  const tile = variant === "dark" ? "#0B1F33" : "#FFFFFF";
  const bars = variant === "dark" ? "#FFFFFF" : "#0B1F33";
  const decorative = !title;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={title}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect width="64" height="64" rx="14" fill={tile} />
      <rect x="14" y="16" width="36" height="7" rx="3.5" fill={bars} />
      <rect x="14" y="28.5" width="22" height="7" rx="3.5" fill={bars} />
      <circle cx="44" cy="32" r="5" fill="#E8590C" />
      <rect x="14" y="41" width="36" height="7" rx="3.5" fill={bars} />
    </svg>
  );
}
