export type RpmFormat = "33 RPM" | "45 RPM" | "78 RPM";

export interface Vinyl {
  id: string;
  artist: string;
  album: string;
  label: string;
  matrixCode: string;
  year: number | "N/E";
  genre: string;
  format: RpmFormat;
  coverImageId?: string | null;
  coverBackImageId?: string | null;
  labelAImageId?: string | null;
  labelBImageId?: string | null;
  /** @deprecated usar labelAImageId */
  labelImageId?: string | null;
  dateAdded: string;
}

/** Compatibilidad: galleta lado A (o el campo legado). */
export function labelAId(v: Vinyl): string | null | undefined {
  return v.labelAImageId ?? v.labelImageId;
}

/** Cantidad total de fotos del ejemplar (máx 4). */
export function countImages(v: Vinyl): number {
  return [v.coverImageId, v.coverBackImageId, labelAId(v), v.labelBImageId].filter(Boolean).length;
}

export const SLOT_LABELS = {
  cover: "Carátula frontal",
  coverBack: "Carátula trasera",
  labelA: "Galleta lado A",
  labelB: "Galleta lado B",
} as const;

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
