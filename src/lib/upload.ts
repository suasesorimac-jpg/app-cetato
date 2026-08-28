import { CLOUD_NAME, UPLOAD_PRESET, isCloudinaryConfigured } from "../config/cloudinary";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): string | null {
  const okTypes = ["image/jpeg", "image/png"];
  if (!okTypes.includes(file.type)) return "Formato no permitido. Usa JPG o PNG.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen supera los 5 MB permitidos.";
  return null;
}

/** Reduce la imagen a un data-URL JPEG (fallback sin Cloudinary). */
export function downscaleToDataUrl(file: File, maxSide = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("No se pudo procesar la imagen"));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export interface UploadResult {
  /** public_id de Cloudinary, o data-URL si no hay configuración. */
  value: string;
  remote: boolean;
}

/**
 * Sube la imagen a Cloudinary (upload preset unsigned) con reporte de
 * progreso. Si Cloudinary no está configurado, la comprime y la devuelve
 * como data-URL para guardarla localmente.
 */
export function uploadImage(
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      onProgress(35);
      downscaleToDataUrl(file)
        .then((value) => {
          onProgress(100);
          resolve({ value, remote: false });
        })
        .catch(reject);
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("context", "app=appcetato");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText) as { public_id?: string };
          if (res.public_id) {
            onProgress(100);
            resolve({ value: res.public_id, remote: true });
          } else {
            reject(new Error("Respuesta inválida de Cloudinary"));
          }
        } catch {
          reject(new Error("Respuesta inválida de Cloudinary"));
        }
      } else {
        reject(new Error(`Cloudinary respondió con error ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir la imagen"));
    xhr.send(fd);
  });
}
