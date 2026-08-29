# AppCetato · Catálogo Maestro de Vinilos 🎶

Aplicación web para catalogar una colección de vinilos: referencias, sellos disqueros,
códigos de matriz, fichas técnicas en PDF y estadísticas de la colección.

## Stack

- **React 18** + **TypeScript** + **Vite 6**
- **Tailwind CSS 4** (tema oscuro slate/amber)
- **Framer Motion** (animaciones de tarjetas, modales y gráficos)
- **Lucide React** (iconografía)
- **jsPDF + html2canvas** (exportación de fichas y catálogo completo)
- **Cloudinary** (`@cloudinary/url-gen`) para imágenes con transforms `f_auto,q_auto,w_*`
- **LocalStorage** para persistencia de colección y preferencias
- **PWA**: manifest + Service Worker (Cache First para imágenes de Cloudinary,
  Network First para datos → la colección es consultable offline)

## Puesta en marcha

```bash
npm install
npm run dev       # desarrollo → http://localhost:3000
npm run build     # producción → dist/
```

## Configuración de Cloudinary (opcional)

1. Copia `.env.example` a `.env`
2. Completa tu **Cloud Name** y un **upload preset unsigned**:

```env
VITE_CLOUDINARY_CLOUD_NAME=tu-nube
VITE_CLOUDINARY_UPLOAD_PRESET=appcetato_unsigned
```

Sin configuración, la app funciona en **modo local**: las fotos se comprimen
y se guardan dentro del dispositivo (LocalStorage).

## Funcionalidades

- Catálogo inicial de **50 vinilos** (cumbia, porro, vallenato, salsa, bolero…)
- Vista **galería** (tarjetas con disco que se asoma de la funda al hover)
  y vista **tabla** (columnas ordenables, matriz resaltada en mono)
- **Modo Exploración** jerárquico: Género → Artista → Álbum, con breadcrumb,
  botón «Atrás» y transiciones de slide direccionales
- Búsqueda multi-campo con debounce (artista, álbum, sello, matriz, año, género)
- Filtros combinables (AND): formato, sello, género, década y artista
  - Escritorio: chips horizontales con contadores
  - Móvil: botón «Filtrar» → bottom-sheet con secciones colapsables,
    selección múltiple y borrador que se confirma con «Aplicar»
- Alta/edición de vinilos con validación y subida de carátula/galleta (≤ 5 MB)
- **Exportar PDF**: ficha técnica individual y catálogo completo
- **Dashboard**: contadores animados, top sellos/géneros, décadas, insights
- Persistencia de colección, vista, filtros y última búsqueda

## Estructura

```
src/
├── config/cloudinary.ts    # credenciales desde env + URLs optimizadas
├── data/catalog.json       # 50 vinilos iniciales
├── lib/                    # storage, upload, pdf, utilidades
├── components/             # Header, Grid, Table, Modales, Toast, Chips,
│                           # MobileFilterDrawer, HierarchicalBrowser,
│                           # CloudinaryUpload (cámara/galería)
└── hooks.ts                # useDebouncedValue, useCountUp
public/
├── manifest.webmanifest    # PWA
├── sw.js                   # Service Worker
└── icons/                  # icono de la app
scripts/                    # fotos reales: inspección, subida y mapeo
```

## Fotos reales por disco (hasta 4 por ejemplar)

Cada vinilo tiene 4 slots: carátula frontal, carátula trasera, galleta lado A
y galleta lado B (las fotos combinadas A+B ocupan un solo slot).
`public_id` en Cloudinary con la forma `vin-XXX_CAR_A`, `vin-XXX_GAL_COMBO`, etc.

```bash
node scripts/inspect-folder.mjs "RUTA_DE_LA_CARPETA"  # propuesta de mapeo
# → revisar/editar scripts/image-mapping.json (ver scripts/README.md)
node scripts/upload-to-cloudinary.mjs                 # subida + verificación
node scripts/apply-mapping.mjs                        # actualiza catalog.json
```

## Nota sobre importación masiva

Actualmente la carga de discos es **individual** (formulario "Agregar Vinilo").
No existe aún importación masiva por CSV/Excel/JSON — está prevista como mejora.

## Licencia

MIT
