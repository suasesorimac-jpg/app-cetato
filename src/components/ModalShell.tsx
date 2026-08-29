import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
  /** En móvil el modal ocupa toda la pantalla (patrón sheet); en sm+ vuelve a ser flotante. */
  fullOnMobile?: boolean;
}

export default function ModalShell({
  onClose,
  children,
  maxW = "max-w-4xl",
  fullOnMobile = false,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <motion.div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-[4px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <div
        className={`relative flex min-h-full justify-center ${
          fullOnMobile ? "items-stretch p-0 sm:items-center sm:p-6" : "items-center p-3 sm:p-6"
        }`}
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 48, scale: fullOnMobile ? 1 : 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: fullOnMobile ? 1 : 0.97 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className={
            fullOnMobile
              ? `relative flex h-[100vh] w-full flex-col overflow-hidden bg-slate-900 [@supports(height:100dvh)]:h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:w-full ${maxW} sm:rounded-2xl sm:border sm:border-slate-700 sm:shadow-2xl sm:shadow-black/60`
              : `relative w-full ${maxW} rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60`
          }
        >
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="touch-manipulation absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-slate-800/95 text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-400 sm:h-9 sm:w-9"
          >
            <X size={18} className="sm:h-4 sm:w-4" />
          </button>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
