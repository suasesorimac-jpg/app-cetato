import { useState } from "react";
import type { Vinyl } from "../types";
import { coverBackId, coverId, labelAId, labelBId } from "../types";
import { resolveImageSrc } from "../config/cloudinary";
import { discDataUrl, sleeveDataUrl } from "../lib/utils";

interface ImgProps {
  record: Vinyl;
  className?: string;
  width?: number;
  fit?: "cover" | "contain";
}

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

function build(src: string | null, fallback: string) {
  return src ?? fallback;
}

/** Carátula frontal (o combinada). Si no hay foto, arte de referencia generado. */
export function CoverImage({ record, className, width = 640, fit }: ImgProps) {
  const real = resolveImageSrc(coverId(record), width);
  return (
    <SmartImg
      src={build(real, sleeveDataUrl(record))}
      alt={`Carátula de ${record.album}`}
      className={className}
      fit={fit}
    />
  );
}

/** Carátula trasera. Si no hay foto, arte de referencia generado. */
export function CoverBackImage({ record, className, width = 640, fit }: ImgProps) {
  const real = resolveImageSrc(coverBackId(record), width);
  return (
    <SmartImg
      src={build(real, sleeveDataUrl(record))}
      alt={`Contraportada de ${record.album}`}
      className={className}
      fit={fit}
    />
  );
}

/** Galleta lado A (o combinada A+B). Si no hay foto, galleta generada. */
export function LabelAImage({ record, className, width = 640, fit }: ImgProps) {
  const real = resolveImageSrc(labelAId(record), width);
  return (
    <SmartImg
      src={build(real, discDataUrl(record, "A"))}
      alt={`Galleta lado A de ${record.album}`}
      className={className}
      fit={fit}
    />
  );
}

/** Galleta lado B. Si no hay foto, galleta generada. */
export function LabelBImage({ record, className, width = 640, fit }: ImgProps) {
  const real = resolveImageSrc(labelBId(record), width);
  return (
    <SmartImg
      src={build(real, discDataUrl(record, "B"))}
      alt={`Galleta lado B de ${record.album}`}
      className={className}
      fit={fit}
    />
  );
}
