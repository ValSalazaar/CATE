import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Impacto social en tiempo real (mock).
 */
export default function ImpactWidget() {
  const [becas, setBecas] = useState(127);
  const [personas, setPersonas] = useState(409);

  useEffect(() => {
    const id = setInterval(() => {
      setBecas((b) => b + (Math.random() < 0.2 ? 1 : 0));
      setPersonas((p) => p + (Math.random() < 0.3 ? 1 : 0));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-sm text-slate-500 mb-3">Impacto Fundación CATE</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <KPI label="Becas" value={becas} icon="🎓" />
        <KPI label="Beneficiarios" value={personas} icon="👥" />
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">
        Cada transacción suma oportunidades de capacitación y certificación.
      </p>
      
      {/* Indicador de actividad */}
      <div className="mt-3 flex items-center gap-2">
        <motion.div 
          className="w-2 h-2 rounded-full bg-accent-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-xs text-slate-500">Actividad en tiempo real</span>
      </div>
    </motion.div>
  );
}

function KPI({ label, value, icon }) {
  return (
    <motion.div 
      className="bg-slate-50 rounded-xl p-3 text-center"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-lg mb-1">{icon}</div>
      <motion.div 
        className="text-2xl font-semibold text-primary"
        key={value}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.div>
      <div className="text-slate-500 text-xs">{label}</div>
    </motion.div>
  );
}
