import type { CSVRow, ImportResult, Vinyl } from "../types";
import { extractGenre, parseArtists } from "./catalogParser";

/**
 * Import / Export del catálogo en formato DeepSeek (CSV con separador `;`)
 * y exportación PDF mediante ventana de impresión.
 */

export const CSV_HEADERS = [
  "#",
  "Artista",
  "Título",
  "Sello",
  "Catálogo",
  "Año",
  "País",
  "Formato",
  "Velocidad",
  "Carátula",
  "Disco",
  "Observaciones",
] as const;

/* ─────────────────────────── EXPORTAR CSV ─────────────────────────── */

/** Escapa una celda: entre comillas, con comillas internas duplicadas. */
function escapeCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Genera el CSV (separador `;`). El BOM UTF-8 lo añade quien descarga. */
export function exportToCSV(vinyls: Vinyl[]): string {
  const rows = vinyls.map((v) => [
    v.id,
    v.artist,
    v.album,
    v.label,
    v.matrixCode,
    v.year === "N/E" ? "s/f" : String(v.year),
    v.country ?? "",
    v.physicalFormat ?? "",
    v.speed ?? "",
    v.coverCondition?.toString() ?? "",
    v.discCondition?.toString() ?? "",
    v.notes ?? "",
  ]);
  return [CSV_HEADERS.join(";"), ...rows.map((r) => r.map(escapeCell).join(";"))].join("\n");
}

/* ─────────────────────────── EXPORTAR PDF ─────────────────────────── */

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Abre una ventana de impresión con la tabla del catálogo. */
export function exportToPDF(vinyls: Vinyl[]): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false; /* el navegador bloqueó el popup */

  const body = vinyls
    .map(
      (v) => `
        <tr>
          <td>${escapeHtml(v.id)}</td>
          <td>${escapeHtml(v.artist)}</td>
          <td>${escapeHtml(v.album)}</td>
          <td>${escapeHtml(v.label)}</td>
          <td class="matrix">${escapeHtml(v.matrixCode)}</td>
          <td>${v.year === "N/E" ? "s/f" : escapeHtml(v.year)}</td>
          <td>${escapeHtml(v.genre)}</td>
          <td>${escapeHtml(v.country || "-")}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Catálogo AppCetato</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
    h1 { color: #d97706; font-size: 24px; margin: 0; }
    .meta { color: #64748b; font-size: 12px; margin: 6px 0 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background-color: #0f172a; color: #fff; font-weight: 600; }
    tr:nth-child(even) { background-color: #f1f5f9; }
    .matrix { font-family: monospace; color: #b45309; white-space: nowrap; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>AppCetato — Catálogo de Vinilos</h1>
  <p class="meta">Total: ${vinyls.length} vinilos · Exportado: ${new Date().toLocaleDateString("es-CO")}</p>
  <table>
    <thead>
      <tr><th>#</th><th>Artista</th><th>Álbum</th><th>Sello</th><th>Matriz</th><th>Año</th><th>Género</th><th>País</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  window.setTimeout(() => printWindow.print(), 500);
  return true;
}

/* ─────────────────────────── IMPORTAR CSV ─────────────────────────── */

/**
 * Parser CSV con separador `;` que respeta campos entre comillas:
 * comillas escapadas (""), separadores y saltos de línea internos,
 * y BOM UTF-8 al inicio del archivo.
 */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ";") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);

  /* Descarta líneas completamente vacías */
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Normaliza un encabezado (minúsculas, sin tildes) para mapear columnas. */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const KEY_BY_HEADER: Record<string, keyof CSVRow> = {
  "#": "#",
  id: "#",
  artista: "Artista",
  artist: "Artista",
  titulo: "Título",
  album: "Título",
  title: "Título",
  sello: "Sello",
  label: "Sello",
  catalogo: "Catálogo",
  matriz: "Catálogo",
  matrix: "Catálogo",
  ano: "Año",
  year: "Año",
  pais: "País",
  country: "País",
  formato: "Formato",
  velocidad: "Velocidad",
  speed: "Velocidad",
  caratula: "Carátula",
  disco: "Disco",
  observaciones: "Observaciones",
  notes: "Observaciones",
};

function mapSpeed(raw: string): "33⅓" | "45" | "78" | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (s.startsWith("33")) return "33⅓";
  if (s.startsWith("45")) return "45";
  if (s.startsWith("78")) return "78";
  return undefined;
}

function parseCondition(raw: string): number | "s/c" | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  if (s === "s/c") return "s/c";
  const n = parseFloat(s);
  return Number.isNaN(n) ? undefined : n;
}

/** Convierte una fila CSV (formato DeepSeek) en un registro del catálogo. */
function rowToVinyl(row: CSVRow, fallbackId: string): Vinyl {
  const yearRaw = row["Año"].trim();
  const yearNum = parseInt(yearRaw, 10);
  const year: number | "N/E" =
    yearRaw && yearRaw.toLowerCase() !== "s/f" && !Number.isNaN(yearNum) ? yearNum : "N/E";

  const speed = mapSpeed(row["Velocidad"]);
  const physicalFormatRaw = row["Formato"].trim().toLowerCase();
  const physicalFormat: "LP" | "Single" | undefined =
    physicalFormatRaw === "lp" ? "LP" : physicalFormatRaw === "single" ? "Single" : undefined;

  const notes = row["Observaciones"].trim() || undefined;

  return {
    id: row["#"].trim() || fallbackId,
    artist: row["Artista"].trim(),
    artists: parseArtists(row["Artista"]),
    album: row["Título"].trim(),
    label: row["Sello"].trim(),
    matrixCode: row["Catálogo"].trim(),
    year,
    /* El CSV no trae género: se extrae de las observaciones */
    genre: notes ? extractGenre(notes) : "Sin clasificar",
    format: speed === "45" ? "45 RPM" : speed === "78" ? "78 RPM" : "33 RPM",
    country: row["País"].trim() || undefined,
    physicalFormat,
    speed,
    coverCondition: parseCondition(row["Carátula"]),
    discCondition: parseCondition(row["Disco"]),
    notes,
    dateAdded: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Importa un CSV de DeepSeek sobre el catálogo existente:
 *  - si la matriz (o el id) ya existe → **actualiza** sin perder fotos,
 *    fecha de ingreso ni género documental;
 *  - si no existe → **agrega** el registro nuevo.
 */
export function importFromCSV(
  csvContent: string,
  existingVinyls: Vinyl[]
): { result: ImportResult; updatedVinyls: Vinyl[] } {
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    return {
      result: { total: 0, imported: 0, updated: 0, skipped: 0, errors: ["Archivo CSV vacío o inválido"] },
      updatedVinyls: existingVinyls,
    };
  }

  /* Detecta encabezados: si la primera fila trae nombres conocidos se usa
     como mapa de columnas; si no, se asume orden posicional DeepSeek. */
  let dataRows = rows;
  let columnMap: Array<keyof CSVRow | null> = CSV_HEADERS.map((h) => h);
  const firstNormalized = rows[0].map(normalizeHeader);
  if (firstNormalized.some((h) => h in KEY_BY_HEADER)) {
    columnMap = firstNormalized.map((h) => KEY_BY_HEADER[h] ?? null);
    dataRows = rows.slice(1);
  }

  const result: ImportResult = {
    total: dataRows.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  const updatedVinyls = [...existingVinyls];

  dataRows.forEach((cells, index) => {
    const lineNo = index + 2; /* línea real del archivo (1-indexada, con cabecera) */
    try {
      const row: CSVRow = {
        "#": "",
        Artista: "",
        Título: "",
        Sello: "",
        Catálogo: "",
        Año: "",
        País: "",
        Formato: "",
        Velocidad: "",
        Carátula: "",
        Disco: "",
        Observaciones: "",
      };
      columnMap.forEach((key, i) => {
        if (key) row[key] = (cells[i] ?? "").trim();
      });

      if (!row["Artista"] || !row["Título"]) {
        result.skipped++;
        result.errors.push(`Fila ${lineNo}: Artista o Título vacío`);
        return;
      }

      const newVinyl = rowToVinyl(row, `import_${Date.now()}_${lineNo}`);

      /* Coincidencia: primero por matriz, luego por id (nunca con matriz vacía) */
      const byMatrix = newVinyl.matrixCode
        ? updatedVinyls.findIndex((v) => v.matrixCode === newVinyl.matrixCode)
        : -1;
      const byId = byMatrix < 0 ? updatedVinyls.findIndex((v) => v.id === newVinyl.id) : -1;
      const existingIndex = byMatrix >= 0 ? byMatrix : byId;

      if (existingIndex >= 0) {
        const prev = updatedVinyls[existingIndex];
        updatedVinyls[existingIndex] = {
          ...prev,
          ...newVinyl,
          /* El CSV no transporta estos datos: se conserva lo existente */
          genre: newVinyl.notes ? newVinyl.genre : prev.genre,
          dateAdded: prev.dateAdded,
          coverImageId: prev.coverImageId,
          coverBackImageId: prev.coverBackImageId,
          labelAImageId: prev.labelAImageId,
          labelBImageId: prev.labelBImageId,
          labelImageId: prev.labelImageId,
        };
        result.updated++;
      } else {
        updatedVinyls.push(newVinyl);
        result.imported++;
      }
    } catch (error) {
      result.skipped++;
      result.errors.push(
        `Fila ${lineNo}: error al procesar — ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  return { result, updatedVinyls };
}
