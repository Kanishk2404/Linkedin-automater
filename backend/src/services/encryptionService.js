const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
    
    if (!this.ENCRYPTION_SECRET || this.ENCRYPTION_SECRET.length !== 64) {
      throw new Error('ENCRYPTION_SECRET must be set in .env and be 64 hex characters (32 bytes) long.');
    }
  }

  // Encrypt text
  encrypt(text) {
    if (!text || typeof text !== 'string') {
      return null;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc', 
        Buffer.from(this.ENCRYPTION_SECRET, 'hex'), 
        iv
      );
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  // Decrypt text
  decrypt(text) {
    if (!text || typeof text !== 'string') {
      return text; // Return as-is if not encrypted
    }

    // Check if text is already decrypted (doesn't contain colon)
    if (!text.includes(':')) {
      return text;
    }

    try {
      const [ivHex, encrypted] = text.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc', 
        Buffer.from(this.ENCRYPTION_SECRET, 'hex'), 
        iv
      );
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return text; // Return original text if decryption fails
    }
  }

  // Check if text is encrypted
  isEncrypted(text) {
    return text && typeof text === 'string' && text.includes(':') && text.length > 40;
  }

  // Maybe decrypt - only decrypt if it looks encrypted
  maybeDecrypt(key) {
    if (this.isEncrypted(key)) {
      return this.decrypt(key);
    }
    return key;
  }
}

module.exports = new EncryptionService(); 