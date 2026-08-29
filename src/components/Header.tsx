import { useMemo, useState } from "react";
import {
  BarChart3,
  Disc3,
  FileDown,
  LayoutGrid,
  Plus,
  Search,
  Table2,
  X,
} from "lucide-react";
import type { FilterGroup, Filters, ViewMode, Vinyl } from "../types";
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
  onOpenStats: () => void;
  onOpenAdd: () => void;
  onExportCatalog: () => void;
}

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
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-slate-700/60 sm:py-2.5"
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-slate-900/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-2 py-3 sm:gap-5">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/10">
              <Disc3 size={24} className="animate-spin-slow text-amber-500" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-[27px] leading-none tracking-[0.04em] text-slate-50">
                APP<span className="text-amber-500">CETATO</span>
              </h1>
              <p className="mt-1 font-mono text-[9.5px] tracking-[0.22em] text-slate-500">
                CATÁLOGO MAESTRO · {collection.length} REF.
              </p>
            </div>
          </div>

          {/* Búsqueda (desktop) */}
          <div className="hidden max-w-xl flex-1 md:block">{searchBox}</div>

          {/* Controles */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onOpenStats}
              title="Estadísticas del catálogo"
              aria-label="Estadísticas del catálogo"
              className="touch-manipulation flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-400 active:scale-[0.96]"
            >
              <BarChart3 size={16} />
              <span className="hidden lg:inline">Estadísticas</span>
            </button>

            <button
              onClick={onExportCatalog}
              title="Exportar catálogo completo (PDF)"
              aria-label="Exportar catálogo completo en PDF"
              className="touch-manipulation flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-medium text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-400 active:scale-[0.96]"
            >
              <FileDown size={16} />
              <span className="hidden lg:inline">PDF</span>
            </button>

            <div
              className="flex h-11 overflow-hidden rounded-lg border border-slate-700"
              role="group"
              aria-label="Cambiar vista"
            >
              <button
                onClick={() => onViewChange("grid")}
                title="Vista galería"
                aria-label="Vista galería"
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
                aria-label="Vista tabla"
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

            <button
              onClick={onOpenAdd}
              aria-label="Agregar vinilo"
              className="touch-manipulation flex h-11 items-center gap-2 rounded-lg bg-amber-500 px-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 hover:shadow-amber-500/40 active:scale-[0.96] sm:px-4"
            >
              <Plus size={17} strokeWidth={2.6} />
              <span className="hidden sm:inline">Agregar Vinilo</span>
            </button>
          </div>
        </div>

        {/* Búsqueda (móvil) */}
        <div className="pb-3 md:hidden">{searchBox}</div>

        {/* Filtros: scroll horizontal en móvil */}
        <div className="border-t border-slate-800 py-2.5">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 sm:pb-0">
            <FilterChips
              collection={collection}
              filters={filters}
              onToggle={onToggleFilter}
              onClear={onClearFilters}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
