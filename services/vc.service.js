// services/vc.service.js
import { q } from "../db/index.js";
import { vcContract, issuerAddress, issueCredential } from "../blockchain/contract.js";
import { encryptJSON, keccak256Of } from "../utils/crypto.js";

export async function issueUserVC({ user, kycSession, schema, claims }) {
  // 1) Armar metadatos (off-chain), cifrarlos y calcular hash
  const metadata = {
    schema, // p.ej. "cate/v1/identity"
    subject: { ethAddress: user.eth_address, userId: user.id },
    issuer: { ethAddress: issuerAddress },
    kycRef: { provider: kycSession.provider, sessionId: kycSession.provider_session_id },
    claims, // atributos verificados
    issuedAt: new Date().toISOString()
  };

  const metadataHash = await keccak256Of(metadata); // bytes32 0x...
  const ciphertext = encryptJSON(metadata);

  // 2) Emitir on-chain
  const blockchainResult = await issueCredential(user.eth_address, metadataHash);

  // 3) Persistir en DB
  const { rows } = await q(
    `INSERT INTO credential
      (user_id, subject_address, issuer_address, onchain_id, metadata_hash, metadata_ciphertext, schema, status, kyc_session_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8)
     RETURNING *`,
    [
      user.id,
      user.eth_address,
      issuerAddress,
      blockchainResult.credentialId,
      metadataHash,
      ciphertext,
      schema,
      kycSession.id
    ]
  );
  
  return { 
    credential: rows[0], 
    txHash: blockchainResult.txHash,
    metadata: metadata
  };
}

export async function revokeUserVC(credentialId) {
  try {
    // 1) Revocar en blockchain
    await vcContract.revokeCredential(credentialId);
    
    // 2) Actualizar en DB
    const { rows } = await q(
      "UPDATE credential SET status='revoked', updated_at=now() WHERE onchain_id=$1 RETURNING *",
      [credentialId]
    );
    
    return { 
      success: true, 
      credential: rows[0],
      revokedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to revoke credential: ${error.message}`);
  }
}

export async function getUserCredentials(userId) {
  const { rows } = await q(
    `SELECT c.*, ks.provider as kyc_provider, ks.status as kyc_status
     FROM credential c
     LEFT JOIN kyc_session ks ON c.kyc_session_id = ks.id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );
  
  return rows;
}

export async function getCredentialByOnchainId(onchainId) {
  try {
    // 1) Obtener datos on-chain
    const onchainData = await vcContract.verifyCredential(onchainId);
    
    // 2) Obtener datos off-chain
    const { rows } = await q(
      `SELECT c.*, ks.provider as kyc_provider, ks.status as kyc_status
       FROM credential c
       LEFT JOIN kyc_session ks ON c.kyc_session_id = ks.id
       WHERE c.onchain_id = $1`,
      [onchainId]
    );
    
    return {
      onchain: {
        issuer: onchainData[0],
        subject: onchainData[1],
        metadataHash: onchainData[2],
        revoked: onchainData[3],
        issuedAt: Number(onchainData[4])
      },
      offchain: rows[0] || null
    };
  } catch (error) {
    throw new Error(`Credential not found: ${error.message}`);
  }
}

export async function verifyCredentialIntegrity(onchainId) {
  try {
    // 1) Obtener datos on-chain
    const onchainData = await vcContract.verifyCredential(onchainId);
    
    // 2) Obtener datos off-chain
    const { rows } = await q(
      "SELECT * FROM credential WHERE onchain_id = $1",
      [onchainId]
    );
    
    if (!rows.length) {
      return {
        valid: false,
        error: "Credential not found in database"
      };
    }
    
    const offchainData = rows[0];
    
    // 3) Verificar que el hash coincide
    const hashMatch = onchainData[2] === offchainData.metadata_hash;
    
    // 4) Verificar que no está revocada
    const notRevoked = !onchainData[3] && offchainData.status === 'active';
    
    // 5) Verificar que el emisor está autorizado
    const issuerAuthorized = await vcContract.isAuthorizedIssuer(onchainData[0]);
    
    return {
      valid: hashMatch && notRevoked && issuerAuthorized,
      hashMatch,
      notRevoked,
      issuerAuthorized,
      onchainData: {
        issuer: onchainData[0],
        subject: onchainData[1],
        metadataHash: onchainData[2],
        revoked: onchainData[3],
        issuedAt: Number(onchainData[4])
      },
      offchainData: offchainData
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

export async function getCredentialStats() {
  const { rows } = await q(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked,
      COUNT(CASE WHEN kyc_session_id IS NOT NULL THEN 1 END) as with_kyc
    FROM credential
  `);
  
  return rows[0];
}
