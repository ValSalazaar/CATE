# CATE - Plataforma de Credenciales Verificables y Pagos

## Descripción General

CATE es una plataforma integral que combina credenciales verificables (VC) con un sistema de pagos y remesas para Latinoamérica, con un enfoque en impacto social a través de la Fundación CATE.

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
   - Copia `env.example` a `.env`
   - Configura las variables de base de datos y JWT_SECRET

3. Configurar base de datos:
   - Crea una base de datos PostgreSQL
   - Ejecuta el script `database/schema.sql`

4. Iniciar el servidor:
```bash
npm start
```

## API de Autenticación

### Endpoints

#### POST /api/auth/register
Registra un nuevo usuario.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre Usuario"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario"
  },
  "token": "jwt_token_here"
}
```

## Variables de Entorno

- `DB_HOST`: Host de la base de datos
- `DB_PORT`: Puerto de la base de datos
- `DB_NAME`: Nombre de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `JWT_SECRET`: Clave secreta para JWT
- `PORT`: Puerto del servidor (opcional, default: 3000)

## Fundación CATE

### Propósito Social
- % de ingresos destinado a becar capacitación y certificación.
- Programas para que personas vulnerables escalen laboralmente.
- Métricas de impacto social visibles en el dashboard.

### Alianzas Estratégicas

- **Educación**: Universidades, ministerios, plataformas de e-learning.
- **Blockchain**: Ethereum, Polygon, Stellar.
- **Fintechs**: Bitso, Binance Pay, Strike, Airtm, Payoneer.
- **ONGs y fundaciones**: Programas de capacitación laboral.

### Roadmap

- **Fase 1** – MVP validación académica y wallet básica.
- **Fase 2** – Certificación de experiencia y competencias para perfiles no académicos.
- **Fase 3** – Integración de pagos y remesas en LATAM.
- **Fase 4** – Escalado regional y expansión de la Fundación CATE.

### Ventaja Competitiva

- **Ciclo completo**: Validar → Certificar → Contratar → Pagar → Capacitar.
- **Cobertura multisegmento**: Académicos, técnicos, operarios, empresas, influencers.
- **Impacto social medible**: Inclusión laboral y financiera.
- **Escalabilidad**: Arquitectura modular y adaptable.

## Arquitectura de Datos y Servicios

```plaintext
FUENTES DE DATOS
 ├─ Gobiernos (bases públicas)
 ├─ Universidades (egresados, planes de estudio)
 ├─ Empresas (referencias laborales)
 ├─ Plataformas de certificación
 └─ Tests CATE (soft skills, técnicos)

CAPA DE INGESTA Y NORMALIZACIÓN
 ├─ APIs oficiales / scraping autorizado
 ├─ Limpieza y estandarización
 ├─ Mapeo de materias → competencias
 └─ Ponderación por tipo de evaluación

CAPA DE VALIDACIÓN Y FIRMA
 ├─ Verificación con fuente original
 ├─ Credencial verificable (VC)
 └─ Registro de hash en blockchain

CAPA DE ANÁLISIS (IA)
 ├─ Perfil de competencias con niveles
 ├─ Gap analysis vs. vacantes
 └─ Recomendaciones de upskilling

CAPA DE PAGOS Y REMESAS
 ├─ Recepción de fondos (fiat)
 ├─ Conversión a stablecoins
 ├─ Wallet CATE
 └─ Retiros, pagos y remesas
```

## Arquitectura Modular de Pagos

### 1. Capa de Activos Digitales (Stablecoins)
**Objetivo**: soportar múltiples stablecoins y redes.

**Diseño**:
- Módulo AssetRegistry en backend que define:
  - ID del activo (ej. USDC-ETH, USDC-SOL, USDT-TRON, DAI-ETH, BRZ-POLYGON)
  - Metadatos: red, contrato, decimales, proveedor de liquidez
  - Estado: activo/inactivo
- Smart contracts o APIs que interactúan con cada red según el activo

**Beneficio**: añadir una nueva stablecoin es registrar su metadata y conector, no reescribir lógica.

### 2. Capa de Liquidez Global
- **Proveedor principal**: Circle (USDC, EURC) para liquidez regulada y APIs de pagos
- **Secundarios**: Stellar, Ethereum, Polygon, Tron, según disponibilidad de cada stablecoin
- **Función**: mover valor entre países y rails con baja fricción

### 3. Capa de Liquidación y FX
- **Rail principal**: Stellar (por velocidad y costo)
- **Alternativas**: Lightning Network (BTC), Polygon PoS, Solana
- **Función**:
  - Cambiar entre stablecoins (ej. USDC→USDT) o monedas fiat
  - Ejecutar FX inteligente (órdenes limit/stop, forwards)
  - Usar oráculos (Chainlink, Kaiko) para tasas en tiempo real

### 4. Capa de On/Off‑Ramp Local
**Objetivo**: conectar con bancos y métodos de pago locales.

**Diseño**:
- Módulo BankAdapter por país:
  - SPEI (México), PIX (Brasil), ACH (Colombia), CBU (Argentina), etc.
  - API REST o ISO 20022 según banco
  - Soporte para múltiples bancos por país
- Integración con exchanges locales (Bitso, Ripio, MercadoPago) como rampas adicionales

### 5. Capa de Core CATE Pay
**Servicios**:
- Custodia (hot wallets multi‑activo)
- Ledger interno multi‑moneda
- Motor de órdenes FX
- Gestión de alertas y notificaciones
- KYC/AML centralizado
- API pública para que bancos, fintechs y ONGs se conecten

### Flujo de ejemplo: Pago multi‑stablecoin a banco local
1. Usuario en CATE Pay tiene saldo en USDT‑TRON
2. Elige enviar a cuenta bancaria en México (MXN)
3. Core CATE Pay:
   - Convierte USDT‑TRON → USDC‑Stellar vía módulo FX
   - Envía USDC‑Stellar a anchor local (Bitso)
   - Anchor liquida en MXN vía SPEI al banco destino
4. Todo el flujo es trazable y auditable

### Ventajas de este diseño
- **Escalable**: añadir un nuevo banco o stablecoin es un módulo más, no un rediseño
- **Resiliente**: si un rail o proveedor falla, hay rutas alternativas
- **Regulatorio‑friendly**: puedes aislar la capa de custodia y cumplir licencias locales
- **Interoperable**: preparado para CBDCs cuando lleguen
