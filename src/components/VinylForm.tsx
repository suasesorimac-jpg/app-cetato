import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import type { RpmFormat, Vinyl } from "../types";
import { FORMAT_OPTIONS, GENRE_OPTIONS } from "../types";
import { isCloudinaryConfigured, resolveImageSrc } from "../config/cloudinary";
import { uploadImage, validateImageFile } from "../lib/upload";
import { uid } from "../lib/utils";
import ModalShell from "./ModalShell";
import { useToast } from "./Toast";

interface Props {
  initial: Vinyl | null;
  labels: string[];
  onSave: (v: Vinyl) => void;
  onClose: () => void;
}

type ImageSlot = "cover" | "label";

const inputCls =
  "h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25";

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

export default function VinylForm({ initial, labels, onSave, onClose }: Props) {
  const toast = useToast();
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
  const [coverId, setCoverId] = useState<string | null>(initial?.coverImageId ?? null);
  const [labelId, setLabelId] = useState<string | null>(initial?.labelImageId ?? null);
  const [preview, setPreview] = useState<Record<ImageSlot, string | null>>({
    cover: null,
    label: null,
  });
  const [progress, setProgress] = useState<Record<ImageSlot, number | null>>({
    cover: null,
    label: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const coverInput = useRef<HTMLInputElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);

  const currentSrc = (slot: ImageSlot): string | null => {
    if (preview[slot]) return preview[slot];
    const id = slot === "cover" ? coverId : labelId;
    return id ? resolveImageSrc(id, 480) : null;
  };

  const handleFile = async (slot: ImageSlot, file: File) => {
    const err = validateImageFile(file);
    if (err) {
      toast(err, "error");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((p) => ({ ...p, [slot]: url }));
    setProgress((p) => ({ ...p, [slot]: 2 }));
    try {
      const res = await uploadImage(file, (pct) => setProgress((p) => ({ ...p, [slot]: pct })));
      if (slot === "cover") setCoverId(res.value);
      else setLabelId(res.value);
      setProgress((p) => ({ ...p, [slot]: null }));
      if (!res.remote) {
        toast("Cloudinary sin configurar: la imagen se guardó localmente", "info");
      }
    } catch (e) {
      setProgress((p) => ({ ...p, [slot]: null }));
      setPreview((p) => ({ ...p, [slot]: null }));
      toast(e instanceof Error ? e.message : "Error al subir la imagen", "error");
    }
  };

  const clearImage = (slot: ImageSlot) => {
    setPreview((p) => ({ ...p, [slot]: null }));
    setProgress((p) => ({ ...p, [slot]: null }));
    if (slot === "cover") setCoverId(null);
    else setLabelId(null);
  };

  const renderImageField = (slot: ImageSlot, title: string) => {
    const src = currentSrc(slot);
    const pct = progress[slot];
    const inputRef = slot === "cover" ? coverInput : labelInput;
    return (
      <div>
        <FieldLabel>{title}</FieldLabel>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(slot, f);
            e.target.value = "";
          }}
        />
        {src ? (
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-700">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {pct !== null && (
                <div className="absolute inset-0 flex items-end bg-slate-950/60">
                  <div className="h-1.5 w-full bg-slate-800">
                    <div
                      className="h-full bg-amber-500 transition-[width] duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={pct !== null}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-500/70 hover:text-amber-400 disabled:opacity-50"
              >
                {pct !== null ? `Subiendo ${pct}%` : "Cambiar foto"}
              </button>
              <button
                type="button"
                onClick={() => clearImage(slot)}
                disabled={pct !== null}
                className="flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-red-400 disabled:opacity-50"
              >
                <Trash2 size={12} /> Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-600 bg-slate-800/50 text-slate-500 transition-colors hover:border-amber-500/60 hover:text-amber-400"
          >
            <ImagePlus size={20} />
            <span className="text-xs font-medium">
              Subir foto · JPG o PNG · máx. 5 MB
            </span>
          </button>
        )}
      </div>
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!artist.trim()) errs.artist = "El artista es obligatorio";
    if (!album.trim()) errs.album = "El álbum es obligatorio";
    if (!matrixCode.trim()) errs.matrixCode = "El código de matriz es obligatorio";
    let year: number | "N/E" = "N/E";
    if (!notSpecified) {
      const n = Number(yearText);
      if (
        !yearText.trim() ||
        Number.isNaN(n) ||
        !Number.isInteger(n) ||
        n < 1900 ||
        n > 2026
      ) {
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
      coverImageId: coverId,
      labelImageId: labelId,
      dateAdded: initial?.dateAdded ?? new Date().toISOString().slice(0, 10),
    };
    onSave(record);
  };

  return (
    <ModalShell onClose={onClose} maxW="max-w-2xl">
      <div className="max-h-[88vh] overflow-y-auto p-6 md:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          {initial ? "Editar referencia" : "Nuevo registro"}
        </p>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-slate-50">
          {initial ? "EDITAR VINILO" : "NUEVO VINILO"}
        </h2>

        <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
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
                  className={`${inputCls} disabled:opacity-40 ${errors.year ? "border-red-500/70" : ""}`}
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

          <div>
            <FieldLabel>Formato</FieldLabel>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  aria-pressed={format === f}
                  className={`flex-1 rounded-lg border px-3 py-2.5 font-mono text-xs font-bold transition-all ${
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

          <div className="grid gap-5 sm:grid-cols-2">
            {renderImageField("cover", "Foto de carátula")}
            {renderImageField("label", "Foto de galleta")}
          </div>

          {!isCloudinaryConfigured && (
            <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
              <span className="font-semibold text-amber-400">Modo local:</span> Cloudinary no está
              configurado (<span className="font-mono">.env</span> →{" "}
              <span className="font-mono">VITE_CLOUDINARY_CLOUD_NAME</span>). Las fotos se
              comprimen y se guardan en el dispositivo.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-lg border border-slate-600 px-5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40"
            >
              {progress.cover !== null || progress.label !== null ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Guardar Vinilo
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}
