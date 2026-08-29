import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Disc3 } from "lucide-react";
import type { HierarchyState, Vinyl } from "../types";
import { formatYearShort } from "../lib/utils";
import { CoverImage } from "./VinylArt";
import VinylGrid from "./VinylGrid";

interface Props {
  collection: Vinyl[];
  onOpenVinyl: (v: Vinyl) => void;
  onExit: () => void;
}

/* Transición entre niveles: slide horizontal direccional */
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 64 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.24, ease: "easeOut" as const } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -64, transition: { duration: 0.18, ease: "easeIn" as const } }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function Crumb({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      aria-current={active ? "page" : undefined}
      className={`touch-manipulation h-11 shrink-0 truncate rounded-lg px-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
        active
          ? "max-w-[46vw] bg-amber-500 font-bold text-slate-950"
          : "max-w-[36vw] border border-slate-700 bg-slate-800 text-slate-400 hover:border-amber-500/60 hover:text-amber-400"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Navegación jerárquica (modo exploración):
 *   Nivel 0: lista de GÉNEROS  →  Nivel 1: ARTISTAS del género
 *   →  Nivel 2: ÁLBUMES del artista  →  abre la ficha del vinilo.
 * El estado `hierarchy` guarda el punto de la jerarquía y `dir` la
 * dirección de la última navegación para animar el slide correctamente.
 */
export default function HierarchicalBrowser({ collection, onOpenVinyl, onExit }: Props) {
  const [hierarchy, setHierarchy] = useState<HierarchyState>({ genre: null, artist: null });
  const [dir, setDir] = useState(1);
  const { genre, artist } = hierarchy;

  /* ── Datos derivados por nivel ── */
  const genres = useMemo(() => {
    const m = new Map<string, Vinyl[]>();
    collection.forEach((v) => {
      const arr = m.get(v.genre) ?? [];
      arr.push(v);
      m.set(v.genre, arr);
    });
    return [...m.entries()]
      .map(([name, vinyls]) => ({ name, vinyls }))
      .sort((a, b) => b.vinyls.length - a.vinyls.length);
  }, [collection]);

  const artists = useMemo(() => {
    if (!genre) return [];
    const m = new Map<string, Vinyl[]>();
    collection
      .filter((v) => v.genre === genre)
      .forEach((v) => {
        const arr = m.get(v.artist) ?? [];
        arr.push(v);
        m.set(v.artist, arr);
      });
    return [...m.entries()]
      .map(([name, vinyls]) => {
        const years = vinyls
          .map((v) => v.year)
          .filter((y): y is number => typeof y === "number");
        return {
          name,
          vinyls,
          span: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "N/E",
        };
      })
      .sort((a, b) => b.vinyls.length - a.vinyls.length);
  }, [collection, genre]);

  const albums = useMemo(
    () => (genre && artist ? collection.filter((v) => v.genre === genre && v.artist === artist) : []),
    [collection, genre, artist]
  );

  /* ── Acciones de navegación ── */
  const selectGenre = (g: string) => {
    setDir(1);
    setHierarchy({ genre: g, artist: null });
  };
  const selectArtist = (a: string) => {
    setDir(1);
    setHierarchy((h) => ({ ...h, artist: a }));
  };
  const backToGenres = () => {
    setDir(-1);
    setHierarchy({ genre: null, artist: null });
  };
  const backToArtists = () => {
    setDir(-1);
    setHierarchy((h) => ({ ...h, artist: null }));
  };

  const levelTitle = !genre ? "ELIGE UN GÉNERO" : !artist ? genre.toUpperCase() : artist.toUpperCase();
  const levelSub = !genre
    ? `${collection.length} referencias · ${genres.length} géneros en la colección`
    : !artist
      ? `${artists.length} ${artists.length === 1 ? "artista" : "artistas"} · ${genres.find((g) => g.name === genre)?.vinyls.length ?? 0} discos de ${genre}`
      : `${albums.length} ${albums.length === 1 ? "álbum" : "álbumes"} · toca uno para abrir su ficha`;

  return (
    <div className="relative">
      {/* Breadcrumb + volver */}
      <div className="mb-4 flex items-center gap-1.5">
        <button
          onClick={genre ? (artist ? backToArtists : backToGenres) : onExit}
          aria-label="Atrás"
          className="touch-manipulation grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-400"
        >
          <ChevronLeft size={19} />
        </button>
        <nav aria-label="Ruta de exploración" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Crumb label="Géneros" active={!genre} onClick={backToGenres} />
          {genre && (
            <>
              <ChevronRight size={13} className="shrink-0 text-slate-600" />
              <Crumb label={genre} active={!artist} onClick={backToArtists} />
            </>
          )}
          {genre && artist && (
            <>
              <ChevronRight size={13} className="shrink-0 text-slate-600" />
              <Crumb label={artist} active />
            </>
          )}
        </nav>
        <button
          onClick={onExit}
          className="touch-manipulation hidden h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-400 transition-colors hover:border-amber-500/60 hover:text-amber-400 sm:flex"
        >
          <ArrowLeft size={14} />
          Catálogo
        </button>
      </div>

      {/* Encabezado del nivel */}
      <div className="mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-500/80">
          Modo exploración · {genre ? (artist ? "Nivel 3/3" : "Nivel 2/3") : "Nivel 1/3"}
        </p>
        <h2 className="mt-1 font-display text-4xl leading-[0.95] tracking-wide text-slate-50 sm:text-5xl">
          {levelTitle}
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">{levelSub}</p>
      </div>

      {/* Contenido del nivel con slide direccional */}
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={`${genre ?? "g"}-${artist ?? "a"}`}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {!genre ? (
            /* ── Nivel 1: géneros ── */
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
              {genres.map(({ name, vinyls }) => (
                <motion.button
                  key={name}
                  variants={itemVariant}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => selectGenre(name)}
                  className="touch-manipulation group rounded-xl border border-slate-700/70 bg-slate-800/90 p-3.5 text-left shadow-lg shadow-black/20 transition-colors hover:border-amber-500/70"
                >
                  <div className="flex -space-x-4">
                    {vinyls.slice(0, 3).map((v, i) => (
                      <div
                        key={v.id}
                        className={`h-16 w-16 overflow-hidden rounded-md border border-slate-700 shadow-lg shadow-black/50 transition-transform duration-300 group-hover:-translate-y-1 ${
                          i === 1 ? "rotate-3" : i === 2 ? "-rotate-2" : "-rotate-3"
                        }`}
                      >
                        <CoverImage record={v} width={160} className="h-full w-full" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 truncate text-[15px] font-bold text-slate-50">{name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                    <Disc3 size={11} className="text-amber-500/70" />
                    {vinyls.length} {vinyls.length === 1 ? "disco" : "discos"}
                    <ChevronRight
                      size={12}
                      className="ml-auto text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-amber-400"
                    />
                  </p>
                </motion.button>
              ))}
            </motion.div>
          ) : !artist ? (
            /* ── Nivel 2: artistas del género ── */
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-800/70 shadow-xl shadow-black/30"
            >
              <ul className="divide-y divide-slate-700/50">
                {artists.map(({ name, vinyls, span }) => (
                  <motion.li key={name} variants={itemVariant}>
                    <button
                      onClick={() => selectArtist(name)}
                      className="touch-manipulation flex min-h-[64px] w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors hover:bg-amber-500/[0.08] active:bg-amber-500/[0.12]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-700 shadow-md shadow-black/40">
                        <CoverImage record={vinyls[0]} width={160} className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-slate-100">{name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {vinyls.length} {vinyls.length === 1 ? "álbum" : "álbumes"} · {span}
                        </p>
                      </div>
                      <ChevronRight size={17} className="shrink-0 text-slate-600" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : (
            /* ── Nivel 3: álbumes del artista (reutiliza la cuadrícula) ── */
            <div>
              <VinylGrid list={albums} onOpen={onOpenVinyl} />
              <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">
                Toca un álbum para ver carátula, galleta y metadatos
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Pie con referencia al primer vinilo del nivel (detalle rápido) */}
      {genre && artist && albums.length > 0 && (
        <p className="mt-5 flex items-center justify-center gap-2 font-mono text-[11px] text-slate-500">
          <span className="text-amber-500">◆</span>
          {formatYearShort(albums[0].year)} · {albums[0].label} · matriz{" "}
          <span className="text-amber-400">{albums[0].matrixCode}</span>
        </p>
      )}
    </div>
  );
}
