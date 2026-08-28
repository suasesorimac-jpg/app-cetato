/**
 * Configuración de Cloudinary.
 *
 * Las credenciales NUNCA se hardcodean: se leen de variables de entorno
 * (archivo `.env`, ver `.env.example`). Vite expone las variables con
 * prefijo `VITE_`; también se acepta la convención `REACT_APP_` de CRA
 * por compatibilidad con el spec original.
 */
import { Cloudinary } from "@cloudinary/url-gen";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};

export const CLOUD_NAME: string =
  env.VITE_CLOUDINARY_CLOUD_NAME || env.REACT_APP_CLOUDINARY_CLOUD_NAME || "";

export const UPLOAD_PRESET: string =
  env.VITE_CLOUDINARY_UPLOAD_PRESET || env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "";

export const isCloudinaryConfigured = Boolean(CLOUD_NAME);

const cld: Cloudinary | null = isCloudinaryConfigured
  ? new Cloudinary({ cloud: { cloudName: CLOUD_NAME } })
  : null;

/** ¿El identificador ya es una URL externa / data-URL? */
export function isExternalRef(ref: string): boolean {
  return /^(data:|https?:|blob:)/i.test(ref);
}

/**
 * Genera una URL optimizada de Cloudinary con transformations
 * f_auto, q_auto y w_{width}.
 */
export function cloudinaryUrl(publicId: string, width = 800): string | null {
  if (!cld || !CLOUD_NAME) return null;
  try {
    const base = cld.image(publicId).toURL(); // https://res.cloudinary.com/{cloud}/image/upload/{publicId}
    return base.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
  } catch {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
  }
}

/**
 * Resuelve la fuente de imagen de un campo (public_id de Cloudinary,
 * data-URL local o URL externa). Devuelve null si no hay imagen.
 */
export function resolveImageSrc(ref?: string | null, width = 800): string | null {
  if (!ref) return null;
  if (isExternalRef(ref)) return ref;
  return cloudinaryUrl(ref, width);
}
