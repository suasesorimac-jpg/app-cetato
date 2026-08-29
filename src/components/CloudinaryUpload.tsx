import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, Image as ImageIcon, Upload, X } from "lucide-react";
import { isCloudinaryConfigured } from "../config/cloudinary";
import { uploadImage, validateImageFile } from "../lib/upload";

interface CloudinaryUploadProps {
  /** publicId (Cloudinary) o url (modo local). `("", "")` = quitar la foto. */
  onUpload: (publicId: string, url: string) => void;
  type: "cover" | "label";
  existingImage?: string;
  label: string;
}

/**
 * Subida de fotos optimizada para móvil: dos acciones nativas —
 * Galería (`<input type=file>`) y Cámara (`capture="environment"`,
 * abre la cámara trasera). Preview local inmediato y subida a
 * Cloudinary a través del pipeline existente (`lib/upload.ts`).
 */
export function CloudinaryUpload({ onUpload, type, existingImage, label }: CloudinaryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | undefined>(existingImage);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const kind = type === "cover" ? "carátula" : "galleta";

  const handleFileSelect = async (file: File) => {
    const validation = validateImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setUploading(true);
    setProgress(2);

    /* Preview local inmediato */
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    /* Subida (Cloudinary si está configurado; si no, modo local) */
    try {
      const res = await uploadImage(file, setProgress);
      if (res.remote) onUpload(res.value, "");
      else onUpload("", res.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir. Verifica tu conexión.");
      setPreview(existingImage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFileSelect(file);
    e.target.value = ""; // permite volver a elegir el mismo archivo
  };

  return (
    <div className="space-y-2">
      <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>

      <div className="relative">
        {preview ? (
          <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-800">
            <img src={preview} alt={`${label} del vinilo`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setPreview(undefined);
                setError("");
                onUpload("", "");
              }}
              disabled={uploading}
              aria-label={`Quitar ${kind}`}
              className="touch-manipulation absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-black/40 transition-transform active:scale-90 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 backdrop-blur-[2px]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <span className="font-mono text-xs font-bold tracking-widest text-amber-400">
                  {progress}%
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-800">
                <div
                  className="h-full bg-amber-500 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/60 p-4">
            <ImageIcon className="h-10 w-10 text-slate-600" />
            <span className="text-center text-xs text-slate-500">
              Sin {kind} · JPG o PNG · máx. 5 MB
            </span>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="touch-manipulation flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-3 font-medium text-white transition-colors hover:bg-slate-600 active:scale-[0.97] disabled:opacity-50"
          >
            <Upload className="h-5 w-5" /> <span>Galería</span>
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="touch-manipulation flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400 active:scale-[0.97] disabled:opacity-50"
          >
            <Camera className="h-5 w-5" /> <span>Cámara</span>
          </button>
        </div>

        {/* Input Galería (sin capture) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleInputChange}
          className="hidden"
        />
        {/* Input Cámara (capture="environment" → cámara trasera en móvil) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
        />

        {error && (
          <p className="mt-2 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        {!isCloudinaryConfigured && !error && (
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Modo local: la foto se guardará en este dispositivo.
          </p>
        )}
      </div>
    </div>
  );
}

export default CloudinaryUpload;
