# Scripts de App-Cetato

## 🔄 Reset del repositorio GitHub (push desde cero)

Para borrar lo que hay en el remoto y subir **esta versión** como única fuente:

- **Windows:** doble clic en `reset-and-push.bat` (raíz del proyecto), o
- Terminal:

```bash
node scripts/push-fresh.mjs
```

El script hace: `git init` (si falta) → rama `main` → `git add -A` → commit →
`git push --force -u origin main` → borra ramas/tags remotos antiguos →
muestra `git ls-remote` para verificar.

> Si Git pide credenciales, se abrirá el navegador para iniciar sesión en
> GitHub (cuenta `suasesorimac-jpg`): acéptalo.
> Si la rama por defecto del repo era otra: en GitHub → Settings → Branches →
> Default branch → selecciona `main`.

---

# Fotos reales de la colección → Cloudinary → catalog.json

Flujo completo para conectar las fotos de la carpeta local
(`C:\Users\willi\OneDrive\PROYECTO SOW\MINI APPS\App-Cetatos`) con la app.

Requisito: **Node 18+** (usa `fetch`/`FormData` nativos, sin dependencias).

## Paso 1 — Inspección y propuesta de mapeo

```bash
node scripts/inspect-folder.mjs "C:\Users\willi\OneDrive\PROYECTO SOW\MINI APPS\App-Cetatos"
```

- Lista todas las imágenes (recursivo) con su tamaño.
- Propone vinilo (`vin-001…vin-050`) y tipo por **nombre de archivo**
  (heurística; la certeza real solo la da ver la foto).
- Escribe `scripts/image-mapping.draft.json`.

## Paso 2 — Clasificación visual (la haces tú, con las fotos abiertas)

Abre `image-mapping.draft.json` junto a las imágenes y confirma cada entrada.
Guía rápida de clasificación:

| Tipo        | Qué muestra la foto                                                       |
|-------------|---------------------------------------------------------------------------|
| `CAR_A`     | Carátula **frontal**: arte, título y artista en grande                    |
| `CAR_B`     | Carátula **trasera**: listado de temas, créditos, códigos de barras       |
| `GAL_A`     | Galleta (etiqueta circular) **lado A**: dice "LADO A / SIDE 1", matriz termina en `-A` |
| `GAL_B`     | Galleta **lado B**: "LADO B / SIDE 2", matriz termina en `-B`             |
| `CAR_COMBO` | Una sola imagen con **las dos carátulas** juntas (frente + atrás)         |
| `GAL_COMBO` | Una sola imagen con **las dos galletas** juntas (A + B)                   |
| NO_APLICA   | No corresponde a ningún disco del catálogo → déjala fuera del JSON        |

Pistas para el lado A/B en la galleta: texto "LADO A/B", "SIDE 1/2",
el sufijo de la matriz (…-A / …-B) o el número de catálogo del sello.

Guarda el resultado como **`scripts/image-mapping.json`** con esta forma
(rutas absolutas):

```json
{
  "vin-001": {
    "CAR_A": "C:\\...\\App-Cetatos\\01\\caratula_frente.jpg",
    "CAR_B": "C:\\...\\App-Cetatos\\01\\caratula_trasera.jpg",
    "GAL_A": "C:\\...\\App-Cetatos\\01\\galleta_a.jpg",
    "GAL_B": "C:\\...\\App-Cetatos\\01\\galleta_b.jpg"
  },
  "vin-002": {
    "CAR_COMBO": "C:\\...\\App-Cetatos\\02\\caratulas.jpg",
    "GAL_COMBO": "C:\\...\\App-Cetatos\\02\\galletas.jpg"
  }
}
```

## Paso 3 — Subida a Cloudinary

```bash
node scripts/upload-to-cloudinary.mjs
```

- `public_id` determinista: `vin-XXX_CAR_A`, `vin-XXX_GAL_COMBO`, etc.
- `overwrite=true` (reescribe si ya existe), preset unsigned `appcetato_unsigned`,
  cloud `fcnzjtqx` (sobre-escribible con `CLOUDINARY_CLOUD_NAME` /
  `CLOUDINARY_UPLOAD_PRESET`).
- Verifica **HTTP 200 + public_id** en cada respuesta y escribe
  `scripts/upload-report.json`.

> Si Cloudinary rechazara `public_id` con preset unsigned (política de cuenta),
> crea el preset permitiendo "public_id/overwrite" en
> Cloudinary → Settings → Upload → Upload presets, o usa un preset firmado.

## Paso 4 — Aplicar al catálogo

```bash
node scripts/apply-mapping.mjs
```

Actualiza `src/data/catalog.json` (solo campos de imagen; los metadatos no se
tocan), elimina el campo heredado `labelImageId` y muestra el resumen
(4 fotos / combinadas / sin foto).

## Paso 5 — Verificar y publicar

```bash
npm run typecheck && npm run build
git add -A
git commit -m "feat: fotos reales por disco (4 slots) desde carpeta OneDrive"
git push origin main
```
