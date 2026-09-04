import type { Vinyl } from "../types";

/**
 * Parser de catálogo — se ejecuta en runtime sobre los registros cargados,
 * de modo que `src/data/catalog.json` permanece como fuente histórica intacta.
 */

/**
 * Parsea el campo `artist` para extraer la lista de artistas individuales.
 * Maneja formatos como:
 *  - "Varios Artistas (Trío Huaricancha, Rodolfo y su Típica RA7, Lisandro Meza)"
 *  - "Fruko y sus Tesos"  → ["Fruko y sus Tesos"] (sin paréntesis = 1 artista)
 *
 * NOTA: el separador " y " solo se aplica DENTRO de los paréntesis, así que
 * "Fruko y sus Tesos" jamás se rompe en dos.
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
    // Descartar marcadores de abreviación presentes en el catálogo ("etc.")
    .filter((a) => !/^etc\.?$/i.test(a));

  return artists.length > 0 ? artists : [original];
}

/**
 * Extrae el género desde las observaciones cuando el registro no lo trae.
 * Regla determinista con prioridad de detección (el orden importa).
 */
export function extractGenre(notes: string): string {
  if (!notes) return "Sin clasificar";
  const lower = notes.toLowerCase();

  if (lower.includes("cumbia")) return "Cumbia";
  if (lower.includes("bolero")) return "Bolero";
  if (lower.includes("tango")) return "Tango";
  if (lower.includes("salsa")) return "Salsa";
  if (lower.includes("vallenato")) return "Vallenato";
  if (lower.includes("porro")) return "Porro";
  if (lower.includes("guaracha")) return "Guaracha";
  if (lower.includes("balada")) return "Balada";
  if (lower.includes("paseo")) return "Paseo";
  if (lower.includes("merengue")) return "Merengue";
  if (lower.includes("ranchera")) return "Ranchera";
  if (lower.includes("pasillo")) return "Pasillo";
  if (lower.includes("bambuco")) return "Bambuco";
  if (lower.includes("tropical")) return "Tropical";
  if (lower.includes("pop")) return "Pop";
  if (lower.includes("rock")) return "Rock";
  if (lower.includes("jazz")) return "Jazz";
  if (lower.includes("clásic") || lower.includes("sinfónic")) return "Clásica";

  return "Sin clasificar";
}

/**
 * Enriquece el catálogo en runtime:
 *  - deriva `artists` desde el campo `artist`
 *  - completa `genre` desde las observaciones si el registro no lo trae
 *    (los registros con género existente se conservan tal cual)
 */
export function enrichCatalogWithArtists(vinyls: Vinyl[]): Vinyl[] {
  return vinyls.map((vinyl) => ({
    ...vinyl,
    artists: parseArtists(vinyl.artist),
    genre: vinyl.genre || extractGenre(vinyl.notes || ""),
  }));
}
