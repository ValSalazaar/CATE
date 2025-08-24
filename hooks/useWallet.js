import { useState } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

export default function useWallet() {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const web3Modal = new Web3Modal({
        network: "mainnet", // optional
        cacheProvider: true, // optional
        providerOptions: {} // required
      });
      
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      
      setAddress(addr);
      return { address: addr, signer, provider };
    } catch (err) {
      console.error('Error conectando wallet', err);
      setError(err.message || 'Error al conectar wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setError(null);
  };

  return { 
    address, 
    connectWallet, 
    disconnectWallet,
    isConnecting,
    error
  };
}
