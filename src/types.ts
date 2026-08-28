export type RpmFormat = "33 RPM" | "45 RPM" | "78 RPM";

/** Slots de imagen por disco (máx. 4 fotos por ejemplar). */
export type ImageSlot = "cover" | "coverBack" | "labelA" | "labelB";

export interface Vinyl {
  id: string;
  artist: string;
  album: string;
  label: string;
  matrixCode: string;
  year: number | "N/E";
  genre: string;
  format: RpmFormat;
  /** Carátula frontal (o carátulas combinadas frente+trasera si no hay separadas). */
  coverImageId?: string | null;
  /** Carátula trasera; null si no existe. */
  coverBackImageId?: string | null;
  /** Galleta lado A (o galletas combinadas A+B si no hay separadas). */
  labelAImageId?: string | null;
  /** Galleta lado B; null si no existe. */
  labelBImageId?: string | null;
  /**
   * @deprecated Campo heredado (esquema anterior a los 4 slots).
   * Migración automática: `labelAImageId ?? labelImageId`.
   */
  labelImageId?: string | null;
  dateAdded: string;
}

/* ── Getters de imágenes (con migración del campo heredado) ── */

export function coverId(v: Vinyl): string | null {
  return v.coverImageId ?? null;
}
export function coverBackId(v: Vinyl): string | null {
  return v.coverBackImageId ?? null;
}
export function labelAId(v: Vinyl): string | null {
  return v.labelAImageId ?? v.labelImageId ?? null;
}
export function labelBId(v: Vinyl): string | null {
  return v.labelBImageId ?? null;
}

export function slotIds(v: Vinyl): Record<ImageSlot, string | null> {
  return {
    cover: coverId(v),
    coverBack: coverBackId(v),
    labelA: labelAId(v),
    labelB: labelBId(v),
  };
}

export const SLOT_LABELS: Record<ImageSlot, string> = {
  cover: "Carátula frontal",
  coverBack: "Carátula trasera",
  labelA: "Galleta lado A",
  labelB: "Galleta lado B",
};

export const SLOT_ORDER: ImageSlot[] = ["cover", "coverBack", "labelA", "labelB"];

/** IDs de las fotos reales disponibles (hasta 4). */
export function imageIds(v: Vinyl): string[] {
  return SLOT_ORDER.map((s) => slotIds(v)[s]).filter((x): x is string => Boolean(x));
}

export function countImages(v: Vinyl): number {
  return imageIds(v).length;
}

/* ── Filtros y vistas ─────────────────────────────────────── */

export interface Filters {
  formats: string[];
  labels: string[];
  genres: string[];
  decades: string[];
}

export type FilterGroup = keyof Filters;

export type ViewMode = "grid" | "table";

export interface Prefs {
  view: ViewMode;
  filters: Filters;
  query: string;
}

export type SortKey = "artist" | "album" | "label" | "matrixCode" | "year" | "genre";

export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

export const EMPTY_FILTERS: Filters = { formats: [], labels: [], genres: [], decades: [] };

export const GENRE_OPTIONS = [
  "Bolero",
  "Cumbia",
  "Salsa",
  "Vallenato",
  "Porro",
  "Guaracha",
  "Balada",
  "Tango",
  "Otro",
] as const;

export const FORMAT_OPTIONS: RpmFormat[] = ["33 RPM", "45 RPM", "78 RPM"];
