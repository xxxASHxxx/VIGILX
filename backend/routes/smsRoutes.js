/**
 * SMS Routes for VIGILX
 * Handles SMS testing and logs
 */
const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * POST /api/sms/test
 * Send test SMS
 */
router.post('/test', async (req, res) => {
    try {
        const { phone_number } = req.body;

        if (!phone_number) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        // Validate phone number format
        if (!/^\+[1-9]\d{9,14}$/.test(phone_number)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Use +CountryCode format'
            });
        }

        const result = await twilioService.sendTestSMS(phone_number);
        res.json(result);
    } catch (error) {
        logger.error(`Test SMS error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/sms/logs
 * Get SMS logs
 */
router.get('/logs', (req, res) => {
    const { limit = 50 } = req.query;

    const sql = `SELECT sl.*, a.device_name, a.timestamp as alert_timestamp
                 FROM sms_logs sl
                 LEFT JOIN alerts a ON sl.alert_id = a.id
                 ORDER BY sl.sent_at DESC
                 LIMIT ?`;

    db.all(sql, [parseInt(limit)], (err, rows) => {
        if (err) {
            logger.error(`Failed to get SMS logs: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, logs: rows || [] });
    });
});

module.exports = router;
