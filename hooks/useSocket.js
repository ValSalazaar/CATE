import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function useSocket(token) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);

  // Función para conectar el socket
  const connect = useCallback(() => {
    if (!token) {
      console.log('No token available, skipping socket connection');
      return;
    }

    // Cerrar conexión existente si hay una
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('🔌 Conectando socket con token...');

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('✅ Socket conectado con ID:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🚨 Error de conexión socket:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Eventos de transacciones
    socket.on('transactions:update', (data) => {
      console.log('💰 Nueva transacción recibida:', data);
      setLastEvent({ type: 'transaction', data, timestamp: Date.now() });
    });

    socket.on('transactions:confirmed', (data) => {
      console.log('✅ Transacción confirmada:', data);
      setLastEvent({ type: 'confirmation', data, timestamp: Date.now() });
    });

    // Eventos de pagos
    socket.on('payments:new', (data) => {
      console.log('💳 Nuevo pago recibido:', data);
      setLastEvent({ type: 'payment', data, timestamp: Date.now() });
    });

    // Eventos de matching
    socket.on('matching:update', (data) => {
      console.log('🎯 Actualización de matching:', data);
      setLastEvent({ type: 'matching', data, timestamp: Date.now() });
    });

    // Eventos de error
    socket.on('error', (error) => {
      console.error('🚨 Error en socket:', error);
      setConnectionError(error.message);
    });

    // Eventos de reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconectado en intento:', attemptNumber);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_error', (error) => {
      console.error('🚨 Error de reconexión:', error.message);
      setConnectionError(error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('💥 Falló la reconexión después de múltiples intentos');
      setConnectionError('Falló la reconexión');
    });

  }, [token]);

  // Función para desconectar manualmente
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Desconectando socket manualmente...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setConnectionError(null);
    }
  }, []);

  // Función para emitir eventos
  const emit = useCallback((event, data) => {
    if (socketRef.current && isConnected) {
      console.log(`📤 Emitiendo evento ${event}:`, data);
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ No se puede emitir evento: socket no conectado');
    }
  }, [isConnected]);

  // Función para unirse a una sala específica
  const joinRoom = useCallback((room) => {
    if (socketRef.current && isConnected) {
      console.log(`🚪 Uniéndose a sala: ${room}`);
      socketRef.current.emit('join', room);
    }
  }, [isConnected]);

  // Función para salir de una sala específica
  const leaveRoom = useCallback((room) => {
    if (socketRef.current && isConnected) {
      console.log(`🚪 Saliendo de sala: ${room}`);
      socketRef.current.emit('leave', room);
    }
  }, [isConnected]);

  // Efecto para manejar la conexión cuando cambia el token
  useEffect(() => {
    connect();

    // Cleanup al desmontar
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Efecto para limpiar el último evento después de un tiempo
  useEffect(() => {
    if (lastEvent) {
      const timer = setTimeout(() => {
        setLastEvent(null);
      }, 5000); // Limpiar después de 5 segundos

      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  return {
    // Estado
    isConnected,
    connectionError,
    lastEvent,
    
    // Métodos
    connect,
    disconnect,
    emit,
    joinRoom,
    leaveRoom,
    
    // Referencia al socket (para casos avanzados)
    socket: socketRef.current,
  };
}
