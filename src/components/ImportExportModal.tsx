import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import type { ImportResult, Vinyl } from "../types";
import { exportToCSV, exportToPDF, importFromCSV } from "../utils/importExport";
import ModalShell from "./ModalShell";
import { useToast } from "./Toast";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vinyls: Vinyl[];
  onImport: (updatedVinyls: Vinyl[]) => void;
}

const sectionTitleCls =
  "mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500";
const actionBtnCls =
  "touch-manipulation flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-600 active:scale-[0.98]";

/**
 * Modal Importar / Exportar:
 *  - Exporta el catálogo a CSV (formato DeepSeek, separador `;`, BOM UTF-8)
 *    o a PDF (ventana de impresión).
 *  - Importa un CSV: actualiza por matriz sin duplicar y agrega los nuevos.
 */
export function ImportExportModal({ isOpen, onClose, vinyls, onImport }: ImportExportModalProps) {
  const toast = useToast();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const csvContent = exportToCSV(vinyls);
    /* BOM UTF-8 para que Excel abra tildes y ñ correctamente */
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appcetato_catalogo_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast(`CSV exportado (${vinyls.length} vinilos)`, "success");
  };

  const handleExportPDF = () => {
    const ok = exportToPDF(vinyls);
    if (!ok) toast("El navegador bloqueó la ventana de impresión", "error");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; /* permite re-importar el mismo archivo */
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportResult({
        total: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [`«${file.name}» no es un archivo CSV`],
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const { result, updatedVinyls } = importFromCSV(csvContent, vinyls);
        setImportResult(result);
        onImport(updatedVinyls);
        toast(
          `Importación: ${result.imported} nuevos · ${result.updated} actualizados`,
          result.imported + result.updated > 0 ? "success" : "info"
        );
      } catch (error) {
        setImportResult({
          total: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [`Error al importar: ${error instanceof Error ? error.message : String(error)}`],
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      setImportResult({
        total: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: ["No se pudo leer el archivo"],
      });
    };
    reader.readAsText(file, "UTF-8");
  };

  const clean = importResult !== null && importResult.errors.length === 0;

  return (
    <ModalShell onClose={onClose} maxW="max-w-lg">
      <div className="flex max-h-[88vh] flex-col">
        {/* Cabecera */}
        <div className="flex items-center gap-3 border-b border-slate-700 p-5 sm:p-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-amber-500 shadow-lg shadow-amber-500/25">
            <FileText size={20} className="text-slate-900" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-white sm:text-xl">
              Importar / Exportar
            </h2>
            <p className="truncate text-sm text-slate-400">
              Gestiona tu catálogo de {vinyls.length} vinilos
            </p>
          </div>
        </div>

        {/* Contenido desplazable */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* ── Exportar ── */}
          <section>
            <h3 className={sectionTitleCls}>Exportar catálogo</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportCSV}
                className={actionBtnCls}
                aria-label="Exportar catálogo en formato CSV"
              >
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportPDF}
                className={actionBtnCls}
                aria-label="Exportar catálogo en formato PDF"
              >
                <FileText size={18} className="text-amber-400" />
                <span>PDF</span>
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              CSV: formato DeepSeek (separador <span className="font-mono">;</span>, UTF-8 con
              BOM). PDF: tabla imprimible del catálogo.
            </p>
          </section>

          <div className="border-t border-slate-700" aria-hidden="true" />

          {/* ── Importar ── */}
          <section>
            <h3 className={sectionTitleCls}>Importar catálogo</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="touch-manipulation flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              aria-label="Seleccionar archivo CSV para importar"
            >
              {isImporting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              <span>{isImporting ? "Procesando…" : "Seleccionar archivo CSV"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Columnas: #, Artista, Título, Sello, Catálogo, Año, País, Formato, Velocidad,
              Carátula, Disco, Observaciones. Los discos existentes se actualizan por matriz —
              no se duplican ni pierden sus fotos.
            </p>
          </section>

          {/* ── Resultado de la importación ── */}
          {importResult && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`rounded-xl border p-4 ${
                clean ? "border-emerald-800 bg-emerald-950/30" : "border-slate-700 bg-slate-900"
              }`}
              role="status"
            >
              <div className="mb-3 flex items-center gap-2">
                {clean ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 text-amber-400" />
                )}
                <h4 className="text-sm font-semibold text-white">Resultado de la importación</h4>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-slate-400">Total de filas</dt>
                <dd className="text-right font-medium text-white">{importResult.total}</dd>
                <dt className="text-slate-400">Importados (nuevos)</dt>
                <dd className="text-right font-medium text-emerald-400">
                  {importResult.imported}
                </dd>
                <dt className="text-slate-400">Actualizados</dt>
                <dd className="text-right font-medium text-amber-400">{importResult.updated}</dd>
                <dt className="text-slate-400">Omitidos</dt>
                <dd className="text-right font-medium text-red-400">{importResult.skipped}</dd>
              </dl>
              {importResult.errors.length > 0 && (
                <div className="mt-3 border-t border-slate-700 pt-3">
                  <h5 className="mb-1 text-xs font-semibold text-red-400">
                    Errores ({importResult.errors.length})
                  </h5>
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-slate-400">
                    {importResult.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-slate-500">
                        … y {importResult.errors.length - 10} más
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </motion.section>
          )}
        </div>

        {/* Pie */}
        <div className="shrink-0 border-t border-slate-700 p-4 sm:p-5">
          <button
            onClick={onClose}
            className="touch-manipulation flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-600 active:scale-[0.98]"
          >
            <Download size={16} className="rotate-180" aria-hidden="true" />
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default ImportExportModal;
