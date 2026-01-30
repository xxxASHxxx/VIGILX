/**
 * VIGILX SMS Alert Backend Server
 * Provides SMS notification services for drowsiness detection alerts
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import services
const twilioService = require('./services/twilioService');

// Import routes
const simulationRoutes = require('./routes/simulationRoutes');
const contactRoutes = require('./routes/contactRoutes');
const smsRoutes = require('./routes/smsRoutes');

// Import middleware and utils
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import database initialization
const initDatabase = require('./database/init');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - max 10 SMS requests per minute per IP
const smsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        success: false,
        error: 'Too many SMS requests. Please wait before trying again.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Request validation middleware
const validateSmsRequest = (req, res, next) => {
    const { phoneNumber, message, alertType, timestamp, source, dashboardType } = req.body;

    // Required fields validation
    if (!phoneNumber) {
        return res.status(400).json({
            success: false,
            error: 'Phone number is required',
            code: 'MISSING_PHONE_NUMBER'
        });
    }

    // Phone number format validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
            code: 'INVALID_PHONE_FORMAT'
        });
    }

    if (!alertType) {
        return res.status(400).json({
            success: false,
            error: 'Alert type is required',
            code: 'MISSING_ALERT_TYPE'
        });
    }

    // Sanitize inputs
    req.sanitizedBody = {
        phoneNumber: phoneNumber.trim(),
        message: message ? message.trim().substring(0, 500) : null,
        alertType: alertType.trim(),
        timestamp: timestamp || new Date().toISOString(),
        source: source ? source.trim() : 'Unknown',
        dashboardType: dashboardType ? dashboardType.trim() : 'Unknown'
    };

    next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        twilioConfigured: twilioService.isConfigured()
    });
});

// API Routes
app.use('/api/simulation', simulationRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/sms', smsRoutes);

// Send SMS endpoint
app.post('/api/send-sms', smsLimiter, validateSmsRequest, async (req, res) => {
    try {
        const { phoneNumber, message, alertType, timestamp, source, dashboardType } = req.sanitizedBody;

        console.log(`[${new Date().toISOString()}] SMS Request - To: ${phoneNumber}, Source: ${source}, Type: ${dashboardType}`);

        const result = await twilioService.sendAlertSMS({
            to: phoneNumber,
            alertType,
            timestamp,
            source,
            dashboardType,
            customMessage: message
        });

        if (result.success) {
            console.log(`[${new Date().toISOString()}] SMS Sent Successfully - SID: ${result.messageSid}`);
            res.json({
                success: true,
                messageSid: result.messageSid,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error(`[${new Date().toISOString()}] SMS Failed - Error: ${result.error}`);
            res.status(500).json({
                success: false,
                error: result.error,
                code: result.code || 'SMS_SEND_FAILED'
            });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Server Error:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error while sending SMS',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Test SMS endpoint (for configuration verification)
app.post('/api/test-sms', smsLimiter, validateSmsRequest, async (req, res) => {
    try {
        const { phoneNumber } = req.sanitizedBody;

        const result = await twilioService.sendTestSMS(phoneNumber);

        if (result.success) {
            res.json({
                success: true,
                message: 'Test SMS sent successfully',
                messageSid: result.messageSid
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
                code: result.code || 'TEST_SMS_FAILED'
            });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Test SMS Error:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to send test SMS',
            code: 'INTERNAL_ERROR'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled Error:`, err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
    });
});

// Initialize database and start server
(async () => {
    try {
        // Initialize database
        await initDatabase();
        logger.info('Database initialized successfully');

        // Start server
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════╗
║          VIGILX SMS Alert Server                         ║
╠══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                             ║
║  Health check: http://localhost:${PORT}/api/health          ║
║  Twilio configured: ${twilioService.isConfigured() ? 'Yes ✓' : 'No ✗ (check .env)'}                          ║
║  Database: SQLite ✓                                      ║
║  New endpoints: /api/simulation, /api/contacts           ║
╚══════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
})();

module.exports = app;
