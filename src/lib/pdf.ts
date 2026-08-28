import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { Vinyl } from "../types";
import { countImages, coverId, labelAId } from "../types";
import { resolveImageSrc } from "../config/cloudinary";
import {
  decadeOf,
  formatDateLong,
  formatYearLong,
  formatYearShort,
  slugify,
  sleeveDataUrl,
} from "./utils";

/* ── helpers ────────────────────────────────────────────── */

function rasterize(src: string, maxSide = 900): Promise<{ data: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("No se pudo rasterizar la imagen"));
      }
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const timestamp = () => new Date().toLocaleString("es-CO");

/* ── Ficha individual (html2canvas + jsPDF, fallback nativo) ── */

export async function exportFichaPdf(record: Vinyl): Promise<void> {
  const fileName = `AppCetato_${slugify(record.artist)}_${slugify(record.album)}.pdf`;
  const node = document.getElementById("appcetato-ficha-print");
  if (node) {
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const img = canvas.toDataURL("image/jpeg", 0.94);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 8;
      let w = pageW - margin * 2;
      let h = (canvas.height * w) / canvas.width;
      const maxH = pageH - margin * 2 - 6;
      if (h > maxH) {
        h = maxH;
        w = (canvas.width * h) / canvas.height;
      }
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(img, "JPEG", (pageW - w) / 2, margin, w, h);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generado por AppCetato · ${timestamp()}`, pageW / 2, pageH - 4, {
        align: "center",
      });
      pdf.save(fileName);
      return;
    } catch {
      /* fallback nativo */
    }
  }
  await exportFichaNative(record, fileName);
}

async function exportFichaNative(record: Vinyl, fileName: string): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 297, "F");
  pdf.setFillColor(245, 158, 11);
  pdf.rect(0, 0, W, 26, "F");
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("APPCETATO — FICHA TÉCNICA", 14, 17);

  const src = resolveImageSrc(coverId(record), 800) ?? sleeveDataUrl(record);
  let y = 36;
  try {
    const img = await rasterize(src, 900);
    const w = 92;
    const h = (img.h * w) / img.w;
    pdf.addImage(img.data, "PNG", (W - w) / 2, y, w, h);
    y += h + 10;
  } catch {
    y = 40;
  }

  pdf.setTextColor(248, 250, 252);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(truncate(record.album, 40), W / 2, y + 6, { align: "center" });
  y += 15;
  pdf.setTextColor(245, 158, 11);
  pdf.setFontSize(15);
  pdf.text(truncate(record.artist, 44), W / 2, y, { align: "center" });
  y += 14;

  const rows: Array<[string, string]> = [
    ["Sello disquero", record.label],
    ["Año", formatYearLong(record.year)],
    ["Género", record.genre],
    ["Formato", record.format],
    ["Fecha de ingreso", formatDateLong(record.dateAdded)],
  ];
  pdf.setFontSize(10.5);
  for (const [k, val] of rows) {
    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(26, y - 6, 158, 10, 2, 2, "F");
    pdf.setTextColor(148, 163, 184);
    pdf.setFont("helvetica", "normal");
    pdf.text(k.toUpperCase(), 30, y);
    pdf.setTextColor(248, 250, 252);
    pdf.setFont("helvetica", "bold");
    pdf.text(truncate(val, 34), 180, y, { align: "right" });
    y += 13;
  }

  pdf.setFillColor(2, 6, 23);
  pdf.setDrawColor(245, 158, 11);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(26, y, 158, 14, 2, 2, "FD");
  pdf.setTextColor(245, 158, 11);
  pdf.setFont("courier", "bold");
  pdf.setFontSize(13);
  pdf.text(`MATRIZ  ${record.matrixCode}`, W / 2, y + 9, { align: "center" });

  /* Galleta lado A, si el ejemplar la tiene documentada */
  const labelSrc = resolveImageSrc(labelAId(record), 700);
  if (labelSrc) {
    try {
      const img = await rasterize(labelSrc, 700);
      const w = 62;
      const hMax = 264 - (y + 22);
      const h = Math.min((img.h * w) / img.w, hMax);
      if (h > 20) pdf.addImage(img.data, "PNG", (W - w) / 2, y + 22, w, h);
    } catch {
      /* la ficha se genera igual sin la galleta */
    }
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Generado por AppCetato · ${timestamp()}`, W / 2, 288, { align: "center" });
  pdf.save(fileName);
}

/* ── Catálogo completo ──────────────────────────────────── */

export function exportCatalogPdf(list: Vinyl[]): void {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const M = 12;

  const cols = [
    { label: "#", w: 9 },
    { label: "Artista", w: 54 },
    { label: "Álbum", w: 60 },
    { label: "Sello", w: 42 },
    { label: "Matriz", w: 40 },
    { label: "Año", w: 14 },
    { label: "Género", w: 24 },
    { label: "Fmt", w: 16 },
  ];
  const totalW = cols.reduce((a, c) => a + c.w, 0);
  const x0 = (W - totalW) / 2;

  const pageBackground = () => {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, W, H, "F");
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, W, 30, "F");
    pdf.setFillColor(245, 158, 11);
    pdf.rect(0, 28, W, 2, "F");
    pdf.setTextColor(248, 250, 252);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("APPCETATO — CATÁLOGO MAESTRO DE VINILOS", M, 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `${list.length} referencias · generado el ${timestamp()}`,
      M,
      21
    );
  };

  const tableHead = (y: number) => {
    pdf.setFillColor(245, 158, 11);
    pdf.rect(x0, y, totalW, 8, "F");
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    let x = x0;
    for (const c of cols) {
      pdf.text(c.label, x + 2, y + 5.5);
      x += c.w;
    }
    return y + 8;
  };

  pageBackground();
  let y = tableHead(38);
  const rowH = 7;

  list.forEach((v, i) => {
    if (y > H - 18) {
      pdf.addPage();
      pageBackground();
      y = tableHead(38);
    }
    if (i % 2 === 0) {
      pdf.setFillColor(241, 245, 249);
      pdf.rect(x0, y, totalW, rowH, "F");
    }
    pdf.setFontSize(7.8);
    let x = x0;
    const cells: Array<{ text: string; mono?: boolean; bold?: boolean }> = [
      { text: String(i + 1) },
      { text: truncate(v.artist, 34) },
      { text: truncate(v.album, 38), bold: true },
      { text: truncate(v.label, 26) },
      { text: v.matrixCode, mono: true },
      { text: formatYearShort(v.year) },
      { text: truncate(v.genre, 14) },
      { text: v.format.replace(" RPM", "") },
    ];
    cells.forEach((cell, ci) => {
      if (cell.mono) {
        pdf.setFont("courier", "bold");
        pdf.setTextColor(180, 83, 9);
      } else {
        pdf.setFont("helvetica", cell.bold ? "bold" : "normal");
        pdf.setTextColor(30, 41, 59);
      }
      pdf.text(cell.text, x + 2, y + 4.8);
      x += cols[ci].w;
    });
    y += rowH;
  });

  /* Estadísticas finales */
  pdf.addPage();
  pageBackground();
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("ESTADÍSTICAS DEL CATÁLOGO", x0, 46);

  const countBy = (fn: (v: Vinyl) => string | null) => {
    const m = new Map<string, number>();
    list.forEach((v) => {
      const k = fn(v);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const labels = countBy((v) => v.label);
  const genres = countBy((v) => v.genre);
  const decades = countBy((v) => decadeOf(v.year));
  const withImages = list.filter((v) => countImages(v) > 0).length;

  const top = (arr: Array<[string, number]>, n: number) =>
    arr.slice(0, n).map(([k, c]) => `${k} (${c})`).join("  ·  ");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  const lines = [
    `Total de vinilos: ${list.length}`,
    `Vinilos con imágenes: ${withImages}/${list.length}`,
    `Sellos disqueros: ${labels.length}   |   Géneros: ${genres.length}`,
    ``,
    `Top 5 sellos: ${top(labels, 5)}`,
    `Top 5 géneros: ${top(genres, 5)}`,
    `Distribución por década: ${top(decades, 6)}`,
  ];
  let yy = 56;
  for (const line of lines) {
    pdf.text(line, x0, yy);
    yy += 7;
  }

  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Generado por AppCetato · ${timestamp()}`, W / 2, H - 8, { align: "center" });

  pdf.save("AppCetato_Catalogo_Completo.pdf");
}
