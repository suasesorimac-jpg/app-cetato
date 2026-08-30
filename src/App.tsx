import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { FilterGroup, NavMode, Prefs, ViewMode, Vinyl } from "./types";
import { EMPTY_FILTERS } from "./types";
import seedCatalog from "./data/catalog.json";
import { loadCollection, loadPrefs, saveCollection, savePrefs } from "./lib/storage";
import { decadeOf, normalizeText } from "./lib/utils";
import { useDebouncedValue } from "./hooks";
import { exportCatalogPdf } from "./lib/pdf";
import { isCloudinaryConfigured } from "./config/cloudinary";
import { ToastProvider, useToast } from "./components/Toast";
import Header from "./components/Header";
import VinylGrid from "./components/VinylGrid";
import VinylTable from "./components/VinylTable";
import EmptyState from "./components/EmptyState";
import DetailModal from "./components/DetailModal";
import VinylForm from "./components/VinylForm";
import StatsModal from "./components/StatsModal";
import MobileFilterDrawer from "./components/MobileFilterDrawer";
import HierarchicalBrowser from "./components/HierarchicalBrowser";

function initCollection(): Vinyl[] {
  const stored = loadCollection();
  if (stored) {
    /* Re-enriquece registros antiguos guardados antes del campo `artists` */
    return enrichCatalogWithArtists(stored);
  }
  const seed = seedCatalog as Vinyl[];
  saveCollection(seed);
  return enrichCatalogWithArtists(seed);
}

function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900" />
      <div className="animate-groove-pulse absolute -right-48 -top-48 h-[640px] w-[640px] rounded-full bg-grooves" />
      <div className="absolute -bottom-72 -left-72 h-[760px] w-[760px] rounded-full bg-grooves opacity-60" />
      <div className="absolute left-1/4 top-0 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-amber-500/[0.05] blur-3xl" />
      <div className="bg-vignette absolute inset-0" />
      <div className="bg-noise absolute inset-0 opacity-70" />
    </div>
  );
}

function AppInner() {
  const toast = useToast();
  const [collection, setCollection] = useState<Vinyl[]>(initCollection);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [detail, setDetail] = useState<Vinyl | null>(null);
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; record: Vinyl } | null>(
    null
  );
  const [statsOpen, setStatsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { view, filters, query, mode } = prefs;
  const debouncedQuery = useDebouncedValue(query, 300);

  /* ── Persistencia ── */
  useEffect(() => {
    if (!saveCollection(collection)) {
      toast("No se pudo guardar en el dispositivo (almacenamiento lleno)", "error");
    }
  }, [collection, toast]);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  /* ── Acciones de estado ── */
  const setView = (v: ViewMode) => setPrefs((p) => ({ ...p, view: v }));
  const setQuery = (q: string) => setPrefs((p) => ({ ...p, query: q }));
  const setMode = (m: NavMode) => setPrefs((p) => ({ ...p, mode: m }));
  const toggleFilter = (group: FilterGroup, value: string) =>
    setPrefs((p) => {
      const list = p.filters[group];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      return { ...p, filters: { ...p.filters, [group]: next } };
    });
  const clearFilters = () => setPrefs((p) => ({ ...p, filters: EMPTY_FILTERS }));
  const applyFilters = (f: typeof EMPTY_FILTERS) => setPrefs((p) => ({ ...p, filters: f }));
  const clearAll = () => setPrefs((p) => ({ ...p, query: "", filters: EMPTY_FILTERS }));

  const activeFilterCount =
    filters.formats.length +
    filters.labels.length +
    filters.genres.length +
    filters.decades.length +
    filters.artists.length;

  /* ── Búsqueda + filtros (AND entre grupos, multi-campo) ── */
  const filtered = useMemo(() => {
    const q = normalizeText(debouncedQuery.trim());
    return collection.filter((v) => {
      if (filters.formats.length && !filters.formats.includes(v.format)) return false;
      if (filters.labels.length && !filters.labels.includes(v.label)) return false;
      if (filters.genres.length && !filters.genres.includes(v.genre)) return false;
      if (filters.artists.length && !filters.artists.includes(v.artist)) return false;
      if (filters.decades.length) {
        const d = decadeOf(v.year);
        if (!d || !filters.decades.includes(d)) return false;
      }
      if (q) {
        const hay = normalizeText(
          `${v.artist} ${v.album} ${v.label} ${v.matrixCode} ${v.genre} ${String(v.year)}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [collection, filters, debouncedQuery]);

  /* La búsqueda textual tiene prioridad: en modo explorar, una consulta
     activa muestra los resultados del catálogo en lugar de la jerarquía. */
  const showExplore = mode === "explore" && !debouncedQuery.trim();

  /* ── CRUD ── */
  const handleSave = (record: Vinyl) => {
    const isEdit = form?.mode === "edit";
    setCollection((list) =>
      list.some((v) => v.id === record.id)
        ? list.map((v) => (v.id === record.id ? record : v))
        : [record, ...list]
    );
    setForm(null);
    if (detail?.id === record.id) setDetail(record);
    toast(isEdit ? "Vinilo actualizado en el catálogo" : "Vinilo agregado al catálogo", "success");
  };

  const handleDelete = (id: string) => {
    setCollection((list) => list.filter((v) => v.id !== id));
    if (detail?.id === id) setDetail(null);
    toast("Vinilo eliminado del catálogo", "info");
  };

  const handleExportCatalog = () => {
    if (collection.length === 0) {
      toast("El catálogo está vacío", "error");
      return;
    }
    try {
      exportCatalogPdf(collection);
      toast("Catálogo completo exportado a PDF", "success");
    } catch {
      toast("No se pudo generar el PDF del catálogo", "error");
    }
  };

  const labelsList = useMemo(
    () => [...new Set(collection.map((v) => v.label))].sort(),
    [collection]
  );

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="relative min-h-screen font-sans text-slate-50">
      <AmbientBackground />

      <Header
        collection={collection}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
        filters={filters}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        mode={mode}
        onModeChange={setMode}
        activeFilterCount={activeFilterCount}
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenAdd={() => setForm({ mode: "create" })}
        onExportCatalog={handleExportCatalog}
      />

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {!showExplore && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-slate-400" aria-live="polite">
              <span className="font-bold text-amber-400">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "vinilo encontrado" : "vinilos encontrados"}
              {debouncedQuery.trim() && (
                <>
                  {" "}
                  para «<span className="text-slate-200">{debouncedQuery.trim()}</span>»
                </>
              )}
              <span className="text-slate-600"> · de {collection.length} en el catálogo</span>
            </p>
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600 sm:block">
              {view === "grid" ? "◆ Vista galería" : "≡ Vista tabla"}
            </p>
          </div>
        )}

        {showExplore ? (
          <HierarchicalBrowser
            collection={collection}
            onOpenVinyl={setDetail}
            onExit={() => setMode("catalog")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            query={debouncedQuery.trim()}
            hasFilters={hasActiveFilters}
            onSuggest={(s) => {
              clearFilters();
              setQuery(s);
            }}
            onClearAll={clearAll}
          />
        ) : view === "grid" ? (
          <VinylGrid list={filtered} onOpen={setDetail} />
        ) : (
          <VinylTable
            list={filtered}
            onOpen={setDetail}
            onEdit={(v) => setForm({ mode: "edit", record: v })}
            onDelete={handleDelete}
          />
        )}
      </main>

      <footer className="relative border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2.5 px-4 text-center sm:flex-row sm:justify-between sm:px-6">
          <p className="font-mono text-[11px] tracking-[0.14em] text-slate-500">
            APPCETATO · CATÁLOGO MAESTRO DE VINILOS · {collection.length} REFERENCIAS
          </p>
          <p className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isCloudinaryConfigured ? "bg-emerald-400" : "animate-pulse bg-amber-500"
              }`}
            />
            {isCloudinaryConfigured
              ? "Cloudinary conectado"
              : "Modo local · configura VITE_CLOUDINARY_CLOUD_NAME en .env"}
          </p>
        </div>
      </footer>

      {/* Drawer de filtros (móvil) */}
      <MobileFilterDrawer
        open={drawerOpen}
        collection={collection}
        filters={filters}
        onApply={applyFilters}
        onClose={() => setDrawerOpen(false)}
      />

      <AnimatePresence>
        {detail && (
          <DetailModal
            key={detail.id}
            record={detail}
            onClose={() => setDetail(null)}
            onEdit={(v) => {
              setDetail(null);
              setForm({ mode: "edit", record: v });
            }}
          />
        )}
        {form && (
          <VinylForm
            key={form.mode === "edit" ? form.record.id : "nuevo"}
            initial={form.mode === "edit" ? form.record : null}
            labels={labelsList}
            onSave={handleSave}
            onClose={() => setForm(null)}
          />
        )}
        {statsOpen && (
          <StatsModal
            collection={collection}
            onClose={() => setStatsOpen(false)}
            onExportCatalog={handleExportCatalog}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
