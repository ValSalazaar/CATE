import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Ahorro con interés diario (mock). AER configurable.
 */
export default function SavingsWidget() {
  const AER = 3.51; // %
  const [principal] = useState(5000); // MXN mock
  const [acc, setAcc] = useState(0);

  useEffect(() => {
    const perSecond = (AER / 100) / 365 / 24 / 3600; // interés compuesto aprox
    const id = setInterval(() => {
      setAcc((x) => x + principal * perSecond);
    }, 1000);
    return () => clearInterval(id);
  }, [AER, principal]);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-slate-500">Ahorro diario</div>
          <div className="text-lg font-semibold text-slate-900">CATE Savings</div>
        </div>
        <motion.span 
          className="badge badge-accent"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          AER {AER}%
        </motion.span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-sm text-slate-500 mb-1">Saldo ahorrado</div>
          <div className="text-xl font-semibold text-slate-900">
            ${principal.toLocaleString()} <span className="text-slate-500 text-base">MXN</span>
          </div>
        </div>
        
        <div>
          <div className="text-sm text-slate-500 mb-1">Interés acumulado hoy</div>
          <motion.div 
            className="text-xl font-semibold text-success-600"
            key={acc.toFixed(2)}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.3 }}
          >
            +${acc.toFixed(2)} <span className="text-slate-500 text-base">MXN</span>
          </motion.div>
        </div>
      </div>
      
      {/* Barra de progreso del día */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progreso del día</span>
          <span>{Math.floor((Date.now() / (24 * 60 * 60 * 1000)) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-success"
            initial={{ width: 0 }}
            animate={{ width: `${Math.floor((Date.now() / (24 * 60 * 60 * 1000)) * 100)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
