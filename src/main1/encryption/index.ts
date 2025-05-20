import crypto from 'crypto';

export const algorithm = 'aes-256-cbc';

export class EncryptionService {
  private secretKey: Buffer;

  constructor(secret: string) {
    this.secretKey = crypto
      .createHash('sha256')
      .update(secret)
      .digest();
  }

  encrypt(text: string): string {
    if (!text || text.trim() === '' || text === 'undefined' || text === 'null') {
      return '';
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    if (!encrypted || typeof encrypted !== 'string' || encrypted.trim() === '' ||
        encrypted === 'undefined' || encrypted === 'null') {
      return '';
    }

    const parts = encrypted.split(':');
    if (parts.length !== 2) return '';

    const [ivHex, encryptedText] = parts;
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex) || !encryptedText || encryptedText.trim() === '') {
      return '';
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      if (iv.length !== 16) return '';

      const decipher = crypto.createDecipheriv(algorithm, this.secretKey, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }
}
