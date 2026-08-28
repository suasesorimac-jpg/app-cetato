import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ImagePlus, Loader2, Pencil, Share2 } from "lucide-react";
import type { ImageSlot, Vinyl } from "../types";
import { SLOT_LABELS, SLOT_ORDER, countImages, slotIds } from "../types";
import { resolveImageSrc } from "../config/cloudinary";
import { exportFichaPdf } from "../lib/pdf";
import {
  discDataUrl,
  formatDateLong,
  formatYearLong,
  formatYearShort,
  sleeveDataUrl,
} from "../lib/utils";
import ModalShell from "./ModalShell";
import { CoverImage, LabelAImage } from "./VinylArt";
import { useToast } from "./Toast";

interface Props {
  record: Vinyl;
  onClose: () => void;
  onEdit: (v: Vinyl) => void;
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/70 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-slate-100">{children}</div>
    </div>
  );
}

export default function DetailModal({ record, onClose, onEdit }: Props) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const ids = useMemo(() => slotIds(record), [record]);
  const realPhotos = useMemo(
    () => SLOT_ORDER.filter((s) => ids[s]).map((slot) => ({ slot, id: ids[slot] as string })),
    [ids]
  );
  const [active, setActive] = useState<ImageSlot>(realPhotos[0]?.slot ?? "cover");
  const photoCount = countImages(record);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportFichaPdf(record);
      toast("Ficha PDF descargada", "success");
    } catch {
      toast("No se pudo generar el PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const text = `${record.artist} — ${record.album} · ${record.label}, ${formatYearShort(
      record.year
    )} · Matriz: ${record.matrixCode} · Catálogo AppCetato`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "AppCetato", text });
        return;
      } catch {
        return; /* el usuario canceló */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Ficha copiada al portapapeles", "success");
    } catch {
      toast("No se pudo compartir la ficha", "error");
    }
  };

  const coverSrc = resolveImageSrc(ids.cover, 800) ?? sleeveDataUrl(record);
  const backSrc = resolveImageSrc(ids.coverBack, 800);
  const galASrc = resolveImageSrc(ids.labelA, 800) ?? discDataUrl(record, "A");
  const galBSrc = resolveImageSrc(ids.labelB, 800);
  const activeSrc =
    resolveImageSrc(ids[active], 900) ??
    (active === "labelA" || active === "labelB"
      ? discDataUrl(record, active === "labelB" ? "B" : "A")
      : sleeveDataUrl(record));

  const printRows: Array<[string, string]> = [
    ["Sello disquero", record.label],
    ["Año", formatYearLong(record.year)],
    ["Género", record.genre],
    ["Formato", record.format],
    ["Fecha de ingreso", formatDateLong(record.dateAdded)],
    ["Fotos documentadas", `${photoCount} de 4`],
  ];

  /* Fotos para el nodo de impresión (solo las existentes; carátula con fallback) */
  const printPhotos: Array<{ src: string; caption: string; square?: boolean }> = [
    { src: coverSrc, caption: "CARÁTULA FRONTAL", square: true },
  ];
  if (backSrc) printPhotos.push({ src: backSrc, caption: "CARÁTULA TRASERA" });
  if (ids.labelA) printPhotos.push({ src: galASrc, caption: "GALLETA LADO A" });
  if (ids.labelB && galBSrc) printPhotos.push({ src: galBSrc, caption: "GALLETA LADO B" });

  return (
    <ModalShell onClose={onClose} maxW="max-w-4xl">
      <div className="grid max-h-[88vh] md:grid-cols-[minmax(0,10fr)_minmax(0,11fr)]">
        {/* ── Columna izquierda: galería ── */}
        <div className="border-b border-slate-800 bg-slate-950/40 p-5 md:border-b-0 md:border-r md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Galería del ejemplar
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${
                photoCount === 4
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-400"
              }`}
            >
              {photoCount}/4 fotos
            </span>
          </div>

          {photoCount > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="relative h-[300px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70 shadow-xl shadow-black/40 sm:h-[360px]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={active + (ids[active] ?? "")}
                    src={activeSrc}
                    alt={SLOT_LABELS[active]}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="h-full w-full object-contain"
                  />
                </AnimatePresence>
                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-950/85 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider text-amber-400 backdrop-blur-sm">
                  {SLOT_LABELS[active]}
                </span>
              </div>

              {realPhotos.length > 1 && (
                <div className="flex gap-2">
                  {realPhotos.map(({ slot, id }) => (
                    <button
                      key={slot}
                      onClick={() => setActive(slot)}
                      aria-pressed={active === slot}
                      title={SLOT_LABELS[slot]}
                      className={`group/thumb relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        active === slot
                          ? "border-amber-500 shadow-lg shadow-amber-500/25"
                          : "border-slate-700 opacity-70 hover:-translate-y-0.5 hover:border-slate-500 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={resolveImageSrc(id, 160) ?? ""}
                        alt={SLOT_LABELS[slot]}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-950/85 py-0.5 text-center font-mono text-[8px] font-bold tracking-wider text-slate-300">
                        {slot === "cover"
                          ? "FRENTE"
                          : slot === "coverBack"
                            ? "ATRÁS"
                            : slot === "labelA"
                              ? "GAL·A"
                              : "GAL·B"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex h-[300px] flex-col gap-3 sm:h-[360px]">
                <CoverImage
                  record={record}
                  className="min-h-0 flex-[3] rounded-xl border border-slate-700 shadow-xl shadow-black/40"
                />
                <LabelAImage
                  record={record}
                  fit="contain"
                  className="min-h-0 flex-[2] rounded-xl border border-slate-700 bg-slate-950/70"
                />
              </div>
              <button
                onClick={() => onEdit(record)}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 py-2.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/15"
              >
                <ImagePlus size={15} />
                Sin fotos aún — arte de referencia generado · agregar fotos reales
              </button>
            </div>
          )}
        </div>

        {/* ── Columna derecha: metadatos ── */}
        <div className="flex flex-col overflow-y-auto p-6 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Ficha técnica · {record.format}
          </p>
          <h2 className="mt-2 font-display text-4xl leading-[0.95] tracking-wide text-slate-50 md:text-[40px]">
            {record.album}
          </h2>
          <h3 className="mt-1.5 text-xl font-bold text-amber-500 md:text-2xl">{record.artist}</h3>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MetaCell label="Sello disquero">{record.label}</MetaCell>
            <MetaCell label="Año">{formatYearLong(record.year)}</MetaCell>
            <MetaCell label="Código de matriz">
              <span className="inline-block rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-[13px] font-medium text-amber-400">
                {record.matrixCode}
              </span>
            </MetaCell>
            <MetaCell label="Género">{record.genre}</MetaCell>
            <MetaCell label="Formato">{record.format}</MetaCell>
            <MetaCell label="Fecha de ingreso">{formatDateLong(record.dateAdded)}</MetaCell>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex h-11 min-w-[160px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40 disabled:cursor-wait disabled:opacity-70"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? "Generando…" : "Exportar PDF"}
            </button>
            <button
              onClick={handleShare}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/70 hover:text-amber-400"
            >
              <Share2 size={16} />
              Compartir
            </button>
            <button
              onClick={() => onEdit(record)}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/70 hover:text-amber-400"
            >
              <Pencil size={16} />
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* Nodo oculto que captura html2canvas para el PDF */}
      <div
        id="appcetato-ficha-print"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 640,
          background: "#0f172a",
          padding: 32,
          fontFamily: "Inter, Arial, sans-serif",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "3px solid #f59e0b",
            paddingBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue', 'Arial Narrow', Arial, sans-serif",
                fontSize: 36,
                letterSpacing: 2,
                lineHeight: 1,
                color: "#f8fafc",
              }}
            >
              APPCETATO
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10.5,
                letterSpacing: 3,
                color: "#94a3b8",
                marginTop: 4,
              }}
            >
              FICHA TÉCNICA DE VINILO
            </div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#f59e0b" }}>
            REF. {record.id.toUpperCase()} · {photoCount}/4 FOTOS
          </div>
        </div>

        <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
          {/* Columna de fotos (las que existan) */}
          <div style={{ width: 252, flexShrink: 0 }}>
            {printPhotos.map((p) => (
              <div key={p.caption} style={{ marginBottom: 12 }}>
                <img
                  src={p.src}
                  crossOrigin="anonymous"
                  alt=""
                  style={{
                    width: 252,
                    height: p.square ? 252 : 160,
                    objectFit: p.square ? "cover" : "contain",
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: "#020617",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8.5,
                    letterSpacing: 2,
                    color: "#94a3b8",
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {p.caption}
                </div>
              </div>
            ))}
          </div>

          {/* Metadatos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "'Bebas Neue', 'Arial Narrow', Arial, sans-serif",
                fontSize: 34,
                lineHeight: 0.98,
                letterSpacing: 1,
                margin: 0,
                color: "#f8fafc",
              }}
            >
              {record.album}
            </h2>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 6 }}>
              {record.artist}
            </div>

            <div style={{ marginTop: 18 }}>
              {printRows.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginTop: 7,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9.5,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "#94a3b8",
                    }}
                  >
                    {k}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
                background: "#020617",
                border: "1px solid #f59e0b",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 15,
                fontWeight: 700,
                color: "#f59e0b",
                letterSpacing: 1,
              }}
            >
              MATRIZ&nbsp;&nbsp;{record.matrixCode}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            paddingTop: 12,
            borderTop: "1px solid #334155",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9.5,
            letterSpacing: 1,
            color: "#64748b",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Generado el {new Date().toLocaleString("es-CO")}</span>
          <span>appcetato · catálogo maestro</span>
        </div>
      </div>
    </ModalShell>
  );
}
