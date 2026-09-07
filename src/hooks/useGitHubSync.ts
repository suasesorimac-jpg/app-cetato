import { useEffect, useState } from "react";
import type { Vinyl } from "../types";

const GITHUB_REPO = "suasesorimac-jpg/app-Cetato";
const BRANCH = "appcetato-vinyl-catalog-4fb1d";
const CATALOG_PATH = "src/data/catalog.json";

/**
 * Hook de sincronización con GitHub:
 *  - Carga el catálogo desde GitHub al montar (fuente central de verdad)
 *  - Auto-sync cada 5 minutos si la app está abierta
 *  - Guarda en localStorage para funcionamiento offline
 */
export function useGitHubSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFromGitHub = async (): Promise<Vinyl[] | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `https://raw.githubusercontent.com/${GITHUB_REPO}/${BRANCH}/${CATALOG_PATH}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: No se pudo cargar desde GitHub`);
      }

      const data = await response.json();
      setLastSync(new Date());

      /* Guardar en localStorage para funcionamiento offline */
      localStorage.setItem("appcetato:collection:v1", JSON.stringify(data));
      localStorage.setItem("appcetato:last_sync", new Date().toISOString());

      return data as Vinyl[];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      console.error("Error cargando desde GitHub:", message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /* Forzar sync al montar + auto-sync cada 5 minutos */
  useEffect(() => {
    loadFromGitHub();

    const interval = setInterval(loadFromGitHub, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, []);

  return { loadFromGitHub, isLoading, lastSync, error };
}
