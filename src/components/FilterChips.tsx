import { useMemo } from "react";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import type { FilterGroup, Filters, Vinyl } from "../types";
import { decadeOf } from "../lib/utils";

interface Props {
  collection: Vinyl[];
  filters: Filters;
  onToggle: (group: FilterGroup, value: string) => void;
  onClear: () => void;
}

interface GroupDef {
  key: FilterGroup;
  title: string;
  entries: Array<{ value: string; count: number }>;
}

export default function FilterChips({ collection, filters, onToggle, onClear }: Props) {
  const groups = useMemo<GroupDef[]>(() => {
    const labelMap = new Map<string, number>();
    const genreMap = new Map<string, number>();
    const decadeMap = new Map<string, number>();
    const formatMap = new Map<string, number>();
    for (const v of collection) {
      labelMap.set(v.label, (labelMap.get(v.label) ?? 0) + 1);
      genreMap.set(v.genre, (genreMap.get(v.genre) ?? 0) + 1);
      formatMap.set(v.format, (formatMap.get(v.format) ?? 0) + 1);
      const d = decadeOf(v.year);
      if (d) decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
    }
    const sortDesc = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
    return [
      {
        key: "formats",
        title: "Formato",
        entries: ["33 RPM", "45 RPM", "78 RPM"]
          .map((f) => ({ value: f, count: formatMap.get(f) ?? 0 }))
          .filter((e) => e.count > 0),
      },
      { key: "labels", title: "Sello", entries: sortDesc(labelMap) },
      { key: "genres", title: "Género", entries: sortDesc(genreMap) },
      {
        key: "decades",
        title: "Década",
        entries: sortDesc(decadeMap).sort((a, b) => a.value.localeCompare(b.value)),
      },
    ];
  }, [collection]);

  const activeCount =
    filters.formats.length + filters.labels.length + filters.genres.length + filters.decades.length;

  return (
    <div className="flex flex-nowrap items-center gap-x-4 gap-y-2 sm:flex-wrap">
      {groups.map((g) => (
        <div key={g.key} className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:flex-wrap">
          <span className="mr-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {g.title}
          </span>
          {g.entries.map(({ value, count }) => {
            const active = filters[g.key].includes(value);
            return (
              <motion.button
                key={g.key + value}
                whileTap={{ scale: 0.88 }}
                onClick={() => onToggle(g.key, value)}
                aria-pressed={active}
                className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-200 ${
                  active
                    ? "border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                    : "border-slate-700 bg-slate-800/70 text-slate-300 hover:border-amber-500/60 hover:text-amber-400"
                }`}
              >
                {value}
                <span
                  className={`font-mono text-[10px] leading-none ${
                    active ? "text-slate-900/70" : "text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </motion.button>
            );
          })}
        </div>
      ))}

      {activeCount > 0 && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-400">
            {activeCount} {activeCount === 1 ? "filtro activo" : "filtros activos"}
          </span>
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-amber-400"
          >
            <XCircle size={14} />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
