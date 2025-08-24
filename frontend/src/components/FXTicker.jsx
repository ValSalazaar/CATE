import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Indicador FX mock: USD/MXN con actualización suave.
 */
export default function FXTicker() {
  const val = useMotionValue(18.25);
  const displayed = useTransform(val, (v) => v.toFixed(2));
  const targetRef = useRef(18.25);

  useEffect(() => {
    const id = setInterval(() => {
      const drift = (Math.random() - 0.5) * 0.08; // variación pequeña
      targetRef.current = Math.max(16.5, Math.min(19.9, targetRef.current + drift));
      animate(val, targetRef.current, { duration: 0.8 });
    }, 5000);
    return () => clearInterval(id);
  }, [val]);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-slate-500">Tipo de cambio</div>
          <div className="text-lg font-semibold text-slate-900">USD → MXN</div>
        </div>
        <motion.span 
          className="badge badge-accent"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Alertas activas 🔔
        </motion.span>
      </div>
      
      <div className="mb-3">
        <div className="text-3xl font-semibold tracking-tight text-slate-900">
          <motion.span>{displayed}</motion.span>
          <span className="text-base text-slate-500 ml-1">MXN</span>
        </div>
      </div>
      
      <p className="text-slate-600 text-sm leading-relaxed">
        CATE FX Smart: programa órdenes "Limit" y "Stop" para cambiar cuando te convenga.
      </p>
      
      {/* Indicador de tendencia */}
      <div className="mt-3 flex items-center gap-2">
        <motion.div 
          className="w-2 h-2 rounded-full bg-success-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-xs text-slate-500">Tendencia estable</span>
      </div>
    </motion.div>
  );
}
