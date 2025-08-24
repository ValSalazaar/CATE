// utils/crypto.js
import crypto from "crypto";
import { config } from "../config/env.js";

const key = Buffer.from(config.crypto.key, "hex");

export function encryptJSON(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64"); // iv|cipher|tag
}

export function decryptJSON(ciphertext) {
  try {
    const data = Buffer.from(ciphertext, "base64");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(data.length - 16);
    const encrypted = data.subarray(12, data.length - 16);
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (error) {
    throw new Error("Failed to decrypt data: " + error.message);
  }
}

export async function keccak256Of(obj) {
  // Normaliza JSON: ordena claves determinísticamente
  const stable = JSON.stringify(sortKeys(obj));
  const { keccak256, toUtf8Bytes } = await import("ethers");
  return keccak256(toUtf8Bytes(stable)); // 0x... bytes32
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, k) => {
      acc[k] = sortKeys(value[k]);
      return acc;
    }, {});
  }
  return value;
}

export function generateRandomHex(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

export function hashString(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function verifyHash(input, hash) {
  return hashString(input) === hash;
}
