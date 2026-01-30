/**
 * Simulation Service for VIGILX
 * Handles drowsiness alert simulation without hardware
 */
const db = require('../config/database');
const twilioService = require('./twilioService');
const logger = require('../utils/logger');

class SimulationService {
    /**
     * Simulate a drowsiness alert and optionally send SMS
     */
    async simulateDrowsinessAlert(simulationData) {
        const {
            device_name = 'Web Simulator',
            dashboard_type = 'commercial',
            detection_source = 'simulation',
            confidence_score = 0.95,
            send_sms = true,
            phone_numbers = []
        } = simulationData;

        try {
            // 1. Create alert record in database
            const alertId = await this.createAlert({
                device_id: `SIM-${Date.now()}`,
                device_name,
                alert_type: 'drowsiness',
                timestamp: new Date().toISOString(),
                confidence_score,
                dashboard_type,
                detection_source,
                sms_sent: send_sms && phone_numbers.length > 0 ? 1 : 0,
                acknowledged: 0,
                metadata: JSON.stringify({ simulated: true })
            });

            logger.info(`Simulated alert created with ID: ${alertId}`);

            // 2. Send SMS to all provided phone numbers
            const smsResults = [];

            if (send_sms && phone_numbers.length > 0) {
                for (const phoneNumber of phone_numbers) {
                    const alertData = {
                        to: phoneNumber,
                        alertType: 'drowsiness',
                        timestamp: new Date().toISOString(),
                        source: device_name,
                        dashboardType: dashboard_type,
                        customMessage: this.formatAlertMessage({
                            device_name,
                            timestamp: new Date().toISOString(),
                            confidence_score,
                            dashboard_type,
                            detection_source
                        })
                    };

                    const smsResult = await twilioService.sendAlertSMS(alertData);

                    // Log SMS attempt
                    await this.logSMS({
                        alert_id: alertId,
                        phone_number: phoneNumber,
                        message_body: alertData.customMessage,
                        twilio_sid: smsResult.messageSid || null,
                        status: smsResult.success ? 'sent' : 'failed',
                        error_message: smsResult.error || null
                    });

                    smsResults.push({
                        phoneNumber,
                        success: smsResult.success,
                        messageId: smsResult.messageSid,
                        error: smsResult.error
                    });
                }
            }

            // 3. Update alert with SMS status
            if (send_sms && phone_numbers.length > 0) {
                const allSuccessful = smsResults.every(r => r.success);
                const someSuccessful = smsResults.some(r => r.success);
                let status = 'none';
                if (allSuccessful) status = 'sent';
                else if (someSuccessful) status = 'partial';
                else status = 'failed';

                await this.updateAlertSMSStatus(alertId, status);
            }

            return {
                success: true,
                alertId,
                alert: {
                    id: alertId,
                    device_name,
                    timestamp: new Date().toISOString(),
                    confidence_score,
                    dashboard_type,
                    detection_source
                },
                smsResults,
                message: 'Drowsiness alert simulated successfully'
            };

        } catch (error) {
            logger.error(`Simulation error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Format alert message for SMS
     */
    formatAlertMessage({ device_name, timestamp, confidence_score, dashboard_type, detection_source }) {
        const confidencePercent = (confidence_score * 100).toFixed(1);
        const time = new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        return `🚨 VIGILX ALERT 🚨
Drowsiness Detected!

Device: ${device_name || 'Unknown'}
Type: ${dashboard_type} - ${detection_source}
Time: ${time}
Confidence: ${confidencePercent}%

⚠️ Please check on the driver immediately!`;
    }

    /**
     * Create alert in database
     */
    async createAlert(alertData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO alerts 
                (device_id, device_name, alert_type, timestamp, confidence_score, 
                 dashboard_type, detection_source, sms_sent, acknowledged, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const params = [
                alertData.device_id,
                alertData.device_name,
                alertData.alert_type,
                alertData.timestamp,
                alertData.confidence_score,
                alertData.dashboard_type,
                alertData.detection_source,
                alertData.sms_sent,
                alertData.acknowledged,
                alertData.metadata
            ];

            db.run(sql, params, function (err) {
                if (err) {
                    logger.error(`Failed to create alert: ${err.message}`);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Log SMS send attempt
     */
    async logSMS(smsData) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO sms_logs 
                (alert_id, phone_number, message_body, twilio_sid, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?)`;

            const params = [
                smsData.alert_id,
                smsData.phone_number,
                smsData.message_body,
                smsData.twilio_sid,
                smsData.status,
                smsData.error_message
            ];

            db.run(sql, params, function (err) {
                if (err) {
                    logger.error(`Failed to log SMS: ${err.message}`);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Update alert SMS status
     */
    async updateAlertSMSStatus(alertId, status) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE alerts SET sms_status = ? WHERE id = ?`;
            db.run(sql, [status, alertId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Get recent alerts
     */
    async getRecentAlerts(limit = 50, dashboardType = null) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM alerts`;
            const params = [];

            if (dashboardType) {
                sql += ` WHERE dashboard_type = ?`;
                params.push(dashboardType);
            }

            sql += ` ORDER BY timestamp DESC LIMIT ?`;
            params.push(limit);

            db.all(sql, params, (err, rows) => {
                if (err) {
                    logger.error(`Failed to get alerts: ${err.message}`);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
}

module.exports = new SimulationService();
