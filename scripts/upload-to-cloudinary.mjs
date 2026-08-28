#!/usr/bin/env node
/**
 * FASE 3 — Subida de imágenes a Cloudinary con public_id DETERMINISTA.
 *
 * Uso:
 *   node scripts/upload-to-cloudinary.mjs [mapeo.json] [carpeta-base]
 *
 * Lee scripts/image-mapping.json con la forma:
 *   { "vin-001": { "CAR_A": "ruta/absoluta.jpg", "GAL_COMBO": "..." }, ... }
 *
 * Por cada entrada hace:
 *   POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
 *   multipart: file, upload_preset=<preset unsigned>, public_id=vin-XXX_TIPO,
 *              overwrite=true
 *
 * Verifica HTTP 200 y que la respuesta devuelva el public_id esperado.
 * Escribe scripts/upload-report.json (lo consume apply-mapping.mjs).
 *
 * Credenciales por env (opcional; por defecto las del proyecto):
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "fcnzjtqx";
const PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "appcetato_unsigned";
const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;
const TYPES = ["CAR_A", "CAR_B", "GAL_A", "GAL_B", "CAR_COMBO", "GAL_COMBO"];

const mappingFile = resolve(process.argv[2] ?? "scripts/image-mapping.json");
const baseDir = process.argv[3] ? resolve(process.argv[3]) : null;

if (!existsSync(mappingFile)) {
  console.error(`❌ No existe ${mappingFile}`);
  console.error(
    "   Ejecuta primero: node scripts/inspect-folder.mjs  y guarda el borrador revisado como image-mapping.json"
  );
  process.exit(1);
}

const mapping = JSON.parse(readFileSync(mappingFile, "utf8"));
const report = {};
const byType = {};
let okCount = 0;
let failCount = 0;
let skipped = 0;

const entries = Object.entries(mapping);
console.log(`\n☁  Cloudinary: ${CLOUD} · preset: ${PRESET}`);
console.log(`📤 Vinilos en el mapeo: ${entries.length}\n`);

for (const [vinId, slots] of entries) {
  report[vinId] = {};
  for (const [type, relPath] of Object.entries(slots)) {
    if (!TYPES.includes(type)) {
      console.warn(`⚠  ${vinId}: tipo "${type}" no reconocido — omitido`);
      skipped++;
      continue;
    }
    const file = isAbsolute(relPath) ? relPath : baseDir ? join(baseDir, relPath) : resolve(relPath);
    const publicId = `${vinId}_${type}`;

    if (!existsSync(file)) {
      failCount++;
      report[vinId][type] = { publicId, status: 0, ok: false, url: null, error: `Archivo no encontrado: ${file}` };
      console.log(`❌ ${publicId} — archivo no encontrado: ${file}`);
      continue;
    }

    try {
      const buf = readFileSync(file);
      const fd = new FormData();
      fd.append("file", new Blob([buf]), basename(file));
      fd.append("upload_preset", PRESET);
      fd.append("public_id", publicId);
      fd.append("overwrite", "true");
      fd.append("context", "app=appcetato");

      const res = await fetch(ENDPOINT, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      const ok = res.status === 200 && body.public_id === publicId;

      report[vinId][type] = {
        publicId,
        status: res.status,
        ok,
        url: body.secure_url ?? null,
        error: ok ? undefined : body?.error?.message ?? `HTTP ${res.status}`,
      };

      if (ok) {
        okCount++;
        byType[type] = (byType[type] ?? 0) + 1;
        console.log(`✅ ${publicId.padEnd(18)} ← ${basename(file)}  (HTTP 200)`);
      } else {
        failCount++;
        console.log(
          `❌ ${publicId.padEnd(18)} ← ${basename(file)}  (HTTP ${res.status}: ${report[vinId][type].error})`
        );
      }
    } catch (err) {
      failCount++;
      report[vinId][type] = { publicId, status: 0, ok: false, url: null, error: String(err?.message ?? err) };
      console.log(`❌ ${publicId.padEnd(18)} — ${err?.message ?? err}`);
    }
  }
}

const reportPath = fileURLToPath(new URL("./upload-report.json", import.meta.url));
writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

console.log("\n" + "═".repeat(70));
console.log("📊 RESUMEN DE SUBIDA");
console.log(`   ✅ OK: ${okCount}   ❌ Fallos: ${failCount}   ⚠ Omitidos: ${skipped}`);
console.log("   Por tipo:");
for (const t of TYPES) console.log(`     ${t.padEnd(10)} ${byType[t] ?? 0}`);
console.log(`\n📄 Reporte: scripts/upload-report.json`);
if (failCount === 0 && okCount > 0) {
  console.log("👉 Siguiente paso: node scripts/apply-mapping.mjs\n");
} else if (failCount > 0) {
  console.log("⚠ Revisa los fallos arriba antes de continuar.\n");
}
process.exitCode = failCount > 0 ? 1 : 0;
