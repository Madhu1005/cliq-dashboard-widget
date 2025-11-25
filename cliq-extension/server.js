/**
 * Main Express Server for Zoho Cliq Extension
 * 
 * Routes:
 * - POST /bot/webhook - Bot message handler
 * - POST /commands/team-mood - Slash command handler
 * - POST /actions/analyze - Message action: analyze sentiment
 * - POST /actions/suggest-reply - Message action: suggest reply
 * - GET /widgets/dashboard - Widget dashboard (serves HTML)
 * - GET /health - Health check endpoint
 * 
 * Environment Variables:
 * - PORT: Server port (default: 3000)
 * - BACKEND_API_URL: FastAPI backend URL
 * - ZOHO_VERIFICATION_TOKEN: Zoho webhook verification token
 * - STRESS_THRESHOLD: High stress alert threshold (default: 7)
 * - ADMIN_ALERT_CHANNEL: Channel ID for admin alerts
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { createWebhookHandler } = require('./bot/webhook_handler');
const { createCommandHandler } = require('./commands/team_mood');
const APIClient = require('./utils/api_client');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { text: '⚠️ Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 analysis requests per minute
  message: { text: '⚠️ Analysis rate limit exceeded. Wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Middleware
// CORS only for widget endpoints, Zoho domains only
app.use('/widgets', cors({
  origin: [
    'https://cliq.zoho.com',
    'https://cliq.zoho.eu',
    'https://cliq.zoho.in'
  ],
  credentials: true
}));

// Body parsing with size limits (prevent DoS)
app.use(bodyParser.json({ limit: '200kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '200kb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Initialize API client
const apiClient = new APIClient();

// ==================== ROUTES ====================

/**
 * Bot webhook endpoint
 * Handles all incoming messages from Zoho Cliq
 */
app.post('/bot/webhook', analysisLimiter, createWebhookHandler());

/**
 * Slash command: /team-mood
 * Returns team sentiment statistics
 */
app.post('/commands/team-mood', createCommandHandler());

/**
 * Message action: Analyze Sentiment
 * Right-click context menu on any message
 */
app.post('/actions/analyze', analysisLimiter, async (req, res) => {
  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ text: '⚠️ Invalid request format' });
    }

    const { message, user, channel } = req.body;
    
    // Validate message exists
    if (!message || typeof message.text !== 'string' || !message.text.trim()) {
      return res.status(400).json({ text: '⚠️ No message text provided' });
    }

    // Validate message length
    if (message.text.length > 5000) {
      return res.status(400).json({ text: '⚠️ Message too long (max 5000 chars)' });
    }
    
    const analysis = await apiClient.analyzeMessage({
      message: message.text.trim(),
      user_id: user?.id || 'unknown',
      channel_id: channel?.id || 'unknown',
    });

    res.json({
      text: 'Analysis Complete',
      card: {
        title: '🔍 Sentiment Analysis',
        sections: [
          {
            elements: [
              { type: 'text', text: `**Sentiment:** ${analysis.sentiment}` },
              { type: 'text', text: `**Emotion:** ${analysis.emotion}` },
              { type: 'text', text: `**Stress:** ${analysis.stress_score}/10` },
              { type: 'text', text: `**Category:** ${analysis.category}` },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error('[Action] Analyze error:', error);
    res.json({ text: '⚠️ Analysis failed. Please try again.' });
  }
});

/**
 * Message action: Suggest Reply
 * Provides AI-generated empathetic response
 */
app.post('/actions/suggest-reply', analysisLimiter, async (req, res) => {
  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ text: '⚠️ Invalid request format' });
    }

    const { message } = req.body;
    
    // Validate message exists
    if (!message || typeof message.text !== 'string' || !message.text.trim()) {
      return res.status(400).json({ text: '⚠️ No message text provided' });
    }

    // Validate message length
    if (message.text.length > 5000) {
      return res.status(400).json({ text: '⚠️ Message too long (max 5000 chars)' });
    }
    
    const analysis = await apiClient.analyzeMessage({
      message: message.text.trim(),
    });

    res.json({
      text: '💡 Suggested Reply',
      card: {
        title: 'Suggested Response',
        sections: [
          {
            elements: [
              { type: 'text', text: `_"${analysis.suggested_reply}"_` },
            ],
          },
        ],
        buttons: [
          {
            label: '📤 Send Reply',
            type: 'invoke.function',
            name: 'sendReply',
            data: { reply: analysis.suggested_reply },
          },
        ],
      },
    });
  } catch (error) {
    console.error('[Action] Suggest reply error:', error);
    res.json({ text: '⚠️ Unable to generate suggestion. Please try again.' });
  }
});

/**
 * Widget: Dashboard
 * Serves the team sentiment dashboard
 */
app.get('/widgets/dashboard', (req, res) => {
  // TODO: Serve actual dashboard HTML with charts
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Team Sentiment Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .dashboard { background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <div class="dashboard">
        <h1>📊 Team Sentiment Dashboard</h1>
        <p>Dashboard implementation coming soon...</p>
        <p>This will display:</p>
        <ul>
          <li>Real-time sentiment charts</li>
          <li>Stress level trends</li>
          <li>Top issues breakdown</li>
          <li>Individual team member insights</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

/**
 * Health check endpoint
 * Verifies server and backend connectivity
 */
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('./package.json').version,
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // Check backend connectivity
  try {
    const backendStart = Date.now();
    const backendHealthy = await apiClient.healthCheck();
    health.checks.backend = {
      status: backendHealthy ? 'up' : 'down',
      responseTime: Date.now() - backendStart,
      url: process.env.BACKEND_API_URL
    };
    if (!backendHealthy) health.status = 'degraded';
  } catch (error) {
    health.status = 'degraded';
    health.checks.backend = {
      status: 'error',
      error: error.message
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'ok' : 'warning',
    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
  };

  // Check configuration
  health.checks.config = {
    status: process.env.BACKEND_API_URL && process.env.ZOHO_VERIFICATION_TOKEN ? 'ok' : 'warning',
    backendConfigured: !!process.env.BACKEND_API_URL,
    tokenConfigured: !!process.env.ZOHO_VERIFICATION_TOKEN
  };

  const responseTime = Date.now() - startTime;
  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({ ...health, responseTime: `${responseTime}ms` });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Zoho Cliq Extension - Sentiment Analysis Bot',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      webhook: '/bot/webhook',
      command: '/commands/team-mood',
      actions: ['/actions/analyze', '/actions/suggest-reply'],
      widget: '/widgets/dashboard',
      health: '/health',
    },
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==================== SERVER START ====================

// Validate configuration on startup
async function validateSetup() {
  console.log('🔍 Validating configuration...');
  
  if (!process.env.BACKEND_API_URL) {
    console.error('❌ BACKEND_API_URL is not set!');
    process.exit(1);
  }

  if (!process.env.ZOHO_VERIFICATION_TOKEN) {
    console.warn('⚠️  ZOHO_VERIFICATION_TOKEN is not set - webhook security disabled!');
  }

  try {
    await apiClient.validateConfig();
    console.log('✅ Backend connection verified');
  } catch (error) {
    console.error('❌ Backend validation failed:', error.message);
    console.warn('⚠️  Starting server anyway, but functionality will be limited');
  }
}

// Start server
let server;

async function startServer() {
  await validateSetup();
  server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log(`🤖 Zoho Cliq Extension Server Running`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Backend: ${process.env.BACKEND_API_URL}`);
    console.log('🛠️  Endpoints:');
    console.log(`   - Webhook:  POST http://localhost:${PORT}/bot/webhook`);
    console.log(`   - Command:  POST http://localhost:${PORT}/commands/team-mood`);
    console.log(`   - Health:   GET  http://localhost:${PORT}/health`);
    console.log('============================================');
    console.log('');
  });
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30s
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
