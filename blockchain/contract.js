// blockchain/contract.js
import { ethers } from "ethers";
import { config } from "../config/env.js";

// Import ABI from the compiled contract
// This will be generated after deployment
let VC_ABI = [];
try {
  const vcArtifact = await import("../blockchain/abi/VerifiableCredentials.json", { assert: { type: "json" } });
  VC_ABI = vcArtifact.default.abi;
} catch (error) {
  console.warn("⚠️ ABI not found. Please deploy the contract first.");
  // Fallback ABI for basic operations
  VC_ABI = [
    "function issueCredential(address _subject, bytes32 _metadataHash) external returns (bytes32)",
    "function revokeCredential(bytes32 _id) external",
    "function verifyCredential(bytes32 _id) external view returns (address, address, bytes32, bool, uint256)",
    "function isAuthorizedIssuer(address _issuer) external view returns (bool)",
    "function owner() external view returns (address)",
    "function addIssuer(address account) external",
    "function removeIssuer(address account) external",
    "event CredentialIssued(bytes32 indexed id, address indexed issuer, address indexed subject, bytes32 metadataHash)",
    "event CredentialRevoked(bytes32 indexed id, address indexed issuer)",
    "event IssuerAdded(address indexed account)",
    "event IssuerRemoved(address indexed account)"
  ];
}

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.privateKey, provider);

// Initialize contract instance
export const vcContract = new ethers.Contract(config.vcContractAddress, VC_ABI, wallet);

// Get issuer address
export const issuerAddress = await wallet.getAddress();

// Contract interaction functions
export async function issueCredential(subjectAddress, metadataHash) {
  try {
    console.log(`🔐 Emitiendo credencial para ${subjectAddress} con hash ${metadataHash}`);
    
    const tx = await vcContract.issueCredential(subjectAddress, metadataHash);
    console.log(`📝 Transacción enviada: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transacción confirmada en bloque ${receipt.blockNumber}`);
    
    // Find the CredentialIssued event
    const event = receipt.logs.find(log => {
      try {
        const parsed = vcContract.interface.parseLog(log);
        return parsed.name === "CredentialIssued";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = vcContract.interface.parseLog(event);
      const credentialId = parsed.args.id;
      console.log(`🎉 Credencial emitida con ID: ${credentialId}`);
      return { txHash: tx.hash, credentialId, receipt };
    }
    
    throw new Error("Evento CredentialIssued no encontrado en la transacción");
  } catch (error) {
    console.error("❌ Error emitiendo credencial:", error);
    throw error;
  }
}

export async function revokeCredential(credentialId) {
  try {
    console.log(`🗑️ Revocando credencial ${credentialId}`);
    
    const tx = await vcContract.revokeCredential(credentialId);
    console.log(`📝 Transacción de revocación enviada: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Revocación confirmada en bloque ${receipt.blockNumber}`);
    
    return { txHash: tx.hash, receipt };
  } catch (error) {
    console.error("❌ Error revocando credencial:", error);
    throw error;
  }
}

export async function verifyCredential(credentialId) {
  try {
    console.log(`🔍 Verificando credencial ${credentialId}`);
    
    const result = await vcContract.verifyCredential(credentialId);
    
    const [issuer, subject, metadataHash, revoked, issuedAt] = result;
    
    console.log(`✅ Credencial verificada:`);
    console.log(`   - Emisor: ${issuer}`);
    console.log(`   - Sujeto: ${subject}`);
    console.log(`   - Hash: ${metadataHash}`);
    console.log(`   - Revocada: ${revoked}`);
    console.log(`   - Emitida: ${new Date(Number(issuedAt) * 1000).toISOString()}`);
    
    return {
      issuer,
      subject,
      metadataHash,
      revoked,
      issuedAt: Number(issuedAt)
    };
  } catch (error) {
    console.error("❌ Error verificando credencial:", error);
    throw error;
  }
}

export async function isAuthorizedIssuer(address) {
  try {
    return await vcContract.isAuthorizedIssuer(address);
  } catch (error) {
    console.error("❌ Error verificando autorización:", error);
    return false;
  }
}

export async function getContractOwner() {
  try {
    return await vcContract.owner();
  } catch (error) {
    console.error("❌ Error obteniendo owner:", error);
    throw error;
  }
}

export async function addIssuer(address) {
  try {
    console.log(`➕ Agregando emisor autorizado: ${address}`);
    
    const tx = await vcContract.addIssuer(address);
    console.log(`📝 Transacción enviada: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Emisor agregado confirmado en bloque ${receipt.blockNumber}`);
    
    return { txHash: tx.hash, receipt };
  } catch (error) {
    console.error("❌ Error agregando emisor:", error);
    throw error;
  }
}

export async function removeIssuer(address) {
  try {
    console.log(`➖ Removiendo emisor autorizado: ${address}`);
    
    const tx = await vcContract.removeIssuer(address);
    console.log(`📝 Transacción enviada: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Emisor removido confirmado en bloque ${receipt.blockNumber}`);
    
    return { txHash: tx.hash, receipt };
  } catch (error) {
    console.error("❌ Error removiendo emisor:", error);
    throw error;
  }
}

// Health check function
export async function checkContractHealth() {
  try {
    const owner = await getContractOwner();
    const isIssuer = await isAuthorizedIssuer(issuerAddress);
    
    return {
      status: "healthy",
      contractAddress: config.vcContractAddress,
      owner,
      issuerAddress,
      isAuthorizedIssuer: isIssuer,
      network: (await provider.getNetwork()).name,
      chainId: (await provider.getNetwork()).chainId
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      contractAddress: config.vcContractAddress,
      issuerAddress
    };
  }
}

// Event listener for real-time updates
export function listenToCredentialEvents(callback) {
  console.log("👂 Iniciando escucha de eventos de credenciales...");
  
  vcContract.on("CredentialIssued", (id, issuer, subject, metadataHash, event) => {
    console.log(`🎉 Nueva credencial emitida: ${id}`);
    callback({
      type: "CredentialIssued",
      id,
      issuer,
      subject,
      metadataHash,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  vcContract.on("CredentialRevoked", (id, issuer, event) => {
    console.log(`🗑️ Credencial revocada: ${id}`);
    callback({
      type: "CredentialRevoked",
      id,
      issuer,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  vcContract.on("IssuerAdded", (account, event) => {
    console.log(`➕ Emisor agregado: ${account}`);
    callback({
      type: "IssuerAdded",
      account,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  vcContract.on("IssuerRemoved", (account, event) => {
    console.log(`➖ Emisor removido: ${account}`);
    callback({
      type: "IssuerRemoved",
      account,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    });
  });
  
  return () => {
    console.log("🔇 Deteniendo escucha de eventos...");
    vcContract.removeAllListeners();
  };
}

export default {
  vcContract,
  issuerAddress,
  issueCredential,
  revokeCredential,
  verifyCredential,
  isAuthorizedIssuer,
  getContractOwner,
  addIssuer,
  removeIssuer,
  checkContractHealth,
  listenToCredentialEvents
};
