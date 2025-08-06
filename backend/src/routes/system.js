const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { User } = require('../models');
const { testDatabaseConnection } = require('../models/index');

// System health check
router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  try {
    // Database connectivity check
    await testDatabaseConnection();
    health.checks.database = { 
      status: 'OK', 
      responseTime: Date.now() 
    };
  } catch (error) {
    health.checks.database = { 
      status: 'ERROR', 
      error: error.message 
    };
    health.status = 'DEGRADED';
  }

  // Memory usage check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'OK' : 'WARNING', // 500MB threshold
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };

  // Environment variables check
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  health.checks.environment = {
    status: missingVars.length === 0 ? 'OK' : 'ERROR',
    missingVariables: missingVars
  };

  if (missingVars.length > 0) {
    health.status = 'ERROR';
  }

  // Log health check
  logger.info('Health check performed', health);

  // Return appropriate status code
  const statusCode = health.status === 'OK' ? 200 : 
                     health.status === 'DEGRADED' ? 503 : 500;

  res.status(statusCode).json(health);
});

// Detailed system info (protected endpoint)
router.get('/system', async (req, res) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      }
    };

    // Database statistics
    try {
      const userCount = await User.count();
      systemInfo.database = {
        status: 'connected',
        userCount
      };
    } catch (error) {
      systemInfo.database = {
        status: 'error',
        error: error.message
      };
    }

    logger.info('System info requested', { requestIp: req.ip });
    res.json(systemInfo);

  } catch (error) {
    logger.error('System info error', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve system information'
    });
  }
});

module.exports = router;
