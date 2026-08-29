import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Check, ChevronDown, Disc3, Mic2, Music, RotateCcw, Tag, X } from "lucide-react";
import type { FilterGroup, Filters, Vinyl } from "../types";
import { EMPTY_FILTERS, FORMAT_OPTIONS } from "../types";
import { decadeOf } from "../lib/utils";

interface Props {
  open: boolean;
  collection: Vinyl[];
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}

interface SectionDef {
  key: FilterGroup;
  title: string;
  Icon: LucideIcon;
  items: Array<{ value: string; count: number }>;
}

const SECTION_ICONS: Record<FilterGroup, LucideIcon> = {
  formats: Disc3,
  genres: Music,
  labels: Tag,
  decades: CalendarDays,
  artists: Mic2,
};

const SECTION_TITLES: Record<FilterGroup, string> = {
  formats: "Formatos",
  genres: "Géneros",
  labels: "Sellos",
  decades: "Décadas",
  artists: "Artistas",
};

/**
 * Bottom-sheet de filtros para móvil. Trabaja sobre un borrador local
 * (draft) que solo se confirma al pulsar «Aplicar filtros», evitando
 * re-renders del catálogo en cada toque.
 */
export default function MobileFilterDrawer({ open, collection, filters, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);
  const [expanded, setExpanded] = useState<FilterGroup | null>("genres");

  /* Sincroniza el borrador con los filtros activos cada vez que se abre */
  useEffect(() => {
    if (open) {
      setDraft(filters);
      setExpanded("genres");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Bloquea el scroll del fondo mientras el drawer está abierto */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sections = useMemo<SectionDef[]>(() => {
    const count = (fn: (v: Vinyl) => string | null) => {
      const m = new Map<string, number>();
      collection.forEach((v) => {
        const k = fn(v);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      });
      return m;
    };
    const toItems = (m: Map<string, number>, sort: "desc" | "asc" = "desc") =>
      [...m.entries()]
        .sort((a, b) => (sort === "desc" ? b[1] - a[1] : a[0].localeCompare(b[0])))
        .map(([value, c]) => ({ value, count: c }));

    const formats = new Map<string, number>();
    FORMAT_OPTIONS.forEach((f) => formats.set(f, 0));
    collection.forEach((v) => formats.set(v.format, (formats.get(v.format) ?? 0) + 1));

    return [
      { key: "formats", title: SECTION_TITLES.formats, Icon: SECTION_ICONS.formats, items: toItems(formats) },
      { key: "genres", title: SECTION_TITLES.genres, Icon: SECTION_ICONS.genres, items: toItems(count((v) => v.genre)) },
      { key: "labels", title: SECTION_TITLES.labels, Icon: SECTION_ICONS.labels, items: toItems(count((v) => v.label)) },
      { key: "decades", title: SECTION_TITLES.decades, Icon: SECTION_ICONS.decades, items: toItems(count((v) => decadeOf(v.year)), "asc") },
      { key: "artists", title: SECTION_TITLES.artists, Icon: SECTION_ICONS.artists, items: toItems(count((v) => v.artist)) },
    ];
  }, [collection]);

  const activeCount = (Object.values(draft) as string[][]).reduce((a, l) => a + l.length, 0);

  const toggleSection = (key: FilterGroup) => setExpanded((e) => (e === key ? null : key));

  const toggleItem = (key: FilterGroup, value: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter((x) => x !== value) : [...d[key], value],
    }));

  const clearDraft = () => setDraft({ ...EMPTY_FILTERS });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros del catálogo"
            className="fixed inset-x-0 bottom-0 z-[95] flex max-h-[84vh] flex-col rounded-t-2xl border-t border-slate-700 bg-slate-900 shadow-2xl shadow-black/70"
          >
            {/* Asa de arrastre */}
            <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Cabecera */}
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 pb-3">
              <div>
                <h2 className="font-display text-2xl tracking-wide text-slate-50">FILTROS</h2>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {activeCount > 0
                    ? `${activeCount} ${activeCount === 1 ? "criterio activo" : "criterios activos"}`
                    : "Combina criterios · lógica AND"}
                </p>
              </div>
              {activeCount > 0 && (
                <span className="ml-auto mr-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400">
                  {activeCount}
                </span>
              )}
              <button
                onClick={onClose}
                aria-label="Cerrar filtros"
                className="touch-manipulation grid h-11 w-11 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-amber-500/60 hover:text-amber-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Secciones colapsables */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {sections.map(({ key, title, Icon, items }) => {
                const isOpen = expanded === key;
                const selected = draft[key];
                return (
                  <div key={key} className="border-b border-slate-800">
                    <button
                      onClick={() => toggleSection(key)}
                      aria-expanded={isOpen}
                      aria-controls={`filter-section-${key}`}
                      className="touch-manipulation flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-slate-800/70"
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors ${
                          selected.length > 0
                            ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                            : "border-slate-700 bg-slate-800 text-slate-400"
                        }`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-slate-100">{title}</span>
                      {selected.length > 0 && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                          {selected.length}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-slate-500">{items.length}</span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-amber-400" : ""}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`filter-section-${key}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <ul className="max-h-60 overflow-y-auto pb-2">
                            {items.map(({ value, count }) => {
                              const checked = selected.includes(value);
                              return (
                                <li key={value}>
                                  <label
                                    className={`touch-manipulation flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                                      checked ? "bg-amber-500/[0.07]" : "active:bg-slate-800"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleItem(key, value)}
                                      className="peer sr-only"
                                    />
                                    <span
                                      aria-hidden="true"
                                      className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-all ${
                                        checked
                                          ? "border-amber-500 bg-amber-500 text-slate-950"
                                          : "border-slate-600 bg-slate-800 text-transparent"
                                      }`}
                                    >
                                      <Check size={13} strokeWidth={3.2} />
                                    </span>
                                    <span
                                      className={`flex-1 truncate text-sm ${
                                        checked ? "font-semibold text-amber-400" : "text-slate-300"
                                      }`}
                                    >
                                      {value}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500">
                                      {count} {count === 1 ? "disco" : "discos"}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Barra de acciones */}
            <div className="flex gap-3 border-t border-slate-800 bg-slate-900/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                onClick={clearDraft}
                disabled={activeCount === 0}
                className="touch-manipulation flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-400 disabled:opacity-40"
              >
                <RotateCcw size={15} />
                Limpiar
              </button>
              <button
                onClick={() => {
                  onApply(draft);
                  onClose();
                }}
                className="touch-manipulation flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-lg bg-amber-500 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400"
              >
                Aplicar filtros{activeCount > 0 ? ` (${activeCount})` : ""}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
