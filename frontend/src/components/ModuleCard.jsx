import { motion } from "framer-motion";

const colorVariants = {
  primary: {
    bg: "bg-primary-50",
    text: "text-primary-700",
    border: "border-primary-200",
    hover: "hover:bg-primary-100"
  },
  secondary: {
    bg: "bg-secondary-50",
    text: "text-secondary-700",
    border: "border-secondary-200",
    hover: "hover:bg-secondary-100"
  },
  accent: {
    bg: "bg-accent-50",
    text: "text-accent-700",
    border: "border-accent-200",
    hover: "hover:bg-accent-100"
  },
  success: {
    bg: "bg-success-50",
    text: "text-success-700",
    border: "border-success-200",
    hover: "hover:bg-success-100"
  },
  warning: {
    bg: "bg-warning-50",
    text: "text-warning-700",
    border: "border-warning-200",
    hover: "hover:bg-warning-100"
  }
};

export default function ModuleCard({ title, emoji, copy, cta, color = "primary" }) {
  const colors = colorVariants[color] || colorVariants.primary;

  return (
    <motion.div
      className={`card border ${colors.bg} ${colors.border} ${colors.hover}`}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start gap-3 mb-4">
        <motion.div 
          className="text-2xl"
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          {emoji}
        </motion.div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-slate-600 mt-1 text-sm leading-relaxed">{copy}</p>
        </div>
      </div>
      
      <motion.button 
        className={`btn w-full ${colors.text} bg-white border ${colors.border} hover:bg-slate-50`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {cta}
      </motion.button>
    </motion.div>
  );
}
