import type { Filters, Prefs, Vinyl, ViewMode } from "../types";
import { EMPTY_FILTERS } from "../types";

const COLLECTION_KEY = "appcetato:collection:v1";
const PREFS_KEY = "appcetato:prefs:v1";

/**
 * Migración al esquema de 4 slots de imagen:
 * el campo heredado `labelImageId` se conserva como galleta lado A.
 */
function normalizeVinyl(raw: Record<string, unknown>): Vinyl {
  const v = { ...raw } as unknown as Vinyl;
  if (!v.labelAImageId && v.labelImageId) {
    v.labelAImageId = v.labelImageId;
  }
  return v;
}

export function loadCollection(): Vinyl[] | null {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return (parsed as Record<string, unknown>[]).map(normalizeVinyl);
  } catch {
    return null;
  }
}

/** Devuelve false si no se pudo persistir (cuota llena, modo privado, …). */
export function saveCollection(list: Vinyl[]): boolean {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function loadPrefs(): Prefs {
  const fallback: Prefs = { view: "grid", filters: EMPTY_FILTERS, query: "" };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      view: p.view === "table" ? "table" : "grid",
      filters: { ...EMPTY_FILTERS, ...(p.filters ?? {}) } as Filters,
      query: typeof p.query === "string" ? p.query : "",
    };
  } catch {
    return fallback;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

export type { ViewMode };
