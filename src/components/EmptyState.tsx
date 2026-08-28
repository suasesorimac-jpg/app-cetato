import { motion } from "framer-motion";
import { Disc3, RotateCcw } from "lucide-react";

const SUGGESTIONS = ["Cumbia", "Discos Fuentes", "Sonolux", "1970s", "Vallenato", "45 RPM"];

interface Props {
  query: string;
  hasFilters: boolean;
  onSuggest: (s: string) => void;
  onClearAll: () => void;
}

export default function EmptyState({ query, hasFilters, onSuggest, onClearAll }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center"
    >
      <div className="grid h-20 w-20 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10">
        <Disc3 size={40} className="animate-spin-slow text-amber-500" />
      </div>
      <h3 className="mt-6 font-display text-3xl tracking-wide text-slate-100">
        NI UN SURCO COINCIDE
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
        No encontramos vinilos{query ? (
          <>
            {" "}para <span className="font-mono text-amber-400">«{query}»</span>
          </>
        ) : null}
        {hasFilters ? " con los filtros activos" : ""}. Prueba con otra grafía, la matriz, o
        explora estas referencias populares:
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="rounded-full border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:-translate-y-0.5 hover:border-amber-500/70 hover:text-amber-400"
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={onClearAll}
        className="mt-6 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400"
      >
        <RotateCcw size={15} />
        Limpiar búsqueda y filtros
      </button>
    </motion.div>
  );
}
