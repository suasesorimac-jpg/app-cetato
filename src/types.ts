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
  labelImageId?: string | null;
  dateAdded: string;
}

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
