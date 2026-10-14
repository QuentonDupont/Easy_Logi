"use client";

import { useState } from "react";
import { Snowflake, Fan } from "lucide-react";

/**
 * Product image for a catalogue card. Images are hotlinked from the supplier's product page,
 * so any can fail — on error (or when there is no image) we show a tinted category placeholder.
 */
export function CatalogImage({
  src,
  alt,
  category,
}: {
  src: string | null;
  alt: string;
  category: "unit" | "compressor";
}) {
  const [failed, setFailed] = useState(false);
  const Icon = category === "compressor" ? Fan : Snowflake;

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-secondary text-muted-foreground">
        <Icon className="h-8 w-8" aria-hidden="true" />
        <span className="text-xs font-medium capitalize">{category}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full bg-white object-contain"
    />
  );
}
