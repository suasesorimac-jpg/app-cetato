import type { Vinyl } from "../types";

/* ── Texto ──────────────────────────────────────────────── */

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function slugify(s: string): string {
  return normalizeText(s)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* ── Fechas / años ──────────────────────────────────────── */

export function formatYearShort(year: number | "N/E"): string {
  return year === "N/E" ? "N/E" : String(year);
}

export function formatYearLong(year: number | "N/E"): string {
  return year === "N/E" ? "No especificado" : String(year);
}

export function decadeOf(year: number | "N/E"): string | null {
  if (typeof year !== "number") return null;
  return `${Math.floor(year / 10) * 10}s`;
}

export function formatDateLong(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* noop */
  }
  return "vin-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ── RNG determinístico ─────────────────────────────────── */

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Arte generado (carátulas de referencia) ────────────── */

const PALETTES: Array<[string, string, string]> = [
  ["#7f1d1d", "#fbbf24", "#fde68a"],
  ["#0f3b36", "#f97316", "#ffedd5"],
  ["#1e3a5f", "#f59e0b", "#dbeafe"],
  ["#5c1a0b", "#fde68a", "#fffbeb"],
  ["#14532d", "#facc15", "#ecfdf5"],
  ["#713f12", "#fb923c", "#fef3c7"],
  ["#0c4a6e", "#fbbf24", "#e0f2fe"],
  ["#4c0519", "#fb7185", "#ffe4e6"],
  ["#3f2d1e", "#eab308", "#fef9c3"],
  ["#113a5d", "#f87171", "#fee2e2"],
  ["#134e4a", "#f59e0b", "#ccfbf1"],
  ["#78350f", "#f8fafc", "#fde68a"],
];

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function wrapTitle(title: string): string[] {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > 15 && current) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
    if (lines.length === 2) break;
  }
  if (current && lines.length < 3) lines.push(current.trim());
  return lines.slice(0, 3);
}

function patternSvg(kind: number, color: string): string {
  switch (kind) {
    case 0: {
      // rayos de sol
      let rays = "";
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const x = 200 + Math.cos(a) * 300;
        const y = 210 + Math.sin(a) * 300;
        rays += `<path d="M200,210 L${(200 + Math.cos(a + 0.14) * 300).toFixed(1)},${(
          210 + Math.sin(a + 0.14) * 300
        ).toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)} Z" fill="${color}"/>`;
      }
      return rays;
    }
    case 1: {
      // franjas horizontales
      let s = "";
      [70, 130, 190, 250].forEach((y) => {
        s += `<rect x="0" y="${y}" width="400" height="26" fill="${color}"/>`;
      });
      return s;
    }
    case 2: {
      // anillos concéntricos en esquina
      let s = "";
      [60, 100, 140, 180, 220].forEach((r) => {
        s += `<circle cx="330" cy="66" r="${r}" fill="none" stroke="${color}" stroke-width="12"/>`;
      });
      return s;
    }
    case 3: {
      // damas
      let s = "";
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++)
          if ((i + j) % 2 === 0)
            s += `<rect x="${i * 80}" y="${j * 80 + 40}" width="80" height="80" fill="${color}"/>`;
      return s;
    }
    case 4: {
      // diagonales
      let s = "";
      for (let i = -1; i < 6; i++)
        s += `<rect x="${i * 90 - 60}" y="-80" width="34" height="620" fill="${color}" transform="rotate(28 200 200)"/>`;
      return s;
    }
    default: {
      // puntos
      let s = "";
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++)
          s += `<circle cx="${40 + i * 66}" cy="${52 + j * 62}" r="10" fill="${color}"/>`;
      return s;
    }
  }
}

/** Carátula de referencia generada determinísticamente (400×400). */
export function sleeveDataUrl(v: Vinyl): string {
  const rng = mulberry32(hashString(v.id + v.artist + v.album));
  const [bg, accent, paper] = PALETTES[Math.floor(rng() * PALETTES.length)];
  const kind = Math.floor(rng() * 6);
  const lines = wrapTitle(v.album || "Sin título");
  const fontSize = lines.some((l) => l.length > 13) ? 34 : 42;
  const startY = 236;

  const title = lines
    .map(
      (l, i) =>
        `<text x="24" y="${startY + i * (fontSize + 6)}" font-family="'Arial Black',Arial,Helvetica,sans-serif" font-weight="900" font-size="${fontSize}" fill="${paper}" stroke="${bg}" stroke-width="6" paint-order="stroke" letter-spacing="1">${escapeXml(
          l
        )}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<rect width="400" height="400" fill="${bg}"/>
<g opacity="0.5">${patternSvg(kind, accent)}</g>
<rect x="10" y="10" width="380" height="380" fill="none" stroke="${paper}" stroke-opacity="0.4" stroke-width="2"/>
<text x="24" y="56" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="19" fill="${paper}" letter-spacing="3">${escapeXml(
    v.artist.toUpperCase().slice(0, 30)
  )}</text>
<rect x="24" y="66" width="64" height="4" fill="${accent}"/>
<text x="376" y="54" text-anchor="end" font-family="'Courier New',monospace" font-weight="700" font-size="13" fill="${paper}" opacity="0.85">${
    v.format === "33 RPM" ? "33⅓" : v.format.replace(" RPM", "")
  } R.P.M.</text>
${title}
<rect x="0" y="330" width="400" height="70" fill="#000000" opacity="0.34"/>
<text x="24" y="359" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="15" fill="${paper}" letter-spacing="1.5">${escapeXml(
    v.label.toUpperCase()
  )}</text>
<text x="24" y="381" font-family="'Courier New',monospace" font-size="12.5" fill="#ffffff" opacity="0.8">MATRIZ ${escapeXml(
    v.matrixCode
  )}</text>
<circle cx="356" cy="365" r="17" fill="${accent}"/>
<circle cx="356" cy="365" r="6" fill="${bg}"/>
</svg>`;
  return svgToDataUrl(svg);
}

/** Galleta (label del disco) generada determinísticamente (400×400). */
export function discDataUrl(v: Vinyl, side: "A" | "B" = "A"): string {
  const rng = mulberry32(hashString(v.id + v.artist + v.album));
  const [labelColor, accent, paper] = PALETTES[Math.floor(rng() * PALETTES.length)];

  let grooves = "";
  for (let r = 112; r <= 192; r += 4) {
    grooves += `<circle cx="200" cy="200" r="${r}" fill="none" stroke="#94a3b8" stroke-opacity="0.10" stroke-width="1"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<circle cx="200" cy="200" r="198" fill="#0b1120"/>
<circle cx="200" cy="200" r="197" fill="none" stroke="#334155" stroke-width="1.5"/>
${grooves}
<circle cx="200" cy="200" r="97" fill="${labelColor}"/>
<circle cx="200" cy="200" r="97" fill="none" stroke="${accent}" stroke-width="3"/>
<circle cx="200" cy="200" r="86" fill="none" stroke="#000000" stroke-opacity="0.25" stroke-width="1.5"/>
<text x="200" y="156" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="15" fill="${paper}" letter-spacing="1">${escapeXml(
    v.artist.toUpperCase().slice(0, 26)
  )}</text>
<text x="200" y="176" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11.5" fill="${paper}" opacity="0.85">${escapeXml(
    v.album.slice(0, 32)
  )}</text>
<text x="200" y="189" text-anchor="middle" font-family="'Courier New',monospace" font-weight="700" font-size="9.5" letter-spacing="3" fill="${accent}">LADO ${side}</text>
<text x="200" y="228" text-anchor="middle" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="16" fill="${accent}">${
    v.format === "33 RPM" ? "33⅓ R.P.M." : v.format === "45 RPM" ? "45 R.P.M." : "78 R.P.M."
  }</text>
<text x="200" y="250" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10.5" fill="${paper}" opacity="0.8" letter-spacing="1">${escapeXml(
    v.label.toUpperCase()
  )}</text>
<text x="200" y="268" text-anchor="middle" font-family="'Courier New',monospace" font-size="10.5" fill="${paper}" opacity="0.9">${escapeXml(
    v.matrixCode
  )}</text>
<circle cx="200" cy="200" r="9.5" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
</svg>`;
  return svgToDataUrl(svg);
}

/* ── Sugerencias de búsqueda ────────────────────────────── */

export interface Suggestion {
  type: "Artista" | "Álbum" | "Sello" | "Matriz";
  value: string;
}

export function buildSuggestions(collection: Vinyl[], query: string): Suggestion[] {
  const q = normalizeText(query.trim());
  if (!q) return [];
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  const push = (type: Suggestion["type"], value: string) => {
    const key = type + "::" + value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (out.length < 7) out.push({ type, value });
  };
  for (const v of collection) {
    if (out.length >= 7) break;
    if (normalizeText(v.artist).includes(q)) push("Artista", v.artist);
    if (normalizeText(v.album).includes(q)) push("Álbum", v.album);
    if (normalizeText(v.label).includes(q)) push("Sello", v.label);
    if (normalizeText(v.matrixCode).includes(q)) push("Matriz", v.matrixCode);
  }
  return out;
}
