import { motion } from "framer-motion";
import ModuleCard from "./ModuleCard.jsx";
import WalletCard from "./WalletCard.jsx";
import FXTicker from "./FXTicker.jsx";
import SavingsWidget from "./SavingsWidget.jsx";
import ImpactWidget from "./ImpactWidget.jsx";
import Sparkline from "./Sparkline.jsx";
import FXAlerts from "./FXAlerts.jsx";
import GroupBills from "./GroupBills.jsx";

export default function Dashboard({ active }) {
  const showHome = active === "home";
  const showPay = active === "pay";
  const showSkills = active === "skills";
  const showFund = active === "fund";

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Strip superior con FX y Ahorro */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        <FXTicker />
        <SavingsWidget />
        <ImpactWidget />
      </motion.div>

      {/* Mini-gráfico FX */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="card">
          <h3 className="font-semibold mb-2 text-slate-900">USD/MXN - 7 días</h3>
          <Sparkline data={[18.2, 18.3, 18.25, 18.4, 18.35, 18.5, 18.45]} />
        </div>
        <FXAlerts />
      </motion.div>

      {/* Home: cuatro módulos */}
      {showHome && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
        >
          <ModuleCard
            title="CATE Talent"
            emoji="🎓"
            copy="Tu talento, validado y listo para el mundo."
            cta="Validar credenciales"
            color="primary"
          />
          <ModuleCard
            title="CATE Skills"
            emoji="🧩"
            copy="Demuestra lo que sabes, crece lo que vales."
            cta="Hacer evaluación"
            color="secondary"
          />
          <ModuleCard
            title="CATE Pay"
            emoji="💫"
            copy="Tu dinero, seguro y siempre contigo."
            cta="Abrir wallet"
            color="accent"
          />
          <ModuleCard
            title="Fundación CATE"
            emoji="🤝"
            copy="Cada transacción, una oportunidad para alguien más."
            cta="Ver impacto"
            color="warning"
          />
        </motion.div>
      )}

      {/* Pay: wallet destacada */}
      {showPay && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <WalletCard />
          <GroupBills />
        </motion.div>
      )}

      {/* Skills: placeholder visual */}
      {showSkills && (
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-2">Ruta de Skills</h3>
          <p className="text-slate-600 mb-4">
            Completa evaluaciones teóricas y prácticas para subir de nivel.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: "Seguridad Industrial", level: 1, progress: 40 },
              { name: "Soldadura", level: 2, progress: 65 },
              { name: "Montacargas", level: 3, progress: 85 }
            ].map((skill, i) => (
              <motion.div 
                key={skill.name} 
                className="card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{skill.name}</span>
                  <span className="badge badge-accent">Nivel {skill.level}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full gradient-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.progress}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                <button className="btn btn-primary w-full text-sm">
                  Continuar
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Fundación: placeholder visual */}
      {showFund && (
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-2">Impacto en acción</h3>
          <p className="text-slate-600 mb-4">
            Tus credenciales y pagos financian becas y certificaciones.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="Becas otorgadas" value="128" icon="🎓" />
            <Stat label="Personas beneficiadas" value="412" icon="👥" />
            <Stat label="Países activos" value="4" icon="🌍" />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }) {
  return (
    <motion.div 
      className="card text-center"
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-semibold text-primary">{value}</div>
      <div className="text-slate-500 text-sm">{label}</div>
    </motion.div>
  );
}
