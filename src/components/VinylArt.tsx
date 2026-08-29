import { useState } from "react";
import type { Vinyl } from "../types";
import { coverId, labelAId } from "../types";
import { resolveImageSrc } from "../config/cloudinary";
import { discDataUrl, sleeveDataUrl } from "../lib/utils";

function SmartImg({
  src,
  alt,
  className,
  fit = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {!loaded && <div className="shimmer absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full ${
          fit === "contain" ? "object-contain" : "object-cover"
        } transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

/** Carátula (foto real si existe; si no, arte de referencia generado). */
export function CoverImage({
  record,
  className,
  width = 640,
  fit,
}: {
  record: Vinyl;
  className?: string;
  width?: number;
  fit?: "cover" | "contain";
}) {
  const real = resolveImageSrc(coverId(record), width);
  const src = real ?? sleeveDataUrl(record);
  return <SmartImg src={src} alt={`Carátula de ${record.album}`} className={className} fit={fit} />;
}

/** Galleta (foto real si existe; si no, galleta de referencia generada). */
export function LabelImage({
  record,
  className,
  width = 640,
  fit,
}: {
  record: Vinyl;
  className?: string;
  width?: number;
  fit?: "cover" | "contain";
}) {
  /* El getter resuelve la migración: labelAImageId ?? labelImageId (heredado) */
  const real = resolveImageSrc(labelAId(record), width);
  const src = real ?? discDataUrl(record);
  return <SmartImg src={src} alt={`Galleta de ${record.album}`} className={className} fit={fit} />;
}
