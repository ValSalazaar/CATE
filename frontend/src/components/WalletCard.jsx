import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function WalletCard() {
  const [mxn, setMxn] = useState(2450.0);
  const [usdc, setUsdc] = useState(120.5);
  const [showSend, setShowSend] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let t;
    if (toast) {
      t = setTimeout(() => setToast(""), 2200);
    }
    return () => clearTimeout(t);
  }, [toast]);

  function simulateReceive() {
    setUsdc((v) => +(v + 12.5).toFixed(2));
    setToast("Pago recibido: 12.5 USDC");
  }

  function simulateSend() {
    setShowSend(false);
    setUsdc((v) => +(v - 10).toFixed(2));
    setToast("Pago enviado: 10 USDC");
  }

  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-900">CATE Pay Wallet</h3>
        <motion.span 
          className="badge badge-success"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Perfil verificado ✅
        </motion.span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Balance label="Saldo USDC" value={usdc} currency="USDC" />
        <Balance label="Saldo MXN estimado" value={mxn} currency="MXN" />
        <motion.div 
          className="card gradient-primary text-white"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-sm opacity-80">Microcopy</div>
          <div className="text-lg font-semibold mt-1">
            Tu dinero, seguro y siempre contigo.
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary w-full"
          onClick={() => setShowSend(true)}
        >
          Enviar
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="btn btn-success w-full"
          onClick={simulateReceive}
        >
          Recibir
        </motion.button>
      </div>

      {/* Historial mock */}
      <div className="mt-6">
        <h4 className="font-medium mb-3 text-slate-900">Movimientos recientes</h4>
        <ul className="space-y-3">
          {[
            { t: "Pago recibido", a: "+25.00 USDC", time: "hace 2 h", type: "receive" },
            { t: "Cambio FX", a: "-5.00 USDC", time: "ayer", type: "exchange" },
            { t: "Retiro cash‑out", a: "-300 MXN", time: "ayer", type: "withdraw" },
          ].map((m, i) => (
            <motion.li 
              key={i} 
              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex-1">
                <div className="text-slate-700 font-medium">{m.t}</div>
                <div className="text-slate-500 text-sm">{m.time}</div>
              </div>
              <div className={`font-semibold ${
                m.type === 'receive' ? "text-success-600" : "text-slate-900"
              }`}>
                {m.a}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Modal enviar */}
      <AnimatePresence>
        {showSend && (
          <motion.div
            className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="card max-w-sm w-full"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <h4 className="text-lg font-semibold mb-4">Enviar USDC</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Destinatario</label>
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                    placeholder="@catetag/usuario" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Monto</label>
                  <input 
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent" 
                    placeholder="10.00" 
                    defaultValue="10.00" 
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  className="btn btn-ghost flex-1" 
                  onClick={() => setShowSend(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary flex-1" 
                  onClick={simulateSend}
                >
                  Enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="absolute top-4 right-4 bg-white shadow-card rounded-xl px-4 py-3 border border-slate-200"
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
          >
            <div className="text-sm font-medium text-slate-900">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Balance({ label, value, currency }) {
  return (
    <motion.div 
      className="card"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-slate-500 text-sm mb-1">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">
        {value.toLocaleString()} <span className="text-slate-500 text-base">{currency}</span>
      </div>
    </motion.div>
  );
}
