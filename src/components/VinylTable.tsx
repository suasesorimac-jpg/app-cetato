import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import type { SortKey, SortState, Vinyl } from "../types";
import { formatYearShort, normalizeText } from "../lib/utils";
import { CoverImage } from "./VinylArt";

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "artist", label: "Artista" },
  { key: "album", label: "Álbum" },
  { key: "label", label: "Sello" },
  { key: "matrixCode", label: "Matriz" },
  { key: "year", label: "Año" },
  { key: "genre", label: "Género" },
];

interface Props {
  list: Vinyl[];
  onOpen: (v: Vinyl) => void;
  onEdit: (v: Vinyl) => void;
  onDelete: (id: string) => void;
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        danger
          ? "text-slate-500 hover:bg-red-500/15 hover:text-red-400"
          : "text-slate-400 hover:bg-slate-700 hover:text-amber-400"
      }`}
    >
      {children}
    </button>
  );
}

export default function VinylTable({ list, onOpen, onEdit, onDelete }: Props) {
  const [sort, setSort] = useState<SortState>({ key: "artist", dir: "asc" });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const mul = sort.dir === "asc" ? 1 : -1;
    const val = (v: Vinyl): string | number => {
      if (sort.key === "year") return typeof v.year === "number" ? v.year : 9999;
      const raw = v[sort.key];
      return typeof raw === "string" ? normalizeText(raw) : String(raw);
    };
    return [...list].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return cmp * mul;
    });
  }, [list, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-800/70 shadow-xl shadow-black/30">
      <div className="max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900">
            <tr className="border-b border-slate-700">
              <th className="py-3 pl-4 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Vinilo
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-3">
                  <button
                    onClick={() => toggleSort(c.key)}
                    className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-amber-400"
                  >
                    {c.label}
                    {sort.key === c.key ? (
                      sort.dir === "asc" ? (
                        <ArrowUp size={11} className="text-amber-400" />
                      ) : (
                        <ArrowDown size={11} className="text-amber-400" />
                      )
                    ) : (
                      <ArrowUpDown size={11} className="text-slate-600" />
                    )}
                  </button>
                </th>
              ))}
              <th className="py-3 pl-3 pr-4 text-right font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => (
              <motion.tr
                key={v.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.25 }}
                onClick={() => onOpen(v)}
                className="cursor-pointer border-b border-slate-700/50 transition-colors last:border-0 hover:bg-amber-500/10"
              >
                <td className="py-2.5 pl-4 pr-3">
                  <CoverImage
                    record={v}
                    width={120}
                    className="h-10 w-10 rounded-md border border-slate-700"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-100">
                  {v.artist}
                </td>
                <td className="px-3 py-2.5 text-slate-200">{v.album}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{v.label}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-md border border-slate-700/60 bg-slate-900 px-2 py-1 font-mono text-xs font-medium text-amber-400">
                    {v.matrixCode}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-300">
                  {formatYearShort(v.year)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="whitespace-nowrap rounded-full border border-slate-600/70 px-2 py-0.5 text-[11px] text-slate-300">
                    {v.genre}
                  </span>
                </td>
                <td className="py-2.5 pl-3 pr-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Ver ficha" onClick={() => onOpen(v)}>
                      <Eye size={15} />
                    </IconBtn>
                    <IconBtn title="Editar" onClick={() => onEdit(v)}>
                      <Pencil size={15} />
                    </IconBtn>
                    {confirmId === v.id ? (
                      <button
                        onClick={() => {
                          onDelete(v.id);
                          setConfirmId(null);
                        }}
                        onMouseLeave={() => setConfirmId(null)}
                        className="rounded-md bg-red-500/15 px-2 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/30"
                      >
                        ¿Borrar?
                      </button>
                    ) : (
                      <IconBtn
                        title="Eliminar"
                        danger
                        onClick={() => {
                          setConfirmId(v.id);
                          window.setTimeout(
                            () => setConfirmId((c) => (c === v.id ? null : c)),
                            2600
                          );
                        }}
                      >
                        <Trash2 size={15} />
                      </IconBtn>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
