import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function GroupBills() {
  const [items, setItems] = useState([
    { name: "Valeria", amount: 0, id: 1 },
    { name: "Carlos", amount: 0, id: 2 },
    { name: "Ana", amount: 0, id: 3 },
  ]);
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [expenses, setExpenses] = useState([
    { desc: "Cena", amount: 450, date: "2024-01-15" },
    { desc: "Gasolina", amount: 200, date: "2024-01-14" }
  ]);

  function addExpense() {
    if (!desc || !amt) return;
    const amount = parseFloat(amt);
    const perPerson = amount / items.length;
    
    setItems(items.map((i) => ({ ...i, amount: i.amount + perPerson })));
    setExpenses([...expenses, { desc, amount, date: new Date().toISOString().split('T')[0] }]);
    setDesc("");
    setAmt("");
  }

  function resetBills() {
    setItems(items.map((i) => ({ ...i, amount: 0 })));
    setExpenses([]);
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Group Bills</h3>
        <span className="badge badge-secondary">${totalAmount.toFixed(2)}</span>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded-xl border border-neutral-light px-3 py-2 focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
          placeholder="Descripción"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addExpense()}
        />
        <input
          className="w-24 rounded-xl border border-neutral-light px-3 py-2 focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
          placeholder="$"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addExpense()}
        />
        <motion.button 
          className="btn btn-secondary"
          onClick={addExpense}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          +
        </motion.button>
      </div>
      
      {/* Gastos recientes */}
      {expenses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Gastos recientes</h4>
          <div className="space-y-1">
            <AnimatePresence>
              {expenses.slice(-3).map((expense, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex justify-between text-sm text-slate-600"
                >
                  <span>{expense.desc}</span>
                  <span className="font-medium">${expense.amount}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Balance por persona */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Balance por persona</h4>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className="flex justify-between items-center p-2 rounded-lg bg-slate-50"
            whileHover={{ scale: 1.02 }}
          >
            <span className="text-sm font-medium text-slate-900">{item.name}</span>
            <span className={`text-sm font-semibold ${
              item.amount > 0 ? 'text-secondary-600' : 'text-slate-500'
            }`}>
              ${item.amount.toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>
      
      {/* Botón de reset */}
      {totalAmount > 0 && (
        <motion.button
          className="btn btn-ghost w-full mt-4 text-sm"
          onClick={resetBills}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Limpiar cuentas
        </motion.button>
      )}
    </motion.div>
  );
}
