import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class VaultCryptoService {
  private getMasterKey(): Buffer {
    const rawKey =
      process.env.MASTER_ENCRYPTION_KEY ||
      '75d593696c9731f4bcb1d25524d518e1b4fbed1eac4b216f39ded98da419ccd9';
    return Buffer.from(rawKey.padEnd(64, '0').slice(0, 64), 'hex');
  }

  /**
   * AES-256-GCM Encryption with 96-bit IV and 128-bit auth tag.
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const key = this.getMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * AES-256-GCM Decryption
   */
  decrypt(ciphertextString: string): string {
    if (!ciphertextString || !ciphertextString.includes(':')) return '';
    const [ivHex, authTagHex, encryptedHex] = ciphertextString.split(':');
    const key = this.getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * Masks sensitive credentials for UI previews (e.g. AIzaSy••••••9Q2a)
   */
  maskKey(key: string): string {
    if (!key || key.length < 10) return '••••••••';
    return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
  }
}
