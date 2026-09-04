import { useEffect, useRef, useState } from "react";
import type { ReactNode, TouchEvent as ReactTouchEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Eye, ImagePlus, Loader2, Pencil, Share2, X, ZoomIn } from "lucide-react";
import type { AuthMode, Vinyl } from "../types";
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
import { CoverImage, LabelImage } from "./VinylArt";
import { useToast } from "./Toast";

interface Props {
  record: Vinyl;
  onClose: () => void;
  onEdit: (v: Vinyl) => void;
  authMode: AuthMode;
}

/** Campo de la ficha técnica: etiqueta en versalitas + valor, con filete inferior. */
function MetadataField({
  label,
  noBorder,
  children,
}: {
  label: string;
  noBorder?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={noBorder ? "" : "border-b border-slate-700 pb-4"}>
      <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <div className="text-base text-slate-200 sm:text-lg">{children}</div>
    </div>
  );
}

export default function DetailModal({ record, onClose, onEdit, authMode }: Props) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  /* ── Zoom de fotos con gestos táctiles nativos (sin librerías externas):
        pinch con 2 dedos (100%–400%), pan con 1 dedo cuando hay zoom,
        doble toque alterna 100% ↔ 200%. ── */
  const [zoom, setZoom] = useState<null | { src: string; caption: string }>(null);
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);
  const gesture = useRef({ pinching: false, panning: false, d0: 1, s0: 1, lx: 0, ly: 0 });
  const scaleRef = useRef(1);
  useEffect(() => {
    scaleRef.current = zoomState.scale;
  }, [zoomState.scale]);

  const openZoom = (target: { src: string; caption: string }) => {
    setZoom(target);
    setZoomState({ scale: 1, x: 0, y: 0 });
  };

  /* Reset completo del zoom al cerrar el overlay */
  const closeZoom = () => {
    setZoom(null);
    setZoomState({ scale: 1, x: 0, y: 0 });
    gesture.current = { pinching: false, panning: false, d0: 1, s0: 1, lx: 0, ly: 0 };
  };

  const touchDistance = (t: ReactTouchEvent["touches"]) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleTouchStart = (e: ReactTouchEvent<HTMLImageElement>) => {
    setGesturing(true);
    if (e.touches.length === 2) {
      gesture.current = {
        ...gesture.current,
        pinching: true,
        panning: false,
        d0: touchDistance(e.touches),
        s0: scaleRef.current,
      };
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      gesture.current = {
        ...gesture.current,
        panning: true,
        lx: e.touches[0].clientX,
        ly: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLImageElement>) => {
    const g = gesture.current;
    if (g.pinching && e.touches.length === 2) {
      const scale = Math.max(1, Math.min(4, (touchDistance(e.touches) / g.d0) * g.s0));
      /* Al volver a 100% se recentra la imagen */
      setZoomState((prev) => (scale <= 1 ? { scale: 1, x: 0, y: 0 } : { ...prev, scale }));
    } else if (g.panning && e.touches.length === 1 && scaleRef.current > 1) {
      const dx = e.touches[0].clientX - g.lx;
      const dy = e.touches[0].clientY - g.ly;
      g.lx = e.touches[0].clientX;
      g.ly = e.touches[0].clientY;
      setZoomState((prev) => ({
        ...prev,
        x: Math.max(-400, Math.min(400, prev.x + dx)),
        y: Math.max(-400, Math.min(400, prev.y + dy)),
      }));
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLImageElement>) => {
    const g = gesture.current;
    if (e.touches.length < 2) g.pinching = false;
    if (e.touches.length === 0) {
      g.panning = false;
      setGesturing(false);
    } else if (e.touches.length === 1) {
      /* De pellizco a un solo dedo: continúa como pan */
      g.panning = scaleRef.current > 1;
      g.lx = e.touches[0].clientX;
      g.ly = e.touches[0].clientY;
    }
  };

  const handleDoubleTap = () =>
    setZoomState((prev) => (prev.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2, x: 0, y: 0 }));

  /* Fotos reales disponibles del ejemplar (hasta 4 slots) */
  const ids = slotIds(record);
  const photos = SLOT_ORDER.flatMap((slot) => {
    const src = resolveImageSrc(ids[slot], 900);
    return src ? [{ slot, src }] : [];
  });
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
  /* Para la ficha PDF se usa la galleta lado A (resuelve el campo heredado) */
  const labelSrc = resolveImageSrc(ids.labelA, 800) ?? discDataUrl(record);

  const printRows: Array<[string, string]> = [
    ["Sello disquero", record.label],
    ["Año", formatYearLong(record.year)],
    ["Género", record.genre],
    ["Formato", record.format],
    ["Fecha de ingreso", formatDateLong(record.dateAdded)],
  ];

  /* Campos del modelo extendido presentes en este ejemplar */
  const hasNotes = Boolean(record.notes?.trim());
  const extendedPresent: string[] = [];
  if (record.country) extendedPresent.push("country");
  if (record.physicalFormat) extendedPresent.push("physicalFormat");
  if (record.speed) extendedPresent.push("speed");
  if (record.coverCondition != null) extendedPresent.push("coverCondition");
  if (record.discCondition != null) extendedPresent.push("discCondition");
  const hasExtendedFields = extendedPresent.length > 0;
  /* El último campo extendido no lleva filete si nada más le sigue */
  const isLastExtendedField = (key: string) =>
    extendedPresent[extendedPresent.length - 1] === key;

  return (
    <ModalShell onClose={onClose} maxW="max-w-2xl" fullOnMobile>
      <div className="flex h-full min-h-0 flex-col">
        {/* Contenido desplazable */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="p-5 pb-6 sm:p-7">
            <p className="pr-12 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Pieza {record.id.toUpperCase()} · {photoCount}/4 fotos · {record.format}
            </p>
            {authMode === "visitor" && (
              <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700/70 px-3 py-1 text-xs font-medium text-slate-300">
                <Eye size={13} className="text-amber-400" aria-hidden />
                Solo lectura
              </span>
            )}
            <h2 className="mt-2 font-display text-4xl leading-[0.95] tracking-wide text-slate-50 sm:text-[40px]">
              {record.album}
            </h2>

          {/* Imágenes reales del ejemplar (hasta 4 slots), apiladas en móvil,
              2 columnas en escritorio · cada una tocable para zoom */}
          {photos.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.map(({ slot, src }) => (
                <figure key={slot} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openZoom({ src, caption: SLOT_LABELS[slot] })}
                    aria-label={`Ampliar ${SLOT_LABELS[slot].toLowerCase()}`}
                    className="touch-manipulation group relative block w-full cursor-zoom-in rounded-xl transition-transform duration-200 active:scale-[0.99]"
                  >
                    {/* En móvil la carátula domina (~60% de altura) y la galleta
                        complementa (~40%); en escritorio van lado a lado. */}
                    <img
                      src={src}
                      alt={`${SLOT_LABELS[slot]} de ${record.album}`}
                      className={`w-full rounded-xl border border-slate-700 shadow-xl shadow-black/40 ${
                        slot === "cover" || slot === "coverBack"
                          ? "aspect-[4/5] object-cover sm:aspect-square"
                          : "aspect-[4/3] bg-slate-950/70 object-contain sm:aspect-square"
                      }`}
                    />
                    <span className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg bg-slate-950/75 text-amber-400 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100">
                      <ZoomIn size={16} />
                    </span>
                  </button>
                  <figcaption className="mt-1.5 text-center font-mono text-[9px] tracking-[0.22em] text-slate-500">
                    {SLOT_LABELS[slot].toUpperCase()} · TOCAR PARA AMPLIAR
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <>
              {/* Sin fotos: arte de referencia generado */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <figure className="min-w-0">
                  <CoverImage
                    record={record}
                    className="aspect-[4/5] rounded-xl border border-slate-700 shadow-xl shadow-black/40 sm:aspect-square"
                  />
                  <figcaption className="mt-1.5 text-center font-mono text-[9px] tracking-[0.22em] text-slate-500">
                    CARÁTULA · REFERENCIA
                  </figcaption>
                </figure>
                <figure className="min-w-0">
                  <LabelImage
                    record={record}
                    fit="contain"
                    className="aspect-[4/3] rounded-xl border border-slate-700 bg-slate-950/70 shadow-xl shadow-black/40 sm:aspect-square"
                  />
                  <figcaption className="mt-1.5 text-center font-mono text-[9px] tracking-[0.22em] text-slate-500">
                    GALLETA · REFERENCIA
                  </figcaption>
                </figure>
              </div>
              {authMode === "admin" && (
                <button
                  onClick={() => onEdit(record)}
                  className="touch-manipulation mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 py-3 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/15"
                >
                  <ImagePlus size={15} />
                  Sin fotos aún — arte de referencia · agregar fotos reales
                </button>
              )}
            </>
          )}

          </div>

          {/* ── Ficha técnica estilo exposición: metadatos bajo las fotos ── */}
          <div className="border-t border-slate-700 bg-slate-800 p-6 sm:p-8">
            {/* Año: el dato más prominente de la pieza */}
            <div className="mb-4">
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Año</p>
              <span className="text-3xl font-bold leading-none text-amber-500 sm:text-4xl">
                {record.year === "N/E" ? "Año desconocido" : record.year}
              </span>
            </div>

            {/* Artista principal */}
            <h3 className="mb-6 text-xl font-semibold text-white sm:text-2xl">{record.artist}</h3>

            {/* Orden de lectura: Artistas → Sello → Género → Matriz → Formato → Ingreso */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <MetadataField label="Artistas">
                {record.artists && record.artists.length > 1 ? (
                  <ul className="space-y-1">
                    {record.artists.map((artist, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span aria-hidden className="mt-1 text-amber-500">
                          •
                        </span>
                        <span>{artist}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{record.artist}</p>
                )}
              </MetadataField>

              <MetadataField label="Sello discográfico">{record.label}</MetadataField>

              <MetadataField label="Género">{record.genre}</MetadataField>

              <MetadataField label="Código de matriz">
                <span className="inline-block rounded-lg bg-slate-900 px-3 py-2 font-mono text-lg text-amber-400 sm:text-xl">
                  {record.matrixCode}
                </span>
              </MetadataField>

              <MetadataField
                label="Formato"
                noBorder={!hasExtendedFields && !hasNotes}
              >
                {record.format}
              </MetadataField>

              {/* ── Campos del modelo extendido (solo si existen) ── */}
              {record.country && <MetadataField label="País de origen">{record.country}</MetadataField>}

              {record.physicalFormat && (
                <MetadataField label="Formato físico">
                  {record.physicalFormat === "LP" ? "LP (álbum)" : "Single (sencillo)"}
                </MetadataField>
              )}

              {record.speed && (
                <MetadataField label="Velocidad">{record.speed} RPM</MetadataField>
              )}

              {record.coverCondition != null && (
                <MetadataField label="Estado carátula">
                  {record.coverCondition === "s/c" ? "Sin carátula" : `${record.coverCondition}/5`}
                </MetadataField>
              )}

              {record.discCondition != null && (
                <MetadataField
                  label="Estado disco"
                  noBorder={!hasNotes && isLastExtendedField("discCondition")}
                >
                  {record.discCondition === "s/c" ? "Sin disco" : `${record.discCondition}/5`}
                </MetadataField>
              )}

              <MetadataField label="Fecha de ingreso" noBorder={!hasNotes}>
                {formatDateLong(record.dateAdded)}
              </MetadataField>

              {/* Observaciones: ancho completo, cierra la ficha */}
              {hasNotes && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">
                    Observaciones
                  </p>
                  <p className="text-base italic leading-relaxed text-slate-200 sm:text-lg">
                    {record.notes}
                  </p>
                </div>
              )}
            </div>
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
            {/* Editar solo disponible en modo admin */}
            {authMode === "admin" && (
              <button
                onClick={() => onEdit(record)}
                className="touch-manipulation flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/70 hover:text-amber-400 active:scale-[0.98] sm:h-11"
              >
                <Pencil size={16} />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay de zoom a pantalla completa · pinch (100–400%) + pan + doble toque */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeZoom}
            role="dialog"
            aria-modal="true"
            aria-label={`${zoom.caption} ampliada`}
            className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-slate-950/95 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[82vh] max-w-full items-center justify-center"
            >
              <img
                src={zoom.src}
                alt={`${zoom.caption} de ${record.album} ampliada`}
                draggable={false}
                onDoubleClick={handleDoubleTap}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="max-h-[82vh] max-w-full select-none rounded-xl border border-slate-700 object-contain shadow-2xl shadow-black/80"
                style={{
                  transform: `scale(${zoomState.scale}) translate(${zoomState.x}px, ${zoomState.y}px)`,
                  /* Sin transición durante el gesto: respuesta 1:1 al dedo */
                  transition: gesturing ? "none" : "transform 200ms ease-out",
                  touchAction: "none",
                  cursor: zoomState.scale > 1 ? "grab" : "zoom-in",
                }}
              />
            </motion.div>

            {/* Indicador de nivel de zoom */}
            {zoomState.scale > 1.02 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-sm font-bold text-white shadow-xl shadow-black/50">
                {Math.round(zoomState.scale * 100)}%
              </div>
            )}

            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
              {zoom.caption} · pellizca o doble toque · toca fuera para cerrar
            </p>
            <button
              onClick={closeZoom}
              aria-label="Cerrar vista ampliada"
              className="touch-manipulation absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-400"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
