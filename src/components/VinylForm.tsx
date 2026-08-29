import { useState } from "react";
import type { FormEvent } from "react";
import { Save } from "lucide-react";
import type { ImageSlot, RpmFormat, Vinyl } from "../types";
import {
  FORMAT_OPTIONS,
  GENRE_OPTIONS,
  SLOT_ORDER,
  coverBackId,
  coverId,
  labelAId,
  labelBId,
} from "../types";
import { isCloudinaryConfigured, resolveImageSrc } from "../config/cloudinary";
import { uid } from "../lib/utils";
import ModalShell from "./ModalShell";
import CloudinaryUpload from "./CloudinaryUpload";

interface Props {
  initial: Vinyl | null;
  labels: string[];
  onSave: (v: Vinyl) => void;
  onClose: () => void;
}

const inputCls =
  "h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25";

function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500"
    >
      {children}
    </label>
  );
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-red-400">{msg}</p>;
}

/** Etiquetas de los 4 slots de foto en el formulario. */
const SLOT_FORM_LABELS: Record<ImageSlot, string> = {
  cover: "Foto de carátula · frente",
  coverBack: "Foto de carátula · trasera",
  labelA: "Foto de galleta · lado A",
  labelB: "Foto de galleta · lado B",
};

export default function VinylForm({ initial, labels, onSave, onClose }: Props) {
  const [artist, setArtist] = useState(initial?.artist ?? "");
  const [album, setAlbum] = useState(initial?.album ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [matrixCode, setMatrixCode] = useState(initial?.matrixCode ?? "");
  const [yearText, setYearText] = useState(
    initial && typeof initial.year === "number" ? String(initial.year) : ""
  );
  const [notSpecified, setNotSpecified] = useState(initial ? initial.year === "N/E" : false);
  const [genre, setGenre] = useState(initial?.genre ?? "Cumbia");
  const [format, setFormat] = useState<RpmFormat>(initial?.format ?? "33 RPM");

  /* ── Imágenes (4 slots: carátula frente/trasera + galleta A/B) ── */
  const [images, setImages] = useState<Record<ImageSlot, string | null>>(
    initial
      ? {
          /* Los getters resuelven la migración: un labelImageId heredado
             aparece precargado como "Galleta · lado A". */
          cover: coverId(initial),
          coverBack: coverBackId(initial),
          labelA: labelAId(initial),
          labelB: labelBId(initial),
        }
      : { cover: null, coverBack: null, labelA: null, labelB: null }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImage =
    (slot: ImageSlot) =>
    (publicId: string, url: string) =>
      setImages((im) => ({ ...im, [slot]: publicId || url || null }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!artist.trim()) errs.artist = "El artista es obligatorio";
    if (!album.trim()) errs.album = "El álbum es obligatorio";
    if (!matrixCode.trim()) errs.matrixCode = "El código de matriz es obligatorio";
    let year: number | "N/E" = "N/E";
    if (!notSpecified) {
      const n = Number(yearText);
      if (!yearText.trim() || Number.isNaN(n) || !Number.isInteger(n) || n < 1900 || n > 2026) {
        errs.year = "Ingresa un año entre 1900 y 2026, o marca N/E";
      } else {
        year = n;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const record: Vinyl = {
      id: initial?.id ?? uid(),
      artist: artist.trim(),
      album: album.trim(),
      label: label.trim() || "Sello independiente",
      matrixCode: matrixCode.trim(),
      year,
      genre,
      format,
      /* 4 slots modernos; nunca se escribe el campo deprecado labelImageId */
      coverImageId: images.cover,
      coverBackImageId: images.coverBack,
      labelAImageId: images.labelA,
      labelBImageId: images.labelB,
      dateAdded: initial?.dateAdded ?? new Date().toISOString().slice(0, 10),
    };
    onSave(record);
  };

  return (
    <ModalShell onClose={onClose} maxW="max-w-2xl">
      <div className="max-h-[calc(100vh-100px)] overflow-y-auto overscroll-contain sm:max-h-[85vh]">
        <form onSubmit={submit} noValidate>
          <div className="p-5 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
              {initial ? "Editar referencia" : "Nuevo registro"}
            </p>
            <h2 className="mt-1 font-display text-4xl tracking-wide text-slate-50">
              {initial ? "EDITAR VINILO" : "NUEVO VINILO"}
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="f-artist">Artista *</FieldLabel>
                <input
                  id="f-artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ej. Los Corraleros de Majagual"
                  className={`${inputCls} ${errors.artist ? "border-red-500/70" : ""}`}
                />
                <ErrorMsg msg={errors.artist} />
              </div>
              <div>
                <FieldLabel htmlFor="f-album">Álbum *</FieldLabel>
                <input
                  id="f-album"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  placeholder="Ej. Festival Corralero"
                  className={`${inputCls} ${errors.album ? "border-red-500/70" : ""}`}
                />
                <ErrorMsg msg={errors.album} />
              </div>
              <div>
                <FieldLabel htmlFor="f-label">Sello disquero</FieldLabel>
                <input
                  id="f-label"
                  list="appcetato-labels"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej. Discos Fuentes"
                  className={inputCls}
                />
                <datalist id="appcetato-labels">
                  {labels.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>
              <div>
                <FieldLabel htmlFor="f-matrix">Código de matriz *</FieldLabel>
                <input
                  id="f-matrix"
                  value={matrixCode}
                  onChange={(e) => setMatrixCode(e.target.value)}
                  placeholder="Ej. L.P.-10094-A"
                  className={`${inputCls} font-mono ${errors.matrixCode ? "border-red-500/70" : ""}`}
                />
                <ErrorMsg msg={errors.matrixCode} />
              </div>
              <div>
                <FieldLabel htmlFor="f-year">Año</FieldLabel>
                <div className="flex items-center gap-3">
                  <input
                    id="f-year"
                    type="number"
                    min={1900}
                    max={2026}
                    value={yearText}
                    disabled={notSpecified}
                    onChange={(e) => setYearText(e.target.value)}
                    placeholder="1968"
                    className={`${inputCls} disabled:opacity-40 ${
                      errors.year ? "border-red-500/70" : ""
                    }`}
                  />
                  <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-400">
                    <input
                      type="checkbox"
                      checked={notSpecified}
                      onChange={(e) => setNotSpecified(e.target.checked)}
                      className="h-4 w-4 accent-amber-500"
                    />
                    N/E
                  </label>
                </div>
                <ErrorMsg msg={errors.year} />
              </div>
              <div>
                <FieldLabel htmlFor="f-genre">Género</FieldLabel>
                <select
                  id="f-genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g} className="bg-slate-800">
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel>Formato</FieldLabel>
              <div className="flex gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    aria-pressed={format === f}
                    className={`touch-manipulation flex-1 rounded-lg border px-3 py-3 font-mono text-xs font-bold transition-all active:scale-[0.97] sm:py-2.5 ${
                      format === f
                        ? "border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-amber-500/50 hover:text-amber-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Fotos: 4 slots (carátula frente/trasera + galleta A/B) · cámara o galería */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {SLOT_ORDER.map((slot) => (
                <CloudinaryUpload
                  key={slot}
                  label={SLOT_FORM_LABELS[slot]}
                  type={slot}
                  existingImage={
                    images[slot] ? resolveImageSrc(images[slot], 480) ?? undefined : undefined
                  }
                  onUpload={handleImage(slot)}
                />
              ))}
            </div>

            {!isCloudinaryConfigured && (
              <p className="mt-5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
                <span className="font-semibold text-amber-400">Modo local:</span> Cloudinary no está
                configurado (<span className="font-mono">.env</span> →{" "}
                <span className="font-mono">VITE_CLOUDINARY_CLOUD_NAME</span>). Las fotos se
                comprimen y se guardan en el dispositivo.
              </p>
            )}
          </div>

          {/* Barra de acciones pegada al borde inferior en móvil */}
          <div className="sticky bottom-0 z-10 border-t border-slate-700/70 bg-slate-900/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-8 sm:pb-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="touch-manipulation h-12 rounded-lg border border-slate-600 px-5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-100 active:scale-[0.98] sm:h-11"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="touch-manipulation flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40 active:scale-[0.98] sm:h-11"
              >
                <Save size={16} />
                Guardar Vinilo
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
