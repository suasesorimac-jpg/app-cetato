#!/usr/bin/env node
/**
 * FASE 4 — Aplica los public_id subidos a src/data/catalog.json.
 *
 * Uso:
 *   node scripts/apply-mapping.mjs
 *
 * Lee scripts/upload-report.json (generado por upload-to-cloudinary.mjs) y,
 * para cada vinilo con subidas OK:
 *   coverImageId     = CAR_A  ?? CAR_COMBO
 *   coverBackImageId = CAR_B  (solo si hay CAR_A; con combinada queda null)
 *   labelAImageId    = GAL_A  ?? GAL_COMBO
 *   labelBImageId    = GAL_B  (solo si hay GAL_A; con combinada queda null)
 *   (se elimina el campo heredado labelImageId)
 *
 * NO toca ningún metadato (artista, álbum, sello, matriz, año, género).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(new URL("../src/data/catalog.json", import.meta.url));
const reportPath = fileURLToPath(new URL("./upload-report.json", import.meta.url));

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const report = JSON.parse(readFileSync(reportPath, "utf8"));

const stats = { con4: 0, con2Combo: 0, parciales: 0, sinFoto: 0 };
const detail = [];

for (const v of catalog) {
  const up = report[v.id];
  const ok = (t) => (up?.[t]?.ok ? up[t].publicId : null);
  const carA = ok("CAR_A");
  const carB = ok("CAR_B");
  const carC = ok("CAR_COMBO");
  const galA = ok("GAL_A");
  const galB = ok("GAL_B");
  const galC = ok("GAL_COMBO");

  const hasAny = carA || carB || carC || galA || galB || galC;
  if (!hasAny) {
    delete v.labelImageId; // normaliza esquema aunque no tenga fotos
    stats.sinFoto++;
    continue;
  }

  v.coverImageId = carA ?? carC;
  v.coverBackImageId = carA ? carB : null;
  v.labelAImageId = galA ?? galC;
  v.labelBImageId = galA ? galB : null;
  delete v.labelImageId;

  const full = Boolean(carA && carB && galA && galB);
  const combined = Boolean(carC || galC);
  if (full) stats.con4++;
  else if (combined) stats.con2Combo++;
  else stats.parciales++;

  detail.push(
    `${v.id}  ${v.artist.slice(0, 28).padEnd(28)}  ` +
      `cover:${v.coverImageId ?? "—"} back:${v.coverBackImageId ?? "—"} ` +
      `galA:${v.labelAImageId ?? "—"} galB:${v.labelBImageId ?? "—"}`
  );
}

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");

console.log("\n📀 CATALOG.JSON ACTUALIZADO");
console.log("─".repeat(70));
detail.forEach((d) => console.log("  " + d));
console.log("─".repeat(70));
console.log(`   Con 4 fotos individuales : ${stats.con4}`);
console.log(`   Con fotos combinadas     : ${stats.con2Combo}`);
console.log(`   Parciales                : ${stats.parciales}`);
console.log(`   Sin foto (null)          : ${stats.sinFoto}`);
console.log(`\n👉 Verifica con: npm run typecheck && npm run build`);
console.log(`   y luego: git add -A && git commit -m "feat: fotos reales por disco (4 slots)" && git push origin main\n`);
