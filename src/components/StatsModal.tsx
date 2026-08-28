import { useMemo } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FileDown } from "lucide-react";
import type { Vinyl } from "../types";
import { countImages } from "../types";
import { decadeOf } from "../lib/utils";
import { useCountUp } from "../hooks";
import ModalShell from "./ModalShell";

interface Props {
  collection: Vinyl[];
  onClose: () => void;
  onExportCatalog: () => void;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const n = useCountUp(value);
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-[42px] leading-none text-amber-500">{n}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 font-display text-2xl tracking-wide text-slate-100">
      <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
      {children}
    </h3>
  );
}

export default function StatsModal({ collection, onClose, onExportCatalog }: Props) {
  const stats = useMemo(() => {
    const total = collection.length;
    const withImages = collection.filter((v) => countImages(v) > 0).length;

    const countBy = (fn: (v: Vinyl) => string | null) => {
      const m = new Map<string, number>();
      collection.forEach((v) => {
        const k = fn(v);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      });
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const labels = countBy((v) => v.label);
    const genres = countBy((v) => v.genre);
    const decades = countBy((v) => decadeOf(v.year)).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const years = collection
      .map((v) => v.year)
      .filter((y): y is number => typeof y === "number");
    const span = years.length
      ? `${Math.min(...years)} – ${Math.max(...years)}`
      : "—";

    return { total, withImages, labels, genres, decades, span };
  }, [collection]);

  const maxLabel = Math.max(1, ...stats.labels.map(([, c]) => c));
  const maxGenre = Math.max(1, ...stats.genres.map(([, c]) => c));
  const maxDecade = Math.max(1, ...stats.decades.map(([, c]) => c));
  const docPct = stats.total ? Math.round((stats.withImages / stats.total) * 100) : 0;

  const insights = [
    {
      emoji: "💿",
      node: (
        <>
          Sello más frecuente:{" "}
          <b className="text-slate-50">{stats.labels[0]?.[0] ?? "—"}</b>{" "}
          <span className="text-amber-400">({stats.labels[0]?.[1] ?? 0} discos)</span>
        </>
      ),
    },
    {
      emoji: "📅",
      node: (
        <>
          Década dominante:{" "}
          <b className="text-slate-50">
            {stats.decades.length
              ? [...stats.decades].sort((a, b) => b[1] - a[1])[0][0]
              : "—"}
          </b>{" "}
          <span className="text-amber-400">
            ({stats.decades.length ? [...stats.decades].sort((a, b) => b[1] - a[1])[0][1] : 0}{" "}
            vinilos)
          </span>
        </>
      ),
    },
    {
      emoji: "🎵",
      node: (
        <>
          Género principal: <b className="text-slate-50">{stats.genres[0]?.[0] ?? "—"}</b>{" "}
          <span className="text-amber-400">({stats.genres[0]?.[1] ?? 0} discos)</span>
        </>
      ),
    },
  ];

  return (
    <ModalShell onClose={onClose} maxW="max-w-5xl">
      <div className="max-h-[88vh] overflow-y-auto p-6 md:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Dashboard de la colección
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-4xl tracking-wide text-slate-50 md:text-5xl">
            ESTADÍSTICAS DEL CATÁLOGO
          </h2>
          <button
            onClick={onExportCatalog}
            className="flex h-10 items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 text-sm font-bold text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <FileDown size={16} />
            Exportar catálogo (PDF)
          </button>
        </div>

        {/* Tarjetas */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total de vinilos" value={stats.total} sub="referencias catalogadas" />
          <StatCard
            label="Con imágenes"
            value={stats.withImages}
            sub={`de ${stats.total} documentados`}
          />
          <StatCard label="Sellos disqueros" value={stats.labels.length} sub="casas discográficas" />
          <StatCard label="Géneros" value={stats.genres.length} sub={`años: ${stats.span}`} />
        </div>

        {/* Progreso de documentación */}
        <div className="mt-6 rounded-xl border border-slate-700/70 bg-slate-800/70 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Documentación fotográfica
            </p>
            <p className="font-mono text-xs font-bold text-amber-400">{docPct}%</p>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-700/60">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${docPct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {stats.withImages} de {stats.total} vinilos tienen foto de carátula o galleta.
            {docPct < 100 && " Agrega fotos desde «Editar» para completar el archivo."}
          </p>
        </div>

        {/* Gráficos */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle>TOP 5 SELLOS</SectionTitle>
            <div className="mt-4 space-y-2.5">
              {stats.labels.slice(0, 5).map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-32 truncate text-xs font-medium text-slate-300">{name}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-700/50">
                    <motion.div
                      className="h-full rounded-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxLabel) * 100}%` }}
                      transition={{ delay: 0.15 + i * 0.07, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-7 text-right font-mono text-xs font-bold text-amber-400">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>TOP 5 GÉNEROS</SectionTitle>
            <div className="mt-4 space-y-2.5">
              {stats.genres.slice(0, 5).map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-32 truncate text-xs font-medium text-slate-300">{name}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-700/50">
                    <motion.div
                      className="h-full rounded-full bg-amber-500/75"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxGenre) * 100}%` }}
                      transition={{ delay: 0.2 + i * 0.07, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-7 text-right font-mono text-xs font-bold text-amber-400">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <SectionTitle>DISTRIBUCIÓN POR DÉCADA</SectionTitle>
          <div className="mt-4 flex items-end gap-3 sm:gap-5">
            {stats.decades.map(([decade, count], i) => (
              <div key={decade} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">{count}</span>
                <div className="flex h-36 w-full max-w-[72px] items-end overflow-hidden rounded-t-lg bg-slate-700/40">
                  <motion.div
                    className="w-full rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400"
                    initial={{ height: 0 }}
                    animate={{ height: `${(count / maxDecade) * 100}%` }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                <span className="font-mono text-[10px] tracking-wider text-slate-500">
                  {decade}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-8 rounded-xl border border-slate-700/70 bg-slate-800/70 p-5">
          <SectionTitle>INSIGHTS DE LA COLECCIÓN</SectionTitle>
          <ul className="mt-4 space-y-3">
            {insights.map((ins, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.12 }}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-lg">
                  {ins.emoji}
                </span>
                {ins.node}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}
