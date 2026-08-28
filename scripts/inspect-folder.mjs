#!/usr/bin/env node
/**
 * FASE 1 — Inspección de la carpeta de fotos.
 *
 * Uso:
 *   node scripts/inspect-folder.mjs [ruta-carpeta]
 *
 * 1. Lista recursivamente todas las imágenes (jpg/jpeg/png/webp).
 * 2. Propone una clasificación por NOMBRE DE ARCHIVO (heurística):
 *      GAL_A / GAL_B / CAR_A / CAR_B / GAL_COMBO / CAR_COMBO
 * 3. Intenta asociar cada imagen a un vinilo del catálogo (vin-001…vin-050)
 *    por id explícito, número de carpeta o coincidencia artista/álbum.
 * 4. Escribe scripts/image-mapping.draft.json para que lo revises/edites
 *    (con tu visor de imágenes) y lo guardes como image-mapping.json.
 *
 * IMPORTANTE: la clasificación definitiva (qué foto es cada cosa) requiere
 * ver las imágenes. Este script solo propone; tú confirmas editando el JSON.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { extname, join, relative, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_FOLDER = "C:\\Users\\willi\\OneDrive\\PROYECTO SOW\\MINI APPS\\App-Cetatos";
const folder = resolve(process.argv[2] ?? DEFAULT_FOLDER);

if (!existsSync(folder)) {
  console.error(`❌ No se encontró la carpeta: ${folder}`);
  console.error("   Pasa la ruta como argumento: node scripts/inspect-folder.mjs \"RUTA\"");
  process.exit(1);
}

const catalog = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/data/catalog.json", import.meta.url)), "utf8")
);
const pad = (n) => `vin-${String(n).padStart(3, "0")}`;
const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const TYPES = ["CAR_A", "CAR_B", "GAL_A", "GAL_B", "CAR_COMBO", "GAL_COMBO"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

function guessVinyl(relPath) {
  const n = norm(relPath);
  // 1) id explícito: vin-001, vin_12, vinilo 7…
  const m = n.match(/vin(?:ilo)?[-_ .]?0*(\d{1,3})/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 999) return { id: pad(num), reason: "id en el nombre", conf: "alta" };
  }
  // 2) carpeta numerada: "001 - Los Corraleros", "12. Album"
  const parts = relPath.split(/[\\/]/).map((p) => norm(p));
  const dirNum = parts.find((p) => /^0*\d{1,3}[\s._-]/.test(p));
  if (dirNum) {
    const num = parseInt(dirNum.match(/^0*(\d{1,3})/)[1], 10);
    if (num >= 1 && num <= 999)
      return { id: pad(num), reason: `carpeta "${dirNum}"`, conf: "media" };
  }
  // 3) coincidencia por tokens de artista/álbum
  let best = null;
  let bestScore = 0;
  for (const v of catalog) {
    for (const field of [v.artist, v.album]) {
      const tokens = norm(field).split(/[^a-z0-9]+/).filter((t) => t.length > 3);
      if (!tokens.length) continue;
      const hits = tokens.filter((t) => n.includes(t)).length;
      const score = hits / tokens.length;
      if (score > bestScore) {
        bestScore = score;
        best = {
          id: v.id,
          reason: `≈ ${v.artist} / ${v.album} (${Math.round(score * 100)}%)`,
          conf: score >= 0.6 ? "media" : "baja",
        };
      }
    }
  }
  if (best && bestScore >= 0.34) return best;
  return null;
}

function guessType(fileName) {
  const n = norm(basename(fileName));
  const combo =
    /(combo|combinad|ambas|ambos|juntas|juntos|a\s*y\s*b|a\s*\+\s*b)/.test(n) ||
    /2\s*(galletas|caratulas|fotos)/.test(n) ||
    /[_\-. ]ab[_\-. ]/.test(n);
  const label = /(galleta|gal[_\-. ]|label|etiqueta)/.test(n);
  const cover =
    /(caratula|car[_\-. ]|cover|portada|funda|sleeve|frente|frontal)/.test(n);
  const back =
    /(trasera|tras[_\-. ]|back|contraportada|reverso|posterior)/.test(n) ||
    /[_\-. ](b|2)(?![a-z0-9])/.test(n);
  const front =
    /(frontal|frente|front|delantera|principal)/.test(n) ||
    /[_\-. ](a|1)(?![a-z0-9])/.test(n);

  if (label && combo) return { type: "GAL_COMBO", conf: "media" };
  if (cover && combo) return { type: "CAR_COMBO", conf: "media" };
  if (label) return { type: back ? "GAL_B" : "GAL_A", conf: back || front ? "media" : "baja" };
  if (cover) return { type: back ? "CAR_B" : "CAR_A", conf: back || front ? "media" : "baja" };
  if (back) return { type: "CAR_B", conf: "baja" };
  if (front) return { type: "CAR_A", conf: "baja" };
  return { type: null, conf: "—" };
}

/* ── Recorrido ─────────────────────────────────────────────── */
const files = walk(folder);
console.log(`\n📂 Carpeta: ${folder}`);
console.log(`🖼  Imágenes encontradas: ${files.length}\n`);

const rows = [];
const noAplica = [];
for (const abs of files) {
  const rel = relative(folder, abs);
  const size = (statSync(abs).size / 1024).toFixed(0);
  const vinyl = guessVinyl(rel);
  const { type, conf } = guessType(rel);
  if (!vinyl || !type) noAplica.push(rel);
  rows.push({ rel, kb: size, vinyl: vinyl?.id ?? "NO_APLICA", reason: vinyl?.reason ?? "—", type: type ?? "SIN_CLASIFICAR", conf });
}

const w = { rel: Math.min(58, Math.max(...rows.map((r) => r.rel.length), 10)), id: 9, type: 12 };
console.log(
  `${"Archivo".padEnd(w.rel)}  ${"Vinilo".padEnd(w.id)} ${"Tipo".padEnd(w.type)} Conf.  Razón`
);
console.log("─".repeat(110));
for (const r of rows) {
  console.log(
    `${r.rel.slice(0, w.rel).padEnd(w.rel)}  ${r.vinyl.padEnd(w.id)} ${r.type.padEnd(w.type)} ${r.conf.padEnd(6)} ${r.reason}`
  );
}

/* ── Borrador de mapeo ─────────────────────────────────────── */
const draft = {};
const conflicts = [];
for (const r of rows) {
  if (r.vinyl === "NO_APLICA" || r.type === "SIN_CLASIFICAR" || !TYPES.includes(r.type)) continue;
  draft[r.vinyl] ??= {};
  if (draft[r.vinyl][r.type]) {
    conflicts.push(`${r.vinyl}/${r.type}: "${draft[r.vinyl][r.type]}" vs "${r.rel}"`);
    continue;
  }
  draft[r.vinyl][r.type] = join(folder, r.rel);
}

const out = fileURLToPath(new URL("./image-mapping.draft.json", import.meta.url));
writeFileSync(out, JSON.stringify(draft, null, 2) + "\n");

/* ── Resumen ───────────────────────────────────────────────── */
const byVinyl = Object.entries(draft).map(([id, e]) => ({
  id,
  n: Object.keys(e).length,
  combo: Boolean(e.GAL_COMBO || e.CAR_COMBO),
}));
const con4 = byVinyl.filter((v) => v.n >= 4 && !v.combo).length;
const con2 = byVinyl.filter((v) => v.combo || v.n === 2).length;
const otros = byVinyl.length - con4 - con2;
const sinFoto = catalog.length - byVinyl.length;

console.log("\n" + "═".repeat(110));
console.log("📋 RESUMEN (propuesta automática — REVISAR con las imágenes abiertas)");
console.log(`   Vinilos con propuesta: ${byVinyl.length} / ${catalog.length}`);
console.log(`   ≈ 4 fotos individuales: ${con4}   ·   ≈ 2 combinadas: ${con2}   ·   parciales: ${otros}   ·   sin foto: ${sinFoto}`);
if (noAplica.length) {
  console.log(`\n⚠ ${noAplica.length} archivo(s) sin clasificar (posible NO_APLICA):`);
  noAplica.slice(0, 20).forEach((f) => console.log(`   - ${f}`));
}
if (conflicts.length) {
  console.log(`\n⚠ Conflictos (2 archivos para el mismo slot — resuélvelos a mano):`);
  conflicts.forEach((c) => console.log(`   - ${c}`));
}
console.log(`\n✅ Borrador escrito en: scripts/image-mapping.draft.json`);
console.log("👉 Revísalo ABRIENDO cada imagen, corrige tipos/vinilos, y guárdalo como");
console.log("   scripts/image-mapping.json. Luego: node scripts/upload-to-cloudinary.mjs\n");
