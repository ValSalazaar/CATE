# CATE Frontend - Nuevos Componentes y Paleta de Colores

## 🎨 Nueva Paleta de Colores - Opción A

### **Colores Principales**
```css
/* Primary - Azul profundo */
primary: #0F172A

/* Secondary - Morado vibrante */
secondary: #6D28D9

/* Accent - Turquesa */
accent: #06B6D4

/* Neutral */
neutral-light: #F1F5F9
neutral-dark: #334155
```

### **Configuración en Tailwind**
```javascript
// tailwind.config.js
colors: {
  primary: {
    DEFAULT: '#0F172A',
    50: '#f8fafc',
    100: '#f1f5f9',
    // ... más variantes
  },
  secondary: {
    DEFAULT: '#6D28D9',
    50: '#faf5ff',
    100: '#f3e8ff',
    // ... más variantes
  },
  accent: {
    DEFAULT: '#06B6D4',
    50: '#ecfeff',
    100: '#cffafe',
    // ... más variantes
  },
  neutral: {
    light: '#F1F5F9',
    dark: '#334155',
  }
}
```

## 🆕 Nuevos Componentes

### **1. Sparkline - Mini-gráfico de Historial**

Componente para mostrar gráficos de línea minimalistas usando Chart.js.

#### **Características:**
- **Gráficos de línea** sin puntos ni ejes
- **Animaciones suaves** con Framer Motion
- **Responsive** y adaptable
- **Colores personalizables**

#### **Uso:**
```jsx
import Sparkline from "./Sparkline";

<Sparkline 
  data={[18.2, 18.3, 18.25, 18.4, 18.35, 18.5, 18.45]} 
  color="#06B6D4" 
/>
```

#### **Props:**
- `data`: Array de números para el gráfico
- `color`: Color de la línea (opcional, default: turquesa)

### **2. FXAlerts - Alertas FX Simuladas**

Componente para gestionar alertas de tipo de cambio.

#### **Características:**
- **Crear alertas** con tasas objetivo
- **Toggle activar/desactivar** alertas
- **Eliminar alertas** individuales
- **Toast notifications** para feedback
- **Animaciones** de entrada/salida

#### **Uso:**
```jsx
import FXAlerts from "./FXAlerts";

<FXAlerts />
```

#### **Funcionalidades:**
- ✅ Agregar nueva alerta
- ✅ Activar/desactivar alertas
- ✅ Eliminar alertas
- ✅ Contador de alertas activas
- ✅ Validación de entrada

### **3. GroupBills - Group Bills Interactivo**

Componente para gestionar gastos compartidos entre grupos.

#### **Características:**
- **Agregar gastos** con descripción y monto
- **División automática** entre miembros
- **Historial de gastos** recientes
- **Balance por persona** en tiempo real
- **Reset de cuentas**

#### **Uso:**
```jsx
import GroupBills from "./GroupBills";

<GroupBills />
```

#### **Funcionalidades:**
- ✅ Agregar gastos compartidos
- ✅ División automática por persona
- ✅ Historial de gastos recientes
- ✅ Balance individual actualizado
- ✅ Botón de reset para limpiar cuentas
- ✅ Total acumulado visible

## 🔗 Integración en el Dashboard

### **Nueva Estructura:**
```jsx
// Dashboard.jsx
import Sparkline from "./Sparkline";
import FXAlerts from "./FXAlerts";
import GroupBills from "./GroupBills";

// Strip superior (existente)
<FXTicker />
<SavingsWidget />
<ImpactWidget />

// Nueva sección - Mini-gráfico y Alertas
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="card">
    <h3>USD/MXN - 7 días</h3>
    <Sparkline data={[18.2, 18.3, 18.25, 18.4, 18.35, 18.5, 18.45]} />
  </div>
  <FXAlerts />
</div>

// Pay tab - Wallet + Group Bills
{showPay && (
  <div className="space-y-6">
    <WalletCard />
    <GroupBills />
  </div>
)}
```

### **Distribución de Colores:**
```jsx
// Módulos principales
<ModuleCard color="primary" />   // CATE Talent
<ModuleCard color="secondary" /> // CATE Skills  
<ModuleCard color="accent" />    // CATE Pay
<ModuleCard color="warning" />   // Fundación CATE

// Componentes específicos
<FXAlerts />        // Usa accent color
<GroupBills />      // Usa secondary color
<Sparkline />       // Usa accent color
```

## 🎯 Características Destacadas

### **Animaciones y Microinteracciones**
- **Hover effects** en todos los componentes
- **Tap animations** para botones
- **Stagger animations** para listas
- **Toast notifications** con animaciones
- **Smooth transitions** entre estados

### **Responsive Design**
- **Mobile-first** approach
- **Grid layouts** adaptativos
- **Touch-friendly** interfaces
- **Safe areas** para dispositivos móviles

### **Accesibilidad**
- **Focus states** visibles
- **Keyboard navigation** support
- **Screen reader** friendly
- **Color contrast** adecuado

## 🚀 Instalación y Configuración

### **1. Instalar dependencias adicionales:**
```bash
npm install chart.js react-chartjs-2
```

### **2. Actualizar Tailwind config:**
```bash
# El archivo tailwind.config.js ya está actualizado
```

### **3. Verificar componentes:**
```bash
# Los nuevos componentes están en:
src/components/Sparkline.jsx
src/components/FXAlerts.jsx
src/components/GroupBills.jsx
```

## 🎨 Personalización

### **Cambiar colores del Sparkline:**
```jsx
<Sparkline 
  data={[1, 2, 3, 4, 5]} 
  color="#6D28D9" // Morado
/>
```

### **Personalizar FXAlerts:**
```jsx
// En FXAlerts.jsx
const [alerts, setAlerts] = useState([
  { rate: "18.50", id: 1, active: true },
  // Agregar más alertas por defecto
]);
```

### **Modificar GroupBills:**
```jsx
// En GroupBills.jsx
const [items, setItems] = useState([
  { name: "Tu Nombre", amount: 0, id: 1 },
  // Agregar más miembros del grupo
]);
```

## 📱 Uso en Diferentes Tabs

### **Home Tab:**
- Módulos principales con nueva paleta
- Strip superior con widgets
- Mini-gráfico FX + Alertas

### **Pay Tab:**
- Wallet Card (existente)
- Group Bills (nuevo)

### **Skills Tab:**
- Mantiene funcionalidad existente
- Usa colores actualizados

### **Fundación Tab:**
- Mantiene funcionalidad existente
- Usa colores actualizados

## 🔧 Desarrollo

### **Estructura de Archivos:**
```
src/components/
├── Dashboard.jsx      # Actualizado con nuevos componentes
├── Sparkline.jsx      # Nuevo - Mini-gráficos
├── FXAlerts.jsx       # Nuevo - Alertas FX
├── GroupBills.jsx     # Nuevo - Gastos compartidos
├── ModuleCard.jsx     # Actualizado con nuevos colores
├── FXTicker.jsx       # Actualizado con nueva paleta
├── SavingsWidget.jsx  # Actualizado con nueva paleta
└── ImpactWidget.jsx   # Actualizado con nueva paleta
```

### **Dependencias:**
```json
{
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0"
}
```

## 🎉 Resultado Final

La aplicación CATE ahora incluye:

✅ **Nueva paleta de colores** moderna y profesional
✅ **Mini-gráficos** para visualización de datos
✅ **Sistema de alertas** para FX
✅ **Gestión de gastos** compartidos
✅ **Animaciones mejoradas** en todos los componentes
✅ **Experiencia móvil** optimizada
✅ **Interfaz más rica** y funcional

¡La aplicación está lista para ofrecer una experiencia de usuario excepcional! 🚀
