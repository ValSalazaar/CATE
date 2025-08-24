import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import useAuth from '../hooks/useAuth';
import useSocket from '../hooks/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Dashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const { isConnected, connectionError, lastEvent } = useSocket(token);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga inicial
  useEffect(() => {
    axios.get(`${API_URL}/transactions`, { withCredentials: true })
      .then(res => {
        setTransactions(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando transacciones:', err);
        setError('Error cargando transacciones');
        setLoading(false);
      });
  }, []);

  // Manejar eventos de socket
  useEffect(() => {
    if (lastEvent && (lastEvent.type === 'transaction' || lastEvent.type === 'confirmation')) {
      const tx = lastEvent.data;
      setTransactions(prev => {
        const exists = prev.find(p => p.tx_hash === tx.tx_hash && p.log_index === tx.log_index);
        if (exists) {
          return prev.map(p => (p.tx_hash === tx.tx_hash && p.log_index === tx.log_index) ? tx : p);
        }
        return [tx, ...prev]; // prepend para que aparezca arriba
      });
    }
  }, [lastEvent]);

  // Manejar errores de conexión
  useEffect(() => {
    if (connectionError) {
      setError(`Error de conexión: ${connectionError}`);
    }
  }, [connectionError]);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount_wei, amount_formatted, token_symbol) => {
    if (amount_formatted) {
      return `${amount_formatted} ${token_symbol}`;
    }
    if (!amount_wei) return '0';
    // Fallback formatting
    return (parseInt(amount_wei) / 1000000).toFixed(2);
  };

  const formatDate = (occurred_at) => {
    if (!occurred_at) return '';
    return new Date(occurred_at).toLocaleString('es-ES');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <h1>Pagos recientes</h1>
        <div className="loading">Cargando transacciones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <h1>Pagos recientes</h1>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Pagos en tiempo real</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🔌' : '❌'}
          </span>
          <span className="status-text">
            {isConnected ? 'Conectado en tiempo real' : 'Desconectado'}
          </span>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Cargando transacciones...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : transactions.length === 0 ? (
        <div className="no-transactions">
          No hay transacciones disponibles
        </div>
      ) : (
        <div className="table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>De</th>
                <th>Para</th>
                <th>Monto</th>
                <th>Token</th>
                <th>Tx</th>
                <th>Bloque</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={`${tx.tx_hash}-${tx.log_index}`}>
                  <td>
                    <span className={`status ${tx.status}`}>
                      {tx.status === 'confirmed' ? '✅ Confirmado' : 
                       tx.status === 'pending' ? '⏳ Pendiente' : 
                       tx.status === 'failed' ? '❌ Fallido' :
                       tx.status === 'orphaned' ? '💀 Huérfano' : tx.status}
                    </span>
                  </td>
                  <td className="address">{formatAddress(tx.sender)}</td>
                  <td className="address">{formatAddress(tx.receiver)}</td>
                  <td className="amount">{tx.amount_formatted}</td>
                  <td className="token">{tx.token_symbol}</td>
                  <td className="tx-hash" title={tx.tx_hash}>
                    {tx.tx_hash ? `${tx.tx_hash.slice(0, 6)}…${tx.tx_hash.slice(-4)}` : '-'}
                  </td>
                  <td className="block-number">{tx.block_number || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
