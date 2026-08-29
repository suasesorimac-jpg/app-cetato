#!/usr/bin/env node
/**
 * RESET DEL REPOSITORIO — elimina lo que hay en GitHub y sube esta carpeta desde cero.
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/push-fresh.mjs
 *
 * Qué hace:
 *   1. Inicializa git si hace falta y fija la rama `main`.
 *   2. `git add -A` + commit de todo el estado actual.
 *   3. Apunta `origin` a https://github.com/suasesorimac-jpg/app-cetato.git
 *   4. `git push --force -u origin main`  → reemplaza TODO el historial remoto
 *      por esta única versión limpia.
 *   5. Borra en el remoto las ramas y tags que no sean `main`
 *      (restos de pushes anteriores).
 *   6. Muestra el estado final (`git ls-remote`) para verificar.
 *
 * Si Git pide credenciales, se abrirá el navegador para iniciar sesión
 * en GitHub (cuenta suasesorimac-jpg): acéptalo.
 *
 * IMPORTANTE: si la rama por defecto del repo en GitHub era otra (p. ej.
 * `master`), tras el borrado entra en GitHub → Settings → Branches →
 * Default branch y selecciona `main`.
 */
import { execSync } from "node:child_process";

const ORIGIN_URL = "https://github.com/suasesorimac-jpg/app-cetato.git";
const KEEP_BRANCH = "main";
const COMMIT_MSG = "feat: App-Cetato v2 — catálogo maestro con 4 slots de foto por disco";

let failed = false;

function run(cmd, { optional = false, silent = false } = {}) {
  if (!silent) console.log(`\n$ ${cmd}`);
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
    if (out && !silent) console.log(out);
    return out;
  } catch (err) {
    const stderr = (err.stderr || "").toString().trim();
    if (optional) {
      if (stderr) console.log(`   (omitido: ${stderr.split("\n")[0]})`);
      return "";
    }
    console.error(`\n✖ El comando falló: ${cmd}`);
    if (stderr) console.error(stderr);
    failed = true;
    process.exit(1);
  }
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("  APPCETATO · reset del repositorio y push desde cero");
console.log(`  Destino: ${ORIGIN_URL}`);
console.log("═══════════════════════════════════════════════════════════════");

/* 1 ── git init + rama main ─────────────────────────────────── */
const inRepo = run("git rev-parse --is-inside-work-tree", { optional: true, silent: true });
if (inRepo !== "true") {
  run("git init");
}
run("git branch -M " + KEEP_BRANCH, { optional: true });

/* 2 ── commit del estado actual ─────────────────────────────── */
run("git add -A");
const status = run("git status --porcelain", { silent: true });
const hasCommits = run("git log -1 --oneline", { optional: true, silent: true });
if (status || !hasCommits) {
  run(`git commit -m "${COMMIT_MSG}"`);
} else {
  console.log("\n$ (sin cambios pendientes: se reutiliza el último commit)");
  run("git log -1 --oneline");
}

/* 3 ── remote origin ────────────────────────────────────────── */
const currentRemote = run("git remote get-url origin", { optional: true, silent: true });
if (currentRemote !== ORIGIN_URL) {
  if (currentRemote) run(`git remote set-url origin ${ORIGIN_URL}`);
  else run(`git remote add origin ${ORIGIN_URL}`);
  console.log(`   origin → ${ORIGIN_URL}`);
} else {
  console.log(`\n$ origin ya apunta a ${ORIGIN_URL}`);
}

/* 4 ── force push: reemplaza todo el historial remoto ───────── */
console.log("\n⚠  Sobrescribiendo el contenido remoto con esta versión…");
run(`git push --force -u origin ${KEEP_BRANCH}`);

/* 5 ── limpieza de ramas/tags antiguos en el remoto ─────────── */
const heads = run("git ls-remote --heads origin", { silent: true });
for (const line of heads.split("\n")) {
  const m = line.match(/refs\/heads\/(.+)$/);
  if (m && m[1] !== KEEP_BRANCH) {
    console.log(`\n🧹 Borrando rama remota antigua: ${m[1]}`);
    run(`git push origin --delete "${m[1]}"`, { optional: true });
  }
}
const tags = run("git ls-remote --tags origin", { silent: true });
for (const line of tags.split("\n")) {
  const m = line.match(/refs\/tags\/(.+?)(\^\{\})?$/);
  if (m && !m[2]) {
    console.log(`\n🧹 Borrando tag remoto antiguo: ${m[1]}`);
    run(`git push origin --delete "refs/tags/${m[1]}"`, { optional: true });
  }
}

/* 6 ── verificación final ───────────────────────────────────── */
console.log("\n───────────────────────────────────────────────────────────────");
console.log("✅ PUSH COMPLETADO — estado final del remoto:");
run("git ls-remote origin");
console.log("\n📌 Commit local subido:");
run("git log -1 --pretty=format:'%h  %s  (%ci)'");
console.log("\n\n🌐 Verifica en: https://github.com/suasesorimac-jpg/app-cetato");
console.log(
  "   Debes ver: package.json, src/, public/, scripts/… y NO node_modules/ ni dist/."
);
console.log(
  "   Si GitHub aún apunta a otra rama por defecto: Settings → Branches → Default → main."
);

if (failed) process.exit(1);
