import React, { useEffect, useState } from 'react';
import useSocket from '../hooks/useSocket';
import useAuth from '../hooks/useAuth';

export default function SocketClient() {
  const { user, token } = useAuth();
  const {
    isConnected,
    connectionError,
    lastEvent,
    emit,
    joinRoom,
    leaveRoom,
    socket
  } = useSocket(token);

  const [events, setEvents] = useState([]);
  const [testMessage, setTestMessage] = useState('');

  // Agregar eventos al historial
  useEffect(() => {
    if (lastEvent) {
      setEvents(prev => [lastEvent, ...prev.slice(0, 9)]); // Mantener solo los últimos 10
    }
  }, [lastEvent]);

  // Función para enviar mensaje de prueba
  const sendTestMessage = () => {
    if (testMessage.trim()) {
      emit('test:message', {
        message: testMessage,
        timestamp: Date.now(),
        user: user?.email
      });
      setTestMessage('');
    }
  };

  // Función para unirse a sala de prueba
  const joinTestRoom = () => {
    joinRoom('test-room');
  };

  // Función para salir de sala de prueba
  const leaveTestRoom = () => {
    leaveRoom('test-room');
  };

  // Función para limpiar historial
  const clearEvents = () => {
    setEvents([]);
  };

  // Función para obtener el color del tipo de evento
  const getEventColor = (type) => {
    switch (type) {
      case 'transaction': return 'text-green-600';
      case 'confirmation': return 'text-blue-600';
      case 'payment': return 'text-purple-600';
      case 'matching': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  // Función para obtener el ícono del tipo de evento
  const getEventIcon = (type) => {
    switch (type) {
      case 'transaction': return '💰';
      case 'confirmation': return '✅';
      case 'payment': return '💳';
      case 'matching': return '🎯';
      default: return '📡';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Socket.IO Client
        </h2>
        <p className="text-gray-600">
          Cliente de tiempo real con autenticación y eventos por organización
        </p>
      </div>

      {/* Estado de conexión */}
      <div className="mb-6 p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Estado de Conexión
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        {connectionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">
              <strong>Error:</strong> {connectionError}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Usuario:</span>
            <span className="ml-2 text-gray-800">{user?.email || 'No autenticado'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Organización:</span>
            <span className="ml-2 text-gray-800">{user?.organization?.name || 'Sin organización'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Socket ID:</span>
            <span className="ml-2 text-gray-800 font-mono text-xs">
              {socket?.id || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Controles de prueba */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Controles de Prueba
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mensaje de prueba */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje de Prueba
            </label>
            <div className="flex">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Escribe un mensaje de prueba..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
              />
              <button
                onClick={sendTestMessage}
                disabled={!isConnected || !testMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </div>
          </div>

          {/* Salas de prueba */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salas de Prueba
            </label>
            <div className="flex space-x-2">
              <button
                onClick={joinTestRoom}
                disabled={!isConnected}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Unirse a Test Room
              </button>
              <button
                onClick={leaveTestRoom}
                disabled={!isConnected}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Salir de Test Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de eventos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Historial de Eventos ({events.length})
          </h3>
          <button
            onClick={clearEvents}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Limpiar
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay eventos aún</p>
              <p className="text-sm">Los eventos aparecerán aquí cuando se reciban</p>
            </div>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getEventIcon(event.type)}</span>
                    <div>
                      <h4 className={`font-medium ${getEventColor(event.type)}`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {Math.floor((Date.now() - event.timestamp) / 1000)}s ago
                  </span>
                </div>
                
                <div className="mt-3">
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Información del sistema */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Información del Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-700">Eventos Escuchados:</span>
            <ul className="mt-1 text-blue-600 space-y-1">
              <li>• transactions:update</li>
              <li>• transactions:confirmed</li>
              <li>• payments:new</li>
              <li>• matching:update</li>
            </ul>
          </div>
          <div>
            <span className="font-medium text-blue-700">Características:</span>
            <ul className="mt-1 text-blue-600 space-y-1">
              <li>• Autenticación JWT</li>
              <li>• Reconexión automática</li>
              <li>• Salas por organización</li>
              <li>• Eventos en tiempo real</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
