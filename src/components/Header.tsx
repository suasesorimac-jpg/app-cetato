import { useMemo, useState } from "react";
import {
  BarChart3,
  Compass,
  Disc3,
  FileDown,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";
import type { FilterGroup, Filters, NavMode, ViewMode, Vinyl } from "../types";
import { buildSuggestions } from "../lib/utils";
import FilterChips from "./FilterChips";

interface Props {
  collection: Vinyl[];
  query: string;
  onQueryChange: (q: string) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filters: Filters;
  onToggleFilter: (group: FilterGroup, value: string) => void;
  onClearFilters: () => void;
  mode: NavMode;
  onModeChange: (m: NavMode) => void;
  activeFilterCount: number;
  onOpenDrawer: () => void;
  onOpenStats: () => void;
  onOpenAdd: () => void;
  onExportCatalog: () => void;
}

const iconBtnCls =
  "touch-manipulation flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-400";

export default function Header(props: Props) {
  const {
    collection,
    query,
    onQueryChange,
    view,
    onViewChange,
    filters,
    onToggleFilter,
    onClearFilters,
    mode,
    onModeChange,
    activeFilterCount,
    onOpenDrawer,
    onOpenStats,
    onOpenAdd,
    onExportCatalog,
  } = props;

  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => buildSuggestions(collection, query), [collection, query]);

  const searchBox = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="Buscar por artista, álbum, sello, matriz, año o género…"
        aria-label="Buscar en el catálogo"
        className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-11 font-mono text-sm text-slate-100 outline-none transition-all duration-200 placeholder:font-sans placeholder:text-slate-500 focus:border-amber-500 focus:shadow-lg focus:shadow-amber-500/15 focus:ring-2 focus:ring-amber-500/25"
      />
      {query && (
        <button
          onClick={() => onQueryChange("")}
          aria-label="Limpiar búsqueda"
          className="touch-manipulation absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:text-amber-400"
        >
          <X size={16} />
        </button>
      )}

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/60">
          {suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <button
                key={s.type + s.value + i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onQueryChange(s.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60"
              >
                <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  {s.type}
                </span>
                <span className="truncate">{s.value}</span>
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-slate-400">
              Sin coincidencias directas para «{query}» — la búsqueda se aplica en tiempo real
              sobre todo el catálogo.
            </p>
          )}
        </div>
      )}
    </div>
  );

  /* Selector de modo: Catálogo ↔ Explorar.
     Móvil: segmento a ancho completo con texto visible.
     Desktop (md+): ancho automático — idéntico al diseño anterior. */
  const modeToggle = (
    <div
      className="flex h-11 w-full shrink-0 overflow-hidden rounded-lg border border-slate-700 md:w-auto"
      role="group"
      aria-label="Modo de navegación"
    >
      <button
        onClick={() => onModeChange("catalog")}
        aria-pressed={mode === "catalog"}
        title="Catálogo completo"
        className={`touch-manipulation flex flex-1 items-center justify-center gap-1.5 px-3 text-sm font-semibold transition-colors md:flex-none md:justify-start ${
          mode === "catalog"
            ? "bg-amber-500 text-slate-950"
            : "bg-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        <LayoutGrid size={15} />
        <span>Catálogo</span>
      </button>
      <button
        onClick={() => onModeChange("explore")}
        aria-pressed={mode === "explore"}
        title="Exploración por género → artista → álbum"
        className={`touch-manipulation flex flex-1 items-center justify-center gap-1.5 border-l border-slate-700 px-3 text-sm font-semibold transition-colors md:flex-none md:justify-start ${
          mode === "explore"
            ? "bg-amber-500 text-slate-950"
            : "bg-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        <Compass size={15} />
        <span>Explorar</span>
      </button>
    </div>
  );

  const viewToggle = (
    <div
      className="flex h-11 shrink-0 overflow-hidden rounded-lg border border-slate-700"
      role="group"
      aria-label="Cambiar vista"
    >
      <button
        onClick={() => onViewChange("grid")}
        title="Vista galería"
        aria-pressed={view === "grid"}
        className={`touch-manipulation grid w-11 place-items-center transition-colors ${
          view === "grid"
            ? "bg-amber-500 text-slate-950"
            : "bg-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        onClick={() => onViewChange("table")}
        title="Vista tabla"
        aria-pressed={view === "table"}
        className={`touch-manipulation grid w-11 place-items-center border-l border-slate-700 transition-colors ${
          view === "table"
            ? "bg-amber-500 text-slate-950"
            : "bg-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        <Table2 size={16} />
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-slate-900/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Fila 1: marca + búsqueda (desktop) + controles ── */}
        <div className="flex items-center gap-2.5 py-3 md:gap-3">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5 md:gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/10">
              <Disc3 size={24} className="animate-spin-slow text-amber-500" />
            </div>
            {/* Nombre visible también en móvil; bajo 360px usa la forma abreviada */}
            <div className="min-w-0">
              <h1 className="truncate font-display text-[22px] leading-none tracking-[0.04em] text-slate-50 md:text-[27px]">
                <span className="min-[360px]:hidden">
                  APP<span className="text-amber-500">.</span>
                </span>
                <span className="hidden min-[360px]:inline">
                  APP<span className="text-amber-500">CETATO</span>
                </span>
              </h1>
              <p className="mt-1 hidden font-mono text-[9.5px] tracking-[0.22em] text-slate-500 md:block">
                CATÁLOGO MAESTRO · {collection.length} REF.
              </p>
            </div>
          </div>

          {/* Búsqueda (desktop) */}
          <div className="hidden max-w-xl flex-1 md:block">{searchBox}</div>

          {/* Controles (desktop ≥768px — sin cambios) */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button onClick={onOpenStats} title="Estadísticas del catálogo" className={iconBtnCls}>
              <BarChart3 size={16} />
              <span className="hidden lg:inline">Estadísticas</span>
            </button>

            <button
              onClick={onExportCatalog}
              title="Exportar catálogo completo (PDF)"
              className={iconBtnCls}
            >
              <FileDown size={16} />
              <span className="hidden lg:inline">PDF</span>
            </button>

            {modeToggle}

            {mode === "catalog" && <div className="hidden md:block">{viewToggle}</div>}

            <button
              onClick={onOpenAdd}
              title="Agregar vinilo"
              className="touch-manipulation flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40"
            >
              <Plus size={17} strokeWidth={2.6} />
              <span>Agregar</span>
            </button>
          </div>

          {/* Agregar (móvil) — siempre icono + texto */}
          <button
            onClick={onOpenAdd}
            title="Agregar vinilo"
            className="touch-manipulation ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 active:scale-[0.97] md:hidden"
          >
            <Plus size={17} strokeWidth={2.6} />
            <span>Agregar</span>
          </button>
        </div>

        {/* ── Fila 2 (móvil): búsqueda a ancho completo ── */}
        <div className="pb-2.5 md:hidden">{searchBox}</div>

        {/* ── Fila 3 (móvil): modo de navegación + vista ── */}
        <div className="flex items-center gap-2 pb-2.5 md:hidden">
          {modeToggle}
          {mode === "catalog" && viewToggle}
        </div>

        {/* ── Fila 4 (móvil): acciones del modo, siempre con icono + texto ── */}
        {mode === "catalog" ? (
          <div className="flex flex-wrap items-center gap-2 pb-3 md:hidden">
            <button
              onClick={onOpenDrawer}
              aria-label="Abrir filtros"
              className="touch-manipulation relative flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/60 hover:text-amber-400"
            >
              <SlidersHorizontal size={15} />
              Filtrar
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-bold text-slate-950 shadow-md shadow-amber-500/40">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={onOpenStats} title="Estadísticas del catálogo" className={iconBtnCls}>
              <BarChart3 size={16} />
              <span>Estadísticas</span>
            </button>
            <button
              onClick={onExportCatalog}
              title="Exportar catálogo (PDF)"
              className={iconBtnCls}
            >
              <FileDown size={16} />
              <span>PDF</span>
            </button>
          </div>
        ) : (
          <p className="flex h-11 items-center gap-2 pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 md:hidden">
            <span className="text-amber-500">◆</span> Género → Artista → Álbum
          </p>
        )}

        {/* ── Chips de filtro (solo escritorio y solo en modo catálogo) ── */}
        {mode === "catalog" && (
          <div className="hidden border-t border-slate-800 py-2.5 md:block">
            <FilterChips
              collection={collection}
              filters={filters}
              onToggle={onToggleFilter}
              onClear={onClearFilters}
            />
          </div>
        )}
      </div>
    </header>
  );
}
