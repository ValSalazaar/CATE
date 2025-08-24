// Socket.IO Client - Vanilla JavaScript
// Para usar en HTML, Vue, o cualquier framework

// Configuración
const API_URL = process.env.VITE_API_URL || 'http://localhost:4000';

// Clase Socket.IO Client
class SocketClient {
  constructor(token) {
    this.token = token;
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Conectar al servidor
  connect() {
    if (!this.token) {
      console.error('❌ No hay token disponible para la conexión');
      return;
    }

    console.log('🔌 Conectando socket con token...');

    // Crear conexión Socket.IO
    this.socket = io(API_URL, {
      auth: { token: this.token },
      transports: ['websocket'],
      withCredentials: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    // Configurar event listeners
    this.setupEventListeners();
  }

  // Configurar event listeners
  setupEventListeners() {
    // Eventos de conexión
    this.socket.on('connect', () => {
      console.log('✅ Socket conectado con ID:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('client:connected', { timestamp: Date.now() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Error de conexión socket:', error.message);
      this.isConnected = false;
    });

    // Eventos de reconexión
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconectado en intento:', attemptNumber);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🚨 Error de reconexión:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💥 Falló la reconexión después de múltiples intentos');
    });

    // Eventos de transacciones
    this.socket.on('transactions:update', (data) => {
      console.log('💰 Nueva transacción recibida:', data);
      this.triggerEvent('transaction', data);
    });

    this.socket.on('transactions:confirmed', (data) => {
      console.log('✅ Transacción confirmada:', data);
      this.triggerEvent('confirmation', data);
    });

    // Eventos de pagos
    this.socket.on('payments:new', (data) => {
      console.log('💳 Nuevo pago recibido:', data);
      this.triggerEvent('payment', data);
    });

    // Eventos de matching
    this.socket.on('matching:update', (data) => {
      console.log('🎯 Actualización de matching:', data);
      this.triggerEvent('matching', data);
    });

    // Eventos de error
    this.socket.on('error', (error) => {
      console.error('🚨 Error en socket:', error);
      this.triggerEvent('error', error);
    });
  }

  // Desconectar
  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Emitir evento
  emit(event, data) {
    if (this.socket && this.isConnected) {
      console.log(`📤 Emitiendo evento ${event}:`, data);
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ No se puede emitir evento: socket no conectado');
    }
  }

  // Unirse a sala
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      console.log(`🚪 Uniéndose a sala: ${room}`);
      this.socket.emit('join', room);
    }
  }

  // Salir de sala
  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      console.log(`🚪 Saliendo de sala: ${room}`);
      this.socket.emit('leave', room);
    }
  }

  // Agregar event listener personalizado
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // Remover event listener
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Trigger de eventos personalizados
  triggerEvent(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback de evento ${event}:`, error);
        }
      });
    }
  }

  // Obtener estado de conexión
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Ejemplo de uso
function createSocketClient() {
  // Obtener token del localStorage o de donde sea
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('❌ No hay token de autenticación');
    return null;
  }

  // Crear instancia del cliente
  const client = new SocketClient(token);

  // Configurar event listeners personalizados
  client.on('transaction', (data) => {
    console.log('🔄 Actualizando UI con nueva transacción:', data);
    updateTransactionUI(data);
  });

  client.on('confirmation', (data) => {
    console.log('🔄 Actualizando UI con confirmación:', data);
    updateConfirmationUI(data);
  });

  client.on('payment', (data) => {
    console.log('🔄 Actualizando UI con nuevo pago:', data);
    updatePaymentUI(data);
  });

  client.on('matching', (data) => {
    console.log('🔄 Actualizando UI con matching:', data);
    updateMatchingUI(data);
  });

  client.on('error', (error) => {
    console.error('🔄 Error en el cliente:', error);
    showErrorNotification(error);
  });

  // Conectar
  client.connect();

  return client;
}

// Funciones de ejemplo para actualizar UI
function updateTransactionUI(data) {
  // Ejemplo: agregar transacción a una tabla
  const table = document.getElementById('transactions-table');
  if (table) {
    const row = table.insertRow(1); // Insertar después del header
    row.innerHTML = `
      <td>${data.sender}</td>
      <td>${data.receiver}</td>
      <td>${data.amount_formatted}</td>
      <td>${data.status}</td>
      <td>${new Date().toLocaleTimeString()}</td>
    `;
  }
}

function updateConfirmationUI(data) {
  // Ejemplo: mostrar notificación de confirmación
  showNotification('✅ Transacción confirmada', 'success');
}

function updatePaymentUI(data) {
  // Ejemplo: actualizar contador de pagos
  const counter = document.getElementById('payments-counter');
  if (counter) {
    const current = parseInt(counter.textContent) || 0;
    counter.textContent = current + 1;
  }
}

function updateMatchingUI(data) {
  // Ejemplo: actualizar lista de matches
  console.log('Actualizando matching UI:', data);
}

function showErrorNotification(error) {
  // Ejemplo: mostrar notificación de error
  showNotification(`❌ Error: ${error.message}`, 'error');
}

function showNotification(message, type = 'info') {
  // Función de ejemplo para mostrar notificaciones
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Si tienes un sistema de notificaciones, úsalo aquí
  if (window.showToast) {
    window.showToast(message, type);
  }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SocketClient, createSocketClient };
}

// Ejemplo de uso en HTML
/*
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="socket-client-vanilla.js"></script>
<script>
  // Crear cliente cuando la página cargue
  document.addEventListener('DOMContentLoaded', () => {
    const socketClient = createSocketClient();
    
    // Guardar referencia global para uso posterior
    window.socketClient = socketClient;
    
    // Ejemplo: enviar mensaje de prueba
    setTimeout(() => {
      if (socketClient && socketClient.isConnected) {
        socketClient.emit('test:message', {
          message: 'Hola desde el cliente!',
          timestamp: Date.now()
        });
      }
    }, 2000);
  });
</script>
*/
