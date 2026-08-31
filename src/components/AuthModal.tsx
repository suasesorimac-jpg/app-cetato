import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Disc3, Eye, EyeOff, Lock, LogIn, X } from "lucide-react";
import { login } from "../lib/storage";
import ModalShell from "./ModalShell";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Login del modo Administrador.
 * Visitante es el modo por defecto: con la contraseña correcta la app
 * desbloquea agregar / editar / eliminar vinilos.
 */
export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  /* Se incrementa en cada fallo para relanzar la animación de sacudida */
  const [shakeKey, setShakeKey] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    /* Breve pausa para comunicar la verificación */
    window.setTimeout(() => {
      const success = login(password);

      if (success) {
        onSuccess();
        setPassword("");
        onClose();
      } else {
        setError("Contraseña incorrecta. Intenta de nuevo.");
        setPassword("");
        setShakeKey((k) => k + 1);
      }

      setIsLoading(false);
    }, 300);
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <ModalShell onClose={handleClose} maxW="max-w-md">
      {/* Cabecera con el disco-candado de la casa */}
      <div className="flex items-center justify-between border-b border-slate-700 p-6 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/30">
            <Disc3 size={26} className="animate-spin-slow text-slate-950" />
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-slate-900 bg-slate-700">
              <Lock size={10} className="text-amber-400" />
            </span>
          </div>
          <div>
            <h2 className="font-display text-2xl leading-none tracking-wide text-slate-50">
              MODO <span className="text-amber-500">ADMINISTRADOR</span>
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">Ingresa la contraseña para editar</p>
          </div>
        </div>
      </div>

      {/* Formulario (con sacudida en contraseña incorrecta) */}
      <motion.form
        key={shakeKey}
        onSubmit={handleSubmit}
        initial={false}
        animate={shakeKey > 0 ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="space-y-4 p-6"
      >
        <div>
          <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-slate-300">
            Contraseña
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="h-12 w-full rounded-lg border border-slate-700 bg-slate-900 pl-10 pr-12 text-white outline-none transition-all placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25"
              placeholder="Ingresa la contraseña"
              autoComplete="current-password"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="touch-manipulation absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/50 p-3"
          >
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="touch-manipulation flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || !password}
            className="touch-manipulation flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 font-bold text-slate-900 shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={16} />
            {isLoading ? "Verificando…" : "Ingresar"}
          </button>
        </div>

        <p className="pt-2 text-center text-xs text-slate-500">
          Como visitante puedes explorar la colección, pero no modificarla.
        </p>
      </motion.form>
    </ModalShell>
  );
}

export default AuthModal;
