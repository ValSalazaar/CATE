import React from 'react';
import useWallet from '../hooks/useWallet';

export default function WalletConnect() {
  const { address, connectWallet, disconnectWallet, isConnecting, error } = useWallet();

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (err) {
      // Error is already handled in the hook
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-connect">
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
      
      {!address ? (
        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="connect-button"
        >
          {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
        </button>
      ) : (
        <div className="wallet-info">
          <span className="address">
            {formatAddress(address)}
          </span>
          <button 
            onClick={disconnectWallet}
            className="disconnect-button"
          >
            Desconectar
          </button>
        </div>
      )}
    </div>
  );
}
