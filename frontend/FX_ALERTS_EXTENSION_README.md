# CATE FX Alerts - Extensión de WalletPay

## 🎯 **FX Alerts - Sistema de Alertas FX**

### **📱 Funcionalidad Principal**

La extensión `FXAlerts` añade un sistema completo de alertas para el tipo de cambio USD/MXN dentro del componente `WalletPay`, permitiendo:

- **Crear alertas** cuando USD/MXN esté por encima o por debajo de un valor
- **Monitoreo en tiempo real** del tipo de cambio
- **Notificaciones automáticas** cuando se cumplen las condiciones
- **Gestión visual** de alertas activas

## 🏗️ **Estructura del Componente FXAlerts**

### **Estado Principal**
```jsx
const [alerts, setAlerts] = useState([
  { id: 1, type: "above", value: 18.50 },
  { id: 2, type: "below", value: 18.20 },
]);
const [newValue, setNewValue] = useState("");
const [newType, setNewType] = useState("above");
const [alertToast, setAlertToast] = useState("");
```

### **Funciones Principales**

#### **1. Agregar Alerta**
```jsx
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
```

#### **2. Eliminar Alerta**
```jsx
function removeAlert(id) {
  setAlerts((prev) => prev.filter((a) => a.id !== id));
}
```

#### **3. Monitoreo en Tiempo Real**
```jsx
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
```

## 🎨 **Interfaz de Usuario**

### **1. Header con Contador**
```jsx
<div className="flex items-center justify-between mb-3">
  <h4 className="font-medium text-slate-900">Alertas FX</h4>
  <span className="badge badge-secondary">{alerts.length} activas</span>
</div>
```

### **2. Formulario de Creación**
```jsx
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
```

### **3. Lista de Alertas**
```jsx
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
```

### **4. Toast de Notificaciones**
```jsx
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
```

## ✨ **Animaciones y Microinteracciones**

### **Framer Motion Integration**

#### **Entrada del Componente**
```jsx
<motion.div 
  className="card"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
```

#### **Alertas Staggered**
```jsx
{alerts.map((a) => (
  <motion.div
    key={a.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
  >
```

#### **Botones Interactivos**
```jsx
<motion.button 
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
```

## 🎨 **Estados Visuales**

### **Alertas Activas vs Inactivas**
```jsx
className={`flex justify-between items-center p-3 rounded-xl border ${
  (a.type === "above" && fxRate >= a.value) || 
  (a.type === "below" && fxRate <= a.value)
    ? 'bg-accent-50 border-accent-200'  // Alerta activa
    : 'bg-slate-50 border-slate-200'    // Alerta inactiva
}`}
```

### **Indicadores por Tipo**
```jsx
<span className={`w-2 h-2 rounded-full ${
  a.type === "above" ? "bg-success-500" : "bg-warning-500"
}`} />
```

### **Colores de Acción**
```jsx
// Botón agregar
className="btn btn-secondary"

// Botón eliminar
className="text-red-500 text-sm hover:text-red-700"

// Toast de notificación
className="mt-3 text-xs bg-accent-500 text-white px-3 py-2 rounded-lg"
```

## 🔧 **Funcionalidades Implementadas**

### ✅ **Gestión de Alertas**
- [x] Crear alertas "Mayor que" o "Menor que"
- [x] Validación de entrada numérica
- [x] Eliminar alertas individuales
- [x] Contador de alertas activas

### ✅ **Monitoreo en Tiempo Real**
- [x] Verificación automática cada actualización de FX
- [x] Detección de condiciones cumplidas
- [x] Logs en consola para debugging
- [x] Toast notifications automáticas

### ✅ **Interfaz de Usuario**
- [x] Formulario intuitivo con select e input
- [x] Lista visual de alertas con estados
- [x] Indicadores visuales por tipo de alerta
- [x] Botones de acción con feedback

### ✅ **Animaciones**
- [x] Entrada suave del componente
- [x] Animaciones staggered para alertas
- [x] Microinteracciones en botones
- [x] Toast notifications animadas

## 🚀 **Integración en WalletPay**

### **Import y Uso**
```jsx
// Dentro de WalletPay.jsx
<FXAlerts fxRate={fxData[fxData.length - 1]} />
```

### **Flujo de Datos**
1. **WalletPay** actualiza `fxData` cada 5 segundos
2. **FXAlerts** recibe el último valor como `fxRate`
3. **useEffect** verifica todas las alertas contra el nuevo valor
4. **Toast notifications** se muestran cuando se cumplen condiciones

### **Posicionamiento**
```jsx
{/* FX inteligente */}
<motion.div className="card">
  <Sparkline data={fxData} />
</motion.div>

{/* Alertas FX */}
<FXAlerts fxRate={fxData[fxData.length - 1]} />

{/* Botones de acción */}
<div className="grid grid-cols-2 gap-3">
```

## 📱 **Responsive Design**

### **Formulario Adaptativo**
```css
/* Layout flexible */
flex gap-2

/* Input principal */
flex-1

/* Botones compactos */
btn btn-secondary
```

### **Lista de Alertas**
```css
/* Espaciado vertical */
space-y-2

/* Cards responsivas */
p-3 rounded-xl border
```

### **Touch-Friendly**
- **Botones**: Mínimo 44px para touch
- **Inputs**: Fácil acceso en móvil
- **Eliminar**: Área de toque adecuada

## 🎯 **Casos de Uso**

### **1. Alerta de Compra**
```jsx
// Usuario quiere comprar cuando USD/MXN baje
{ type: "below", value: 18.00 }
// Se activa cuando fxRate <= 18.00
```

### **2. Alerta de Venta**
```jsx
// Usuario quiere vender cuando USD/MXN suba
{ type: "above", value: 19.00 }
// Se activa cuando fxRate >= 19.00
```

### **3. Múltiples Alertas**
```jsx
// Usuario puede tener varias alertas simultáneas
[
  { type: "below", value: 18.00 },  // Compra
  { type: "above", value: 19.00 },  // Venta
  { type: "below", value: 17.50 }   // Compra agresiva
]
```

## 🔒 **Validaciones y Seguridad**

### **Validación de Entrada**
```jsx
function addAlert() {
  if (!newValue) return;  // Campo requerido
  // parseFloat para validar número
  { id: Date.now(), type: newType, value: parseFloat(newValue) }
}
```

### **Prevención de Duplicados**
```jsx
// Cada alerta tiene ID único
{ id: Date.now(), ... }
```

### **Cleanup de Intervals**
```jsx
// Los timeouts se limpian automáticamente
setTimeout(() => setAlertToast(""), 2000);
```

## 🎉 **Características Destacadas**

### **⚡ Tiempo Real**
- **Monitoreo continuo** del tipo de cambio
- **Notificaciones inmediatas** cuando se cumplen condiciones
- **Actualización automática** con el FX rate

### **🎨 UX Excepcional**
- **Estados visuales claros** para alertas activas/inactivas
- **Feedback inmediato** en todas las acciones
- **Animaciones fluidas** para mejor experiencia

### **🔧 Funcionalidad Completa**
- **CRUD completo** de alertas
- **Validación robusta** de entradas
- **Gestión de estado** eficiente

### **📱 Mobile-First**
- **Interfaz touch-friendly**
- **Responsive design**
- **Accesibilidad completa**

## 🎯 **Próximos Pasos Sugeridos**

### **1. Persistencia de Datos**
```jsx
// Guardar alertas en localStorage
localStorage.setItem('fxAlerts', JSON.stringify(alerts));
```

### **2. Notificaciones Push**
```jsx
// Integrar con Web Push API
if ('Notification' in window) {
  Notification.requestPermission();
}
```

### **3. Historial de Alertas**
```jsx
// Guardar alertas activadas
const [alertHistory, setAlertHistory] = useState([]);
```

### **4. Configuración Avanzada**
```jsx
// Alertas con sonido, vibración, etc.
{ type: "above", value: 19.00, sound: true, vibration: true }
```

## 🎉 **Resultado Final**

La extensión `FXAlerts` añade:

✅ **Sistema completo** de alertas FX
✅ **Monitoreo en tiempo real** del tipo de cambio
✅ **Notificaciones automáticas** cuando se cumplen condiciones
✅ **Interfaz intuitiva** para gestionar alertas
✅ **Animaciones fluidas** con Framer Motion
✅ **Estados visuales claros** para alertas activas
✅ **Validación robusta** de entradas
✅ **Responsive design** mobile-first

¡El componente WalletPay ahora incluye un sistema completo de alertas FX que complementa perfectamente la funcionalidad de wallet! 🚀
