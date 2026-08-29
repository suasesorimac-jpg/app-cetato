import { useState } from "react";
import type { ReactNode } from "react";
import { Download, ImagePlus, Loader2, Pencil, Share2 } from "lucide-react";
import type { Vinyl } from "../types";
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
import { CoverImage, LabelImage } from "./VinylArt";
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
  const photoCount = [record.coverImageId, record.labelImageId].filter(Boolean).length;

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

  const coverSrc = resolveImageSrc(record.coverImageId, 800) ?? sleeveDataUrl(record);
  const labelSrc = resolveImageSrc(record.labelImageId, 800) ?? discDataUrl(record);

  const printRows: Array<[string, string]> = [
    ["Sello disquero", record.label],
    ["Año", formatYearLong(record.year)],
    ["Género", record.genre],
    ["Formato", record.format],
    ["Fecha de ingreso", formatDateLong(record.dateAdded)],
  ];

  return (
    <ModalShell onClose={onClose} maxW="max-w-2xl" fullOnMobile>
      <div className="flex h-full min-h-0 flex-col">
        {/* Contenido desplazable */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-6 sm:p-7">
          <p className="pr-12 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
            Ficha técnica · {record.format}
          </p>
          <h2 className="mt-2 font-display text-4xl leading-[0.95] tracking-wide text-slate-50 sm:text-[40px]">
            {record.album}
          </h2>
          <h3 className="mt-1.5 text-xl font-bold text-amber-500 sm:text-2xl">{record.artist}</h3>

          {/* Imágenes: apiladas en móvil, 2 columnas en escritorio */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <figure className="min-w-0">
              <CoverImage
                record={record}
                className="aspect-square rounded-xl border border-slate-700 shadow-xl shadow-black/40"
              />
              <figcaption className="mt-1.5 text-center font-mono text-[9px] tracking-[0.22em] text-slate-500">
                CARÁTULA
              </figcaption>
            </figure>
            <figure className="min-w-0">
              <LabelImage
                record={record}
                fit="contain"
                className="aspect-square rounded-xl border border-slate-700 bg-slate-950/70 shadow-xl shadow-black/40"
              />
              <figcaption className="mt-1.5 text-center font-mono text-[9px] tracking-[0.22em] text-slate-500">
                GALLETA
              </figcaption>
            </figure>
          </div>

          {photoCount === 0 && (
            <button
              onClick={() => onEdit(record)}
              className="touch-manipulation mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 py-3 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/15"
            >
              <ImagePlus size={15} />
              Sin fotos aún — arte de referencia · agregar fotos reales
            </button>
          )}

          {/* Metadatos */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
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
        </div>

        {/* Barra de acciones siempre visible (incluye safe-area de iOS) */}
        <div className="shrink-0 border-t border-slate-700/70 bg-slate-900/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:p-5 sm:pb-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="touch-manipulation flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:h-11 sm:flex-1"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? "Generando…" : "Exportar PDF"}
            </button>
            <button
              onClick={handleShare}
              className="touch-manipulation flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/70 hover:text-amber-400 active:scale-[0.98] sm:h-11"
            >
              <Share2 size={16} />
              Compartir
            </button>
            <button
              onClick={() => onEdit(record)}
              className="touch-manipulation flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/70 hover:text-amber-400 active:scale-[0.98] sm:h-11"
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
            REF. {record.id.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
          <div>
            <img
              src={coverSrc}
              crossOrigin="anonymous"
              alt=""
              style={{
                width: 252,
                height: 252,
                objectFit: "cover",
                borderRadius: 12,
                border: "1px solid #334155",
                display: "block",
              }}
            />
            <img
              src={labelSrc}
              crossOrigin="anonymous"
              alt=""
              style={{
                width: 252,
                height: 160,
                objectFit: "contain",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#020617",
                marginTop: 12,
                display: "block",
              }}
            />
          </div>
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
