import { useState } from "react";
import type { Vinyl } from "../types";
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
        className={`h-full w-full transition-opacity duration-500 ${
          fit === "contain" ? "object-contain" : "object-cover"
        } ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

/** Carátula: foto de Cloudinary si existe, si no, arte de referencia generado. */
export function CoverImage({
  record,
  className,
  width = 640,
}: {
  record: Vinyl;
  className?: string;
  width?: number;
}) {
  const real = resolveImageSrc(record.coverImageId, width);
  const src = real ?? sleeveDataUrl(record);
  return <SmartImg src={src} alt={`Carátula de ${record.album}`} className={className} />;
}

/** Galleta (label del disco): foto si existe, si no, galleta generada. */
export function LabelImage({
  record,
  className,
  width = 640,
  fit = "cover",
}: {
  record: Vinyl;
  className?: string;
  width?: number;
  fit?: "cover" | "contain";
}) {
  const real = resolveImageSrc(record.labelImageId ?? record.labelAImageId, width);
  const src = real ?? discDataUrl(record);
  return (
    <SmartImg src={src} alt={`Galleta de ${record.album}`} className={className} fit={fit} />
  );
}

/** Carátula trasera: foto si existe, si no, arte de referencia generado. */
export function CoverBackImage({
  record,
  className,
  width = 640,
}: {
  record: Vinyl;
  className?: string;
  width?: number;
}) {
  const real = resolveImageSrc(record.coverBackImageId, width);
  const src = real ?? sleeveDataUrl(record);
  return <SmartImg src={src} alt={`Contraportada de ${record.album}`} className={className} />;
}

/** Galleta lado B: foto si existe, si no, galleta generada. */
export function LabelBImage({
  record,
  className,
  width = 640,
  fit = "cover",
}: {
  record: Vinyl;
  className?: string;
  width?: number;
  fit?: "cover" | "contain";
}) {
  const real = resolveImageSrc(record.labelBImageId, width);
  const src = real ?? discDataUrl(record);
  return (
    <SmartImg src={src} alt={`Galleta lado B de ${record.album}`} className={className} fit={fit} />
  );
}
