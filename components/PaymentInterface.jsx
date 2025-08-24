import React, { useState, useEffect } from 'react';
import useCatePayments from '../hooks/useCatePayments';
import useWallet from '../hooks/useWallet';

export default function PaymentInterface({ contractAddress }) {
  const { address, connectWallet, isConnecting } = useWallet();
  const { 
    sendPayment, 
    getBalance, 
    getAllowance, 
    isLoading, 
    error, 
    isConnected,
    owner,
    stablecoinAddress 
  } = useCatePayments(contractAddress);

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);

  // Load balance and allowance
  useEffect(() => {
    if (isConnected) {
      loadData();
    }
  }, [isConnected]);

  const loadData = async () => {
    const userBalance = await getBalance();
    const userAllowance = await getAllowance();
    setBalance(userBalance);
    setAllowance(userAllowance);
  };

  const handleSendPayment = async (e) => {
    e.preventDefault();
    
    if (!recipientAddress || !amount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const result = await sendPayment(recipientAddress, amount);
      setTransactionHash(result.transactionHash);
      setRecipientAddress('');
      setAmount('');
      await loadData(); // Refresh balance
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="payment-interface">
        <h2>CATE Payments</h2>
        <p>Connect your wallet to start making payments</p>
        <button 
          onClick={connectWallet}
          disabled={isConnecting}
          className="connect-button"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="payment-interface">
      <h2>CATE Payments</h2>
      
      <div className="wallet-info">
        <p><strong>Connected:</strong> {formatAddress(address)}</p>
        {balance !== null && (
          <p><strong>Balance:</strong> {parseFloat(balance).toFixed(2)} USDC</p>
        )}
        {allowance !== null && (
          <p><strong>Allowance:</strong> {parseFloat(allowance).toFixed(2)} USDC</p>
        )}
        {owner && (
          <p><strong>Contract Owner:</strong> {formatAddress(owner)}</p>
        )}
      </div>

      <form onSubmit={handleSendPayment} className="payment-form">
        <div className="form-group">
          <label htmlFor="recipient">Recipient Address:</label>
          <input
            type="text"
            id="recipient"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (USDC):</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            step="0.01"
            min="0"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading || !recipientAddress || !amount}
          className="send-button"
        >
          {isLoading ? 'Processing...' : 'Send Payment'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {transactionHash && (
        <div className="success-message">
          <p>Payment sent successfully!</p>
          <p>Transaction Hash: {formatAddress(transactionHash)}</p>
          <a 
            href={`https://etherscan.io/tx/${transactionHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View on Etherscan
          </a>
        </div>
      )}
    </div>
  );
}
