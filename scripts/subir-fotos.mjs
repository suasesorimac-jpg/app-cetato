#!/usr/bin/env node
/**
 * FASE 2 · Pasos 10-11 — Sube las imágenes de fotos/Imagenes - AppCetatos/
 * a Cloudinary y actualiza src/data/catalog.json.
 *
 * Uso (desde la raíz del repo):
 *   node scripts/subir-fotos.mjs                # sube + aplica al catálogo
 *   node scripts/subir-fotos.mjs --solo-subir   # solo sube, no toca catalog.json
 *
 * Lee mapeo-fotos.json (raíz del repo):
 *   [{ "archivo", "ruta", "vin_id": "vin-XXX" | null, "tipo": "CAR_A|CAR_B|GAL_A|GAL_B|CAR_COMBO|GAL_COMBO|NO_APLICA" }]
 *
 * Reglas:
 *  - tipo NO_APLICA o vin_id null → se omite (no se sube)
 *  - public_id determinista: {vin_id}_{tipo}  (ej. vin-004_GAL_A)
 *  - Preset UNSIGNED: NO se envía overwrite (error 400). Si el public_id ya
 *    existe en Cloudinary, se reutiliza y la respuesta sigue siendo HTTP 200.
 *  - Verifica HTTP 200 + public_id en cada respuesta.
 *  - Si dos archivos del mapeo apuntan al MISMO public_id (caso vin-007 GAL_A),
 *    se advierte: el primero subido gana; el segundo recibe el asset existente.
 *  - Catálogo (modelo ORIGINAL de 2 slots, solo con subidas OK):
 *      coverImageId = CAR_A ?? CAR_COMBO
 *      labelImageId = GAL_A ?? GAL_COMBO
 *    (CAR_B / GAL_B se suben pero el modelo de 2 slots no los referencia)
 *  - NO toca metadatos (artista, álbum, sello, matriz, año, género).
 *
 * Env (opcional): CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "fcnzjtqx";
const PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "appcetato_unsigned";
const ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;
const TIPOS_VALIDOS = ["CAR_A", "CAR_B", "GAL_A", "GAL_B", "CAR_COMBO", "GAL_COMBO"];

const MAPEO_PATH = join(root, "mapeo-fotos.json");
const CATALOGO_PATH = join(root, "src", "data", "catalog.json");

const soloSubir = process.argv.includes("--solo-subir");

if (!existsSync(MAPEO_PATH)) {
  console.error("❌ Falta mapeo-fotos.json en la raíz del repo.");
  process.exit(1);
}

const mapeo = JSON.parse(readFileSync(MAPEO_PATH, "utf8"));

const subibles = [];
let omitidas = 0;
const vistos = new Map(); // publicId → primer archivo

for (const entry of mapeo) {
  if (!entry.vin_id || !TIPOS_VALIDOS.includes(entry.tipo)) {
    omitidas++; // NO_APLICA / sin disco
    continue;
  }
  const publicId = `${entry.vin_id}_${entry.tipo}`;
  const ruta = entry.ruta ? join(root, entry.ruta) : join(root, "fotos", "Imagenes - AppCetatos", entry.archivo);
  if (vistos.has(publicId)) {
    console.log(`⚠  ${publicId}: dos archivos en el mapeo ("${vistos.get(publicId)}" y "${entry.archivo}").`);
    console.log(`   El primero subido gana; el segundo recibirá el asset existente (preset unsigned, sin overwrite).`);
  } else {
    vistos.set(publicId, entry.archivo);
  }
  subibles.push({ archivo: entry.archivo, ruta, vinId: entry.vin_id, tipo: entry.tipo, publicId });
}

console.log(`\n☁  Cloudinary: ${CLOUD} · preset unsigned: ${PRESET}`);
console.log(`📦 Entradas en mapeo: ${mapeo.length} · a subir: ${subibles.length} · NO_APLICA omitidas: ${omitidas}\n`);

const porVin = {}; // vinId → { CAR_A?: publicId, ... } (solo verificados)
let ok = 0;
let fallos = 0;
const fallosDetalle = [];

for (const item of subibles) {
  if (!existsSync(item.ruta)) {
    fallos++;
    fallosDetalle.push(`${item.publicId} — archivo no encontrado: ${item.ruta}`);
    console.log(`❌ ${item.publicId.padEnd(18)} archivo no encontrado`);
    continue;
  }
  try {
    const buf = readFileSync(item.ruta);
    const fd = new FormData();
    fd.append("file", new Blob([buf]), item.archivo);
    fd.append("upload_preset", PRESET);
    fd.append("public_id", item.publicId);
    // ⚠ SIN overwrite: preset unsigned → ese parámetro produce HTTP 400.

    const res = await fetch(ENDPOINT, { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    const verificado = res.status === 200 && body.public_id === item.publicId;

    if (verificado) {
      ok++;
      (porVin[item.vinId] ??= {})[item.tipo] = item.publicId;
      console.log(`✅ ${item.publicId.padEnd(18)} ← ${item.archivo.slice(0, 64)}  (HTTP 200 ✓)`);
    } else {
      fallos++;
      const msg = body?.error?.message ?? `HTTP ${res.status}`;
      fallosDetalle.push(`${item.publicId} — ${msg}`);
      console.log(`❌ ${item.publicId.padEnd(18)} ← ${msg}`);
    }
  } catch (err) {
    fallos++;
    fallosDetalle.push(`${item.publicId} — ${err?.message ?? err}`);
    console.log(`❌ ${item.publicId.padEnd(18)} ← ${err?.message ?? err}`);
  }
}

/* ── Paso 11: catalog.json (solo campos de imagen, solo subidas verificadas) ── */
let discosActualizados = 0;
if (!soloSubir && existsSync(CATALOGO_PATH)) {
  const catalogo = JSON.parse(readFileSync(CATALOGO_PATH, "utf8"));
  for (const v of catalogo) {
    const up = porVin[v.id];
    if (!up) continue;
    const cover = up.CAR_A ?? up.CAR_COMBO ?? null;
    const label = up.GAL_A ?? up.GAL_COMBO ?? null;
    if (cover) v.coverImageId = cover;
    if (label) v.labelImageId = label;
    discosActualizados++;
  }
  writeFileSync(CATALOGO_PATH, JSON.stringify(catalogo, null, 1) + "\n");
}

console.log("\n" + "═".repeat(72));
console.log("📊 RESUMEN FASE 2");
console.log(`   ✅ Subidas verificadas (HTTP 200 + public_id): ${ok}`);
console.log(`   ❌ Fallos: ${fallos}`);
console.log(`   ⏭  NO_APLICA omitidas: ${omitidas}`);
if (!soloSubir) {
  console.log(`   💾 Discos con campos de imagen actualizados: ${discosActualizados}`);
}
if (fallosDetalle.length) {
  console.log("\n   Detalle de fallos:");
  fallosDetalle.forEach((f) => console.log("    • " + f));
}
console.log("\n👉 Verificación: npm run typecheck && npm run build");
console.log('   Commit: git add -A && git commit -m "feat(fotos): subida Cloudinary + catálogo sincronizado" && git push\n');
process.exitCode = fallos > 0 ? 1 : 0;
