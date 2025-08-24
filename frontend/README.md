# CATE Frontend - React + Tailwind + Framer Motion

Frontend moderno y responsive para la aplicación CATE, construido con React, Tailwind CSS y Framer Motion.

## 🚀 Características

### **Diseño Mobile-First**
- **Tab bar inferior** para navegación móvil
- **Responsive design** que se adapta a todos los dispositivos
- **Safe areas** para dispositivos con notch
- **Touch-friendly** con microinteracciones

### **Animaciones Fluidas**
- **Framer Motion** para transiciones suaves
- **Microinteracciones** en hover/tap
- **Animaciones de entrada** con stagger effects
- **Transiciones entre tabs** con AnimatePresence

### **Componentes Interactivos**
- **Wallet Card** con funcionalidad de envío/recibo
- **FX Ticker** con actualizaciones en tiempo real
- **Savings Widget** con cálculo de interés animado
- **Impact Widget** con métricas sociales dinámicas

### **Sistema de Diseño**
- **Paleta de colores** consistente (Primary, Accent, Success, Warning, Error)
- **Componentes base** reutilizables (Card, Button, Badge)
- **Tipografía** con Inter font
- **Gradientes** y efectos visuales modernos

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx          # Vista principal con tabs
│   │   ├── ModuleCard.jsx         # Tarjetas de módulos
│   │   ├── WalletCard.jsx         # Wallet interactiva
│   │   ├── FXTicker.jsx           # Indicador FX en tiempo real
│   │   ├── SavingsWidget.jsx      # Widget de ahorro
│   │   └── ImpactWidget.jsx       # Widget de impacto social
│   ├── App.jsx                    # Componente principal
│   ├── main.jsx                   # Punto de entrada
│   └── index.css                  # Estilos globales
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🛠️ Tecnologías

- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de CSS utility-first
- **Framer Motion** - Biblioteca de animaciones
- **PostCSS** - Procesador de CSS
- **Autoprefixer** - Auto-prefixing de CSS

## 🚀 Instalación

### **1. Instalar dependencias**
```bash
cd frontend
npm install
```

### **2. Configurar variables de entorno**
```bash
# Crear .env.local
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### **3. Ejecutar en desarrollo**
```bash
npm run dev
```

### **4. Construir para producción**
```bash
npm run build
npm run preview
```

## 🎨 Sistema de Diseño

### **Colores**
```css
/* Primary - Azul profundo */
primary: #0F172A

/* Accent - Dorado cálido */
accent: #E6B800

/* Success - Verde */
success: #22c55e

/* Warning - Amarillo */
warning: #f59e0b

/* Error - Rojo */
error: #ef4444
```

### **Componentes Base**
```jsx
// Card con hover effects
<div className="card">...</div>

// Botones con variantes
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-ghost">Ghost</button>

// Badges con colores
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
```

### **Animaciones**
```jsx
// Hover effects
<motion.div whileHover={{ scale: 1.02 }}>...</motion.div>

// Tap effects
<motion.button whileTap={{ scale: 0.98 }}>...</motion.button>

// Stagger animations
<motion.div
  variants={{
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }}
>
```

## 📱 Responsive Design

### **Breakpoints**
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### **Mobile-First Approach**
```jsx
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Text responsive
<h1 className="text-lg md:text-xl lg:text-2xl">

// Spacing responsive
<div className="p-4 md:p-6 lg:p-8">
```

## 🎯 Componentes Principales

### **Dashboard**
- **Vista principal** con navegación por tabs
- **AnimatePresence** para transiciones suaves
- **Stagger animations** para elementos hijos

### **ModuleCard**
- **Tarjetas interactivas** con hover effects
- **Sistema de colores** por módulo
- **Animaciones de entrada** escalonadas

### **WalletCard**
- **Funcionalidad completa** de wallet
- **Modal de envío** con animaciones
- **Toast notifications** para feedback
- **Historial de transacciones** animado

### **FXTicker**
- **Actualizaciones en tiempo real** con Framer Motion
- **Animaciones suaves** para cambios de valor
- **Indicadores visuales** de tendencia

### **SavingsWidget**
- **Cálculo de interés** en tiempo real
- **Barra de progreso** animada
- **Contadores dinámicos** con animaciones

### **ImpactWidget**
- **Métricas sociales** actualizadas automáticamente
- **KPIs animados** con iconos
- **Indicadores de actividad** en tiempo real

## 🔧 Configuración

### **Vite Config**
```javascript
// Proxy para desarrollo
server: {
  proxy: {
    '/api': 'http://localhost:4000',
    '/socket.io': {
      target: 'http://localhost:4000',
      ws: true
    }
  }
}
```

### **Tailwind Config**
```javascript
// Colores personalizados
colors: {
  primary: { DEFAULT: '#0F172A' },
  accent: { DEFAULT: '#E6B800' }
}

// Sombras personalizadas
boxShadow: {
  'card': '0 8px 24px rgba(0,0,0,0.08)'
}
```

## 🎨 Personalización

### **Agregar nuevos colores**
```javascript
// tailwind.config.js
colors: {
  custom: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    900: '#0c4a6e'
  }
}
```

### **Crear nuevos componentes**
```jsx
// components/CustomCard.jsx
import { motion } from "framer-motion";

export default function CustomCard({ children, ...props }) {
  return (
    <motion.div
      className="card"
      whileHover={{ y: -2, scale: 1.02 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

## 🚀 Performance

### **Optimizaciones**
- **Code splitting** automático con Vite
- **Tree shaking** para reducir bundle size
- **Lazy loading** de componentes pesados
- **Optimización de imágenes** con Vite

### **Bundle Analysis**
```bash
npm run build
npx vite-bundle-analyzer dist
```

## 🧪 Testing

### **Estructura de Tests**
```
tests/
├── components/
│   ├── Dashboard.test.jsx
│   ├── ModuleCard.test.jsx
│   └── WalletCard.test.jsx
└── utils/
    └── animations.test.js
```

### **Ejecutar Tests**
```bash
npm test
npm run test:watch
npm run test:coverage
```

## 📦 Deployment

### **Build para Producción**
```bash
npm run build
```

### **Variables de Entorno**
```env
# Producción
VITE_API_URL=https://api.cate.com
VITE_WS_URL=wss://api.cate.com
VITE_ENVIRONMENT=production
```

### **Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔄 Integración con Backend

### **API Calls**
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
});

export const getWalletBalance = () => api.get('/wallet/balance');
export const sendPayment = (data) => api.post('/payments/send', data);
```

### **WebSocket Connection**
```javascript
// hooks/useSocket.js
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_WS_URL, {
  auth: { token: localStorage.getItem('token') }
});

socket.on('payment:received', (data) => {
  // Actualizar UI
});
```

## 🎯 Roadmap

### **Fase 1 - MVP** ✅
- [x] Estructura base con React + Vite
- [x] Sistema de diseño con Tailwind
- [x] Componentes principales
- [x] Animaciones con Framer Motion

### **Fase 2 - Integración** 🚧
- [ ] Conexión con API backend
- [ ] WebSocket para tiempo real
- [ ] Autenticación JWT
- [ ] Persistencia de estado

### **Fase 3 - Avanzado** 📋
- [ ] PWA capabilities
- [ ] Offline support
- [ ] Push notifications
- [ ] Analytics y tracking

### **Fase 4 - Escalabilidad** 📋
- [ ] Code splitting avanzado
- [ ] Performance optimizations
- [ ] A/B testing
- [ ] Internacionalización

## 🤝 Contribución

### **Guidelines**
1. **Mobile-first** en todos los componentes
2. **Accesibilidad** con ARIA labels
3. **Performance** con lazy loading
4. **Testing** para nuevos componentes

### **Workflow**
```bash
# Crear feature branch
git checkout -b feature/nuevo-componente

# Desarrollar
npm run dev

# Testear
npm test

# Commit
git commit -m "feat: agregar nuevo componente"

# Push
git push origin feature/nuevo-componente
```

## 📄 Licencia

MIT License - ver [LICENSE](../LICENSE) para detalles.

---

**CATE Frontend** - Tu talento y tu dinero, en un solo lugar 🚀
