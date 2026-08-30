import type { Vinyl } from "../types";

/**
 * Parser de artistas — se ejecuta en runtime sobre el catálogo cargado,
 * de modo que `src/data/catalog.json` permanece intacto (fuente histórica).
 */

/**
 * Parsea el campo `artist` para extraer la lista de artistas individuales.
 * Maneja formatos como:
 *  - "Varios Artistas (Trío Huaricancha, Rodolfo y su Típica RA7, Lisandro Meza)"
 *  - "Varios Artistas (Juan Arvizu; Genaro Salinas; etc.)"
 *  - "Fruko y sus Tesos"  → ["Fruko y sus Tesos"] (sin paréntesis = 1 artista)
 *
 * NOTA: el separador " y " solo se aplica DENTRO de los paréntesis, así que
 * "Fruko y sus Tesos" (sin paréntesis) jamás se rompe en dos.
 */
export function parseArtists(artistField: string): string[] {
  const original = artistField.trim();

  // Si no hay paréntesis, retornar array con un solo elemento
  if (!original.includes("(") || !original.includes(")")) {
    return [original];
  }

  // Extraer contenido entre paréntesis
  const match = original.match(/\(([^)]+)\)/);
  if (!match) return [original];

  const insideParentheses = match[1];

  // Separar por comas, punto y coma, o " y "
  const artists = insideParentheses
    .split(/,|;|\sy\s/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
    // Descartar marcadores de abreviación presentes en el catálogo ("etc.", "etc")
    .filter((a) => !/^etc\.?$/i.test(a));

  return artists.length > 0 ? artists : [original];
}

/**
 * Aplica el parser a todo el catálogo, derivando el campo opcional `artists`
 * sin mutar ningún otro campo del registro.
 */
export function enrichCatalogWithArtists(vinyls: Vinyl[]): Vinyl[] {
  return vinyls.map((vinyl) => ({
    ...vinyl,
    artists: parseArtists(vinyl.artist),
  }));
}
