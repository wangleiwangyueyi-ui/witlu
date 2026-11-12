import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedEffects } from './Glass';
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number }>();
  const show = useCallback((message: string) => setToast({ message, id: Date.now() }), []);
  const reduced = useReducedEffects();
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(undefined), 3600); return () => clearTimeout(id); }, [toast]);
  return <ToastContext.Provider value={show}>{children}<div className="toast-region" aria-live="polite" data-capture-ignore="true"><AnimatePresence>{toast && <motion.div className="glass toast" role="status" key={toast.id} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast.message}</motion.div>}</AnimatePresence></div></ToastContext.Provider>;
}
