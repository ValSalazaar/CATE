import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sparkline from "./components/Sparkline.jsx";
import FXAlerts from "./components/FXAlerts.jsx";
import GroupBills from "./components/GroupBills.jsx";
import WalletPay from "./components/WalletPay.jsx";

export default function App() {
  const [active, setActive] = useState("home");

  const tabs = [
    { key: "home", label: "Inicio", icon: "🏠" },
    { key: "pay", label: "Pay", icon: "💳" },
    { key: "skills", label: "Skills", icon: "🛠️" },
    { key: "fund", label: "Fundación", icon: "🎗️" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-light">
      {/* Header */}
      <header className="bg-white border-b border-neutral-light">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white grid place-items-center font-bold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              C
            </motion.div>
            <div>
              <p className="text-sm text-neutral-dark">Bienvenida, Valeria</p>
              <h1 className="text-lg font-semibold">
                Tu talento y tu dinero, en un solo lugar
              </h1>
            </div>
          </div>
          <motion.span 
            className="badge badge-accent"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Mobile‑first
          </motion.span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {active === "home" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                      <h3 className="font-semibold mb-2">USD/MXN</h3>
                      <Sparkline data={[18.2, 18.3, 18.25, 18.4, 18.35, 18.5, 18.45]} />
                    </div>
                    <FXAlerts />
                    <GroupBills />
                  </div>
                </>
              )}

              {active === "pay" && <WalletPay />}

              {active === "skills" && (
                <div className="card">
                  <h3 className="font-semibold mb-2">CATE Skills</h3>
                  <p className="text-neutral-dark">Evaluaciones y rutas de capacitación.</p>
                </div>
              )}

              {active === "fund" && (
                <div className="card">
                  <h3 className="font-semibold mb-2">Fundación CATE</h3>
                  <p className="text-neutral-dark">Impacto social y becas otorgadas.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Tab bar */}
      <nav className="sticky bottom-0 bg-white border-t border-neutral-light">
        <div className="max-w-5xl mx-auto px-2 py-2 grid grid-cols-4 gap-2">
          {tabs.map((t) => (
            <motion.button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-200 ${
                active === t.key
                  ? "text-primary bg-neutral-light"
                  : "text-neutral-dark"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-xs">{t.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>
    </div>
  );
}
