import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Sparkline from "./Sparkline.jsx";

export default function WalletPay() {
  const [mxn, setMxn] = useState(2450.0);
  const [usdc, setUsdc] = useState(120.5);
  const [interest, setInterest] = useState(0);
  const [toast, setToast] = useState("");

  // Simular interés diario en tiempo real
  useEffect(() => {
    const perSecond = (3.51 / 100) / 365 / 24 / 3600; // AER 3.51%
    const id = setInterval(() => {
      setInterest((i) => i + mxn * perSecond);
    }, 1000);
    return () => clearInterval(id);
  }, [mxn]);

  // Simular FX inteligente (mock)
  const [fxData, setFxData] = useState([18.2, 18.3, 18.25, 18.4, 18.35, 18.5, 18.45]);
  useEffect(() => {
    const id = setInterval(() => {
      setFxData((prev) => {
        const drift = (Math.random() - 0.5) * 0.05;
        return [...prev.slice(1), +(prev[prev.length - 1] + drift).toFixed(2)];
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  function simulateReceive() {
    setUsdc((v) => +(v + 12.5).toFixed(2));
    setToast("Pago recibido: 12.5 USDC");
    setTimeout(() => setToast(""), 2000);
  }

  function simulateSend() {
    setUsdc((v) => +(v - 10).toFixed(2));
    setToast("Pago enviado: 10 USDC");
    setTimeout(() => setToast(""), 2000);
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">CATE Pay Wallet</h2>
        <motion.span 
          className="badge badge-success"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Perfil verificado ✅
        </motion.span>
      </div>

      {/* Saldos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Balance label="Saldo USDC" value={usdc} currency="USDC" />
        <Balance label="Saldo MXN estimado" value={mxn} currency="MXN" />
        <motion.div 
          className="card bg-gradient-to-br from-primary to-secondary text-white"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-sm opacity-80">Ahorro diario</div>
          <motion.div 
            className="text-lg font-semibold mt-1"
            key={interest.toFixed(2)}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.3 }}
          >
            +${interest.toFixed(2)} MXN hoy
          </motion.div>
        </motion.div>
      </div>

      {/* FX inteligente */}
      <motion.div 
        className="card"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">CATE FX Smart</h3>
          <span className="badge badge-accent">AER 3.51%</span>
        </div>
        <Sparkline data={fxData} />
        <p className="text-sm text-neutral-dark mt-3">
          Órdenes automáticas y alertas para cambiar cuando te convenga.
        </p>
      </motion.div>

      {/* Alertas FX */}
      <FXAlerts fxRate={fxData[fxData.length - 1]} />

      {/* Botones de acción */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary w-full"
          onClick={simulateSend}
        >
          Enviar
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-accent w-full"
          onClick={simulateReceive}
        >
          Recibir
        </motion.button>
      </div>

      {/* Historial mock */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
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
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex-1">
                <div className="text-slate-700 font-medium">{m.t}</div>
                <div className="text-slate-500 text-sm">{m.time}</div>
              </div>
              <div className={`font-semibold ${
                m.type === 'receive' ? "text-success-600" : 
                m.type === 'exchange' ? "text-accent-600" : "text-slate-900"
              }`}>
                {m.a}
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-20 right-4 bg-white shadow-card rounded-xl px-4 py-3 border border-slate-200 z-50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="text-sm font-medium text-slate-900">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Balance({ label, value, currency }) {
  return (
    <motion.div 
      className="card"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-neutral-dark text-sm mb-1">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">
        {value.toLocaleString()} <span className="text-neutral-dark text-base">{currency}</span>
      </div>
    </motion.div>
  );
}

function FXAlerts({ fxRate }) {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "above", value: 18.50 },
    { id: 2, type: "below", value: 18.20 },
  ]);
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState("above");
  const [alertToast, setAlertToast] = useState("");

  function addAlert() {
    if (!newValue) return;
    setAlerts((prev) => [
      ...prev,
      { id: Date.now(), type: newType, value: parseFloat(newValue) },
    ]);
    setNewValue("");
    setAlertToast(`Alerta creada: ${newType === "above" ? "Mayor que" : "Menor que"} ${newValue}`);
    setTimeout(() => setAlertToast(""), 2000);
  }

  function removeAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  // Simular notificación cuando se cumple una alerta
  useEffect(() => {
    alerts.forEach((a) => {
      if (a.type === "above" && fxRate >= a.value) {
        console.log(`⚡ Alerta: USD/MXN superó ${a.value}`);
        setAlertToast(`⚡ USD/MXN superó ${a.value}!`);
        setTimeout(() => setAlertToast(""), 3000);
      }
      if (a.type === "below" && fxRate <= a.value) {
        console.log(`⚡ Alerta: USD/MXN cayó por debajo de ${a.value}`);
        setAlertToast(`⚡ USD/MXN cayó por debajo de ${a.value}!`);
        setTimeout(() => setAlertToast(""), 3000);
      }
    });
  }, [fxRate, alerts]);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900">Alertas FX</h4>
        <span className="badge badge-secondary">{alerts.length} activas</span>
      </div>
      
      <div className="flex gap-2 mb-4">
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="rounded-xl border border-neutral-light px-3 py-2 focus:ring-2 focus:ring-secondary-500 focus:border-transparent bg-white"
        >
          <option value="above">Mayor que</option>
          <option value="below">Menor que</option>
        </select>
        <input
          type="number"
          step="0.01"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="18.40"
          className="flex-1 rounded-xl border border-neutral-light px-3 py-2 focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
          onKeyPress={(e) => e.key === 'Enter' && addAlert()}
        />
        <motion.button 
          onClick={addAlert} 
          className="btn btn-secondary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          +
        </motion.button>
      </div>
      
      <div className="space-y-2">
        <AnimatePresence>
          {alerts.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex justify-between items-center p-3 rounded-xl border ${
                (a.type === "above" && fxRate >= a.value) || 
                (a.type === "below" && fxRate <= a.value)
                  ? 'bg-accent-50 border-accent-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  a.type === "above" ? "bg-success-500" : "bg-warning-500"
                }`} />
                <span className="text-sm font-medium text-slate-700">
                  {a.type === "above" ? "Mayor que" : "Menor que"} {a.value}
                </span>
              </div>
              <motion.button
                onClick={() => removeAlert(a.id)}
                className="text-red-500 text-sm hover:text-red-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                Eliminar
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Alert Toast */}
      <AnimatePresence>
        {alertToast && (
          <motion.div
            className="mt-3 text-xs bg-accent-500 text-white px-3 py-2 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {alertToast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
