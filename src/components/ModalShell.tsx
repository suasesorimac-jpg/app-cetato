import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  children: ReactNode;
  maxW?: string;
}

export default function ModalShell({ onClose, children, maxW = "max-w-4xl" }: Props) {
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
        className="relative flex min-h-full items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 48, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className={`relative w-full ${maxW} rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60`}
        >
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3.5 top-3.5 z-20 rounded-lg border border-slate-700 bg-slate-800/90 p-1.5 text-slate-400 transition-colors hover:border-amber-500/60 hover:text-amber-400"
          >
            <X size={16} />
          </button>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
