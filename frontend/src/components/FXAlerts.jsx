import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FXAlerts() {
  const [alerts, setAlerts] = useState([
    { rate: "18.50", id: 1, active: true },
    { rate: "17.80", id: 2, active: true }
  ]);
  const [rate, setRate] = useState("");
  const [toast, setToast] = useState("");

  function addAlert() {
    if (!rate) return;
    const newAlert = { rate, id: Date.now(), active: true };
    setAlerts([...alerts, newAlert]);
    setRate("");
    setToast(`Alerta creada para USD/MXN a ${rate}`);
    setTimeout(() => setToast(""), 2000);
  }

  function removeAlert(id) {
    setAlerts(alerts.filter(alert => alert.id !== id));
  }

  function toggleAlert(id) {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, active: !alert.active } : alert
    ));
  }

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Alertas FX</h3>
        <span className="badge badge-accent">{alerts.length} activas</span>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-xl border border-neutral-light px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-transparent"
          placeholder="Tasa objetivo (ej: 18.50)"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addAlert()}
        />
        <motion.button 
          className="btn btn-accent"
          onClick={addAlert}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          +
        </motion.button>
      </div>
      
      <div className="space-y-2">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                alert.active 
                  ? 'bg-accent-50 border-accent-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`w-4 h-4 rounded-full border-2 ${
                    alert.active 
                      ? 'bg-accent-500 border-accent-500' 
                      : 'border-slate-300'
                  }`}
                />
                <span className={`text-sm font-medium ${
                  alert.active ? 'text-slate-900' : 'text-slate-500'
                }`}>
                  USD/MXN → {alert.rate}
                </span>
              </div>
              <motion.button
                onClick={() => removeAlert(alert.id)}
                className="text-slate-400 hover:text-slate-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {toast && (
          <motion.div
            className="mt-3 text-xs bg-accent-500 text-white px-3 py-2 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
