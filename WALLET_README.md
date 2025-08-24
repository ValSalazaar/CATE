# Wallet Connection Setup

Este proyecto incluye funcionalidad para conectar wallets Web3 usando ethers.js y Web3Modal.

## Dependencias Instaladas

- `ethers` - Biblioteca para interactuar con Ethereum
- `web3modal` - Modal para conectar diferentes tipos de wallets
- `@web3modal/ethereum` - Configuración de Ethereum para Web3Modal
- `@web3modal/react` - Componentes React para Web3Modal
- `wagmi` - Hooks de React para Ethereum
- `viem` - Cliente TypeScript para Ethereum

## Uso del Hook useWallet

### Importación
```javascript
import useWallet from './hooks/useWallet';
```

### Uso Básico
```javascript
function MyComponent() {
  const { address, connectWallet, disconnectWallet, isConnecting, error } = useWallet();

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Error al conectar:', err);
    }
  };

  return (
    <div>
      {!address ? (
        <button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
        </button>
      ) : (
        <div>
          <p>Dirección: {address}</p>
          <button onClick={disconnectWallet}>Desconectar</button>
        </div>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Propiedades del Hook

- `address` - Dirección de la wallet conectada (string o null)
- `connectWallet()` - Función para conectar la wallet
- `disconnectWallet()` - Función para desconectar la wallet
- `isConnecting` - Estado de conexión (boolean)
- `error` - Mensaje de error si ocurre alguno

## Componente WalletConnect

Se incluye un componente predefinido `WalletConnect` que puedes usar directamente:

```javascript
import WalletConnect from './components/WalletConnect';
import './styles/WalletConnect.css';

function App() {
  return (
    <div>
      <h1>Mi App Web3</h1>
      <WalletConnect />
    </div>
  );
}
```

## Configuración de Web3Modal

El hook incluye configuración básica para Web3Modal:

```javascript
const web3Modal = new Web3Modal({
  network: "mainnet", // Red por defecto
  cacheProvider: true, // Cachear el proveedor seleccionado
  providerOptions: {} // Opciones adicionales de proveedores
});
```

## Wallets Soportadas

Web3Modal soporta múltiples wallets:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Trust Wallet
- Y muchas más...

## Notas Importantes

1. **Web3Modal v1 está deprecado** - Se recomienda migrar a la nueva versión cuando esté disponible
2. **Manejo de errores** - El hook incluye manejo de errores automático
3. **Estado de conexión** - Usa `isConnecting` para mostrar estados de carga
4. **Formateo de dirección** - El componente incluye formateo automático de direcciones

## Próximos Pasos

Para integrar con tu API de autenticación:

1. Modifica el hook para enviar la dirección de la wallet a tu backend
2. Implementa autenticación basada en wallet
3. Agrega funcionalidad para firmar mensajes
4. Integra con contratos inteligentes
