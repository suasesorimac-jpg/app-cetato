import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type PushFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<PushFn>(() => undefined);

export function useToast(): PushFn {
  return useContext(ToastContext);
}

const KIND_META: Record<ToastKind, { border: string; text: string; Icon: typeof Info }> = {
  success: { border: "border-l-emerald-400", text: "text-emerald-400", Icon: CheckCircle2 },
  error: { border: "border-l-red-400", text: "text-red-400", Icon: AlertTriangle },
  info: { border: "border-l-amber-400", text: "text-amber-400", Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback<PushFn>((message, kind = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[120] flex w-[min(92vw,370px)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const meta = KIND_META[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 48, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`flex items-start gap-3 rounded-xl border border-slate-700 ${meta.border} border-l-4 bg-slate-800 px-4 py-3 shadow-2xl shadow-black/50`}
                role="status"
              >
                <meta.Icon size={18} className={`mt-0.5 shrink-0 ${meta.text}`} />
                <p className="flex-1 text-sm leading-snug text-slate-100">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
                  aria-label="Cerrar notificación"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
