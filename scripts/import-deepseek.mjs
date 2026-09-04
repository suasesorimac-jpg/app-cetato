#!/usr/bin/env node
/**
 * Migración del catálogo DeepSeek → src/data/catalog.json
 *
 * Uso:
 *   node scripts/import-deepseek.mjs ruta/al/deepseek.csv
 *
 * Columnas esperadas (con o sin cabecera):
 *   #, Artista, Título, Sello, Catálogo, Año, País, Formato, Velocidad,
 *   Carátula, Disco, Observaciones
 *
 * Reglas de mapeo (especificación 1.2 / 1.3):
 *   #          → id (string)
 *   Artista    → artist
 *   Título     → album
 *   Sello      → label
 *   Catálogo   → matrixCode
 *   Año        → year ("s/f" → "N/E"; número → parseInt)
 *   País       → country
 *   Formato    → physicalFormat ("LP" | "Single")
 *   Velocidad  → speed ("33⅓" | "45" | "78") y format derivado ("33 RPM" | "45 RPM" | "78 RPM")
 *   Carátula   → coverCondition ("s/c" | número 1–5)
 *   Disco      → discCondition ("s/c" | número 1–5)
 *   Observaciones → notes; genre se EXTRA de aquí (extractGenre)
 *
 * Duplicados: se elimina cualquier fila cuyo Catálogo ya exista
 * (el registro #20 duplica al #4 con CBS-14529). Total esperado: 188.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const src = process.argv[2];
if (!src || !existsSync(resolve(src))) {
  console.error("Uso: node scripts/import-deepseek.mjs <ruta-al-csv-de-deepseek>");
  process.exit(1);
}

/* ── Parser CSV (soporta comillas, comas embebidas y separador , o ;) ── */
function parseCsv(text) {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) >
                (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

/* ── extractGenre: misma regla determinista que src/utils/catalogParser.ts ── */
function extractGenre(notes) {
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

const SPEED_TO_FORMAT = { "33⅓": "33 RPM", "33 1/3": "33 RPM", "33": "33 RPM", "45": "45 RPM", "78": "78 RPM" };
const today = new Date().toISOString().slice(0, 10);

const rows = parseCsv(readFileSync(resolve(src), "utf8"));
/* Detecta y descarta la fila de cabecera si existe */
const start = /^\s*#\s*$/i.test(rows[0]?.[0] ?? "") || /artista/i.test(rows[0]?.[1] ?? "") ? 1 : 0;

const seenCatalog = new Set();
const vinyls = [];
const dropped = [];

for (const r of rows.slice(start)) {
  const [num, artist, album, label, matrixCode, yearRaw, country, phys, speedRaw, coverRaw, discRaw, notesRaw] = r.map((c) => (c ?? "").trim());
  if (!artist || !matrixCode) continue;

  /* Duplicados por nº de catálogo (regla 1.4: el #20 repite CBS-14529 del #4) */
  if (seenCatalog.has(matrixCode)) {
    dropped.push({ num, artist, album, matrixCode });
    continue;
  }
  seenCatalog.add(matrixCode);

  const year = /^(s\/f|s\.f\.?|n\/e)?$/i.test(yearRaw) ? "N/E" : parseInt(yearRaw, 10);
  const speed = speedRaw.startsWith("33") ? "33⅓" : speedRaw === "45" ? "45" : speedRaw === "78" ? "78" : undefined;
  const cond = (raw) => {
    if (!raw) return undefined;
    if (/^s\/c$/i.test(raw)) return "s/c";
    const n = parseFloat(raw.replace(",", "."));
    return Number.isNaN(n) ? undefined : n;
  };
  const notes = notesRaw || undefined;

  vinyls.push({
    id: num || String(vinyls.length + 1),
    artist,
    album,
    label: label || "Sello independiente",
    matrixCode,
    year: Number.isNaN(year) ? "N/E" : year,
    genre: extractGenre(notes ?? ""),
    format: SPEED_TO_FORMAT[speed ?? ""] ?? "33 RPM",
    country: country || undefined,
    physicalFormat: /^lp$/i.test(phys) ? "LP" : /single|sencillo/i.test(phys) ? "Single" : undefined,
    speed,
    coverCondition: cond(coverRaw),
    discCondition: cond(discRaw),
    notes,
    dateAdded: today,
  });
}

const outPath = fileURLToPath(new URL("../src/data/catalog.json", import.meta.url));
writeFileSync(outPath, JSON.stringify(vinyls, null, 2) + "\n");

console.log("─".repeat(64));
console.log(`✅ Registros importados : ${vinyls.length}`);
console.log(`🗑  Duplicados eliminados: ${dropped.length}`);
dropped.forEach((d) => console.log(`   · #${d.num} ${d.artist} — ${d.album} (${d.matrixCode})`));
console.log(`💾 Escrito en           : src/data/catalog.json`);
const genres = {};
vinyls.forEach((v) => (genres[v.genre] = (genres[v.genre] ?? 0) + 1));
console.log("🎵 Géneros extraídos    :");
Object.entries(genres).sort((a, b) => b[1] - a[1]).forEach(([g, c]) => console.log(`   ${g.padEnd(16)} ${c}`));
console.log("─".repeat(64));
console.log("👉 Verifica con: npm run typecheck && npm run build");
