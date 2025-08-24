import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import useWallet from './useWallet';

// Contract ABI - you'll need to replace this with the actual ABI after compilation
const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function stablecoin() view returns (address)",
  "function sendPayment(address to, uint256 amount) external",
  "event PaymentSent(address indexed from, address indexed to, uint256 amount)"
];

// Stablecoin ABI for approvals
const STABLECOIN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

export default function useCatePayments(contractAddress) {
  const { address, connectWallet } = useWallet();
  const [contract, setContract] = useState(null);
  const [stablecoinContract, setStablecoinContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [owner, setOwner] = useState(null);
  const [stablecoinAddress, setStablecoinAddress] = useState(null);

  // Initialize contract instances
  useEffect(() => {
    if (address && contractAddress && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = provider.getSigner();
      
      const contractInstance = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      setContract(contractInstance);
      
      // Get stablecoin address and create stablecoin contract instance
      contractInstance.stablecoin().then((stablecoinAddr) => {
        setStablecoinAddress(stablecoinAddr);
        const stablecoinInstance = new ethers.Contract(stablecoinAddr, STABLECOIN_ABI, signer);
        setStablecoinContract(stablecoinInstance);
      });
      
      // Get contract owner
      contractInstance.owner().then(setOwner);
    }
  }, [address, contractAddress]);

  // Send payment function
  const sendPayment = useCallback(async (toAddress, amount) => {
    if (!contract || !stablecoinContract) {
      throw new Error('Contracts not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check allowance first
      const allowance = await stablecoinContract.allowance(address, contractAddress);
      const amountWei = ethers.parseUnits(amount.toString(), 6); // Assuming 6 decimals for USDC

      if (allowance < amountWei) {
        // Need to approve first
        const approveTx = await stablecoinContract.approve(contractAddress, amountWei);
        await approveTx.wait();
      }

      // Send payment
      const tx = await contract.sendPayment(toAddress, amountWei);
      const receipt = await tx.wait();

      // Find PaymentSent event
      const paymentEvent = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'PaymentSent';
        } catch {
          return false;
        }
      });

      return {
        success: true,
        transactionHash: tx.hash,
        event: paymentEvent ? contract.interface.parseLog(paymentEvent) : null
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contract, stablecoinContract, address, contractAddress]);

  // Get user's stablecoin balance
  const getBalance = useCallback(async () => {
    if (!stablecoinContract || !address) return null;
    
    try {
      const balance = await stablecoinContract.balanceOf(address);
      const decimals = await stablecoinContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (err) {
      console.error('Error getting balance:', err);
      return null;
    }
  }, [stablecoinContract, address]);

  // Get allowance for the contract
  const getAllowance = useCallback(async () => {
    if (!stablecoinContract || !address || !contractAddress) return null;
    
    try {
      const allowance = await stablecoinContract.allowance(address, contractAddress);
      const decimals = await stablecoinContract.decimals();
      return ethers.formatUnits(allowance, decimals);
    } catch (err) {
      console.error('Error getting allowance:', err);
      return null;
    }
  }, [stablecoinContract, address, contractAddress]);

  return {
    contract,
    stablecoinContract,
    owner,
    stablecoinAddress,
    sendPayment,
    getBalance,
    getAllowance,
    isLoading,
    error,
    isConnected: !!address
  };
}
