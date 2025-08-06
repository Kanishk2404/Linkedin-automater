const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../../logs');
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  }

  writeToFile(filename, message) {
    try {
      const filePath = path.join(this.logsDir, filename);
      fs.appendFileSync(filePath, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, meta = null) {
    const formattedMessage = this.formatMessage('info', message, meta);
    console.log(formattedMessage.trim());
    this.writeToFile('app.log', formattedMessage);
  }

  error(message, error = null, meta = null) {
    const errorMeta = error ? { ...meta, error: error.message, stack: error.stack } : meta;
    const formattedMessage = this.formatMessage('error', message, errorMeta);
    console.error(formattedMessage.trim());
    this.writeToFile('error.log', formattedMessage);
    this.writeToFile('app.log', formattedMessage);
  }

  warn(message, meta = null) {
    const formattedMessage = this.formatMessage('warn', message, meta);
    console.warn(formattedMessage.trim());
    this.writeToFile('app.log', formattedMessage);
  }

  debug(message, meta = null) {
    if (process.env.NODE_ENV !== 'production') {
      const formattedMessage = this.formatMessage('debug', message, meta);
      console.log(formattedMessage.trim());
      this.writeToFile('debug.log', formattedMessage);
    }
  }

  // Log API requests
  apiRequest(method, url, userId = null, duration = null) {
    const meta = { method, url, userId, duration };
    this.info(`API Request: ${method} ${url}`, meta);
    this.writeToFile('api.log', this.formatMessage('api', `${method} ${url}`, meta));
  }

  // Log LinkedIn API calls
  linkedinAPI(action, success, error = null, meta = null) {
    const logMeta = { action, success, ...meta };
    if (success) {
      this.info(`LinkedIn API: ${action} - Success`, logMeta);
    } else {
      this.error(`LinkedIn API: ${action} - Failed`, error, logMeta);
    }
    this.writeToFile('linkedin.log', this.formatMessage('linkedin', `${action} - ${success ? 'Success' : 'Failed'}`, logMeta));
  }

  // Log scheduled post operations
  scheduledPost(action, postId, success, error = null) {
    const meta = { postId, success };
    if (success) {
      this.info(`Scheduled Post: ${action} - Success`, meta);
    } else {
      this.error(`Scheduled Post: ${action} - Failed`, error, meta);
    }
  }

  // Log authentication events
  auth(action, userId, success, error = null) {
    const meta = { userId, success };
    if (success) {
      this.info(`Auth: ${action} - Success`, meta);
    } else {
      this.warn(`Auth: ${action} - Failed`, { ...meta, error: error?.message });
    }
    this.writeToFile('auth.log', this.formatMessage('auth', `${action} - ${success ? 'Success' : 'Failed'}`, meta));
  }
}

module.exports = new Logger();
