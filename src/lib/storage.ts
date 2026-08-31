import type { AuthState, Filters, Prefs, Vinyl, ViewMode } from "../types";
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
  const fallback: Prefs = { view: "grid", filters: EMPTY_FILTERS, query: "", mode: "catalog" };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      view: p.view === "table" ? "table" : "grid",
      filters: { ...EMPTY_FILTERS, ...(p.filters ?? {}) } as Filters,
      query: typeof p.query === "string" ? p.query : "",
      mode: p.mode === "explore" ? "explore" : "catalog",
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

// === AUTH STORAGE (modo Admin/Visitante) ===
const AUTH_KEY = "appcetato_auth_state";

/* Contraseña ofuscada con btoa (NO es seguridad real, solo ofuscación básica;
   el valor original no se guarda en texto plano en el código fuente). */
const ENCODED_PASSWORD = "YXBwY2V0YXRvMjAyNg==";

export function getAuthState(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AuthState>;
      if (parsed && (parsed.mode === "admin" || parsed.mode === "visitor")) {
        return {
          mode: parsed.mode,
          isAuthenticated: Boolean(parsed.isAuthenticated),
          lastLoginAt: parsed.lastLoginAt,
        };
      }
    }
  } catch (error) {
    console.error("Error reading auth state:", error);
  }
  /* Por defecto: modo visitante */
  return { mode: "visitor", isAuthenticated: false };
}

export function saveAuthState(state: AuthState): void {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving auth state:", error);
  }
}

export function verifyPassword(password: string): boolean {
  try {
    return btoa(password) === ENCODED_PASSWORD;
  } catch {
    /* btoa lanza con caracteres fuera de Latin1 */
    return false;
  }
}

export function login(password: string): boolean {
  if (verifyPassword(password)) {
    const authState: AuthState = {
      mode: "admin",
      isAuthenticated: true,
      lastLoginAt: new Date().toISOString(),
    };
    saveAuthState(authState);
    return true;
  }
  return false;
}

export function logout(): void {
  const authState: AuthState = {
    mode: "visitor",
    isAuthenticated: false,
  };
  saveAuthState(authState);
}

export function isAdmin(): boolean {
  const auth = getAuthState();
  return auth.mode === "admin" && auth.isAuthenticated;
}
