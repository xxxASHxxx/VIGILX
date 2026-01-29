/**
 * Twilio SMS Service for VIGILX
 * Handles all Twilio API interactions for sending SMS alerts
 */

// Initialize Twilio client (will be null if credentials not configured)
let twilioClient = null;

const initializeTwilio = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken &&
        accountSid !== 'your_account_sid_here' &&
        authToken !== 'your_auth_token_here') {
        try {
            twilioClient = require('twilio')(accountSid, authToken);
            console.log('[TwilioService] Client initialized successfully');
            return true;
        } catch (error) {
            console.error('[TwilioService] Failed to initialize:', error.message);
            return false;
        }
    }
    console.warn('[TwilioService] Credentials not configured - SMS sending disabled');
    return false;
};

// Initialize on module load
initializeTwilio();

/**
 * Check if Twilio is properly configured
 */
const isConfigured = () => {
    return twilioClient !== null;
};

/**
 * Format alert message based on parameters
 */
const formatAlertMessage = ({ alertType, timestamp, source, dashboardType, customMessage }) => {
    const formattedTime = new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (customMessage) {
        return customMessage;
    }

    return `VIGILX ALERT: Drowsiness detected on ${source} at ${formattedTime}. ` +
        `Dashboard: ${dashboardType}. Please check immediately.`;
};

/**
 * Send SMS with retry logic
 * @param {Object} options - SMS options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.alertType - Type of alert
 * @param {string} options.timestamp - Alert timestamp
 * @param {string} options.source - Detection source (Dashcam/MobileCam/Device)
 * @param {string} options.dashboardType - Dashboard type (Commercial/Private)
 * @param {string} options.customMessage - Optional custom message
 * @returns {Promise<Object>} Result object with success status
 */
const sendAlertSMS = async (options, retryCount = 3) => {
    if (!isConfigured()) {
        return {
            success: false,
            error: 'Twilio is not configured. Please set up your credentials in .env file.',
            code: 'TWILIO_NOT_CONFIGURED'
        };
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
        return {
            success: false,
            error: 'Twilio phone number not configured',
            code: 'MISSING_FROM_NUMBER'
        };
    }

    const message = formatAlertMessage(options);

    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            const result = await twilioClient.messages.create({
                body: message,
                from: fromNumber,
                to: options.to
            });

            return {
                success: true,
                messageSid: result.sid,
                status: result.status
            };
        } catch (error) {
            console.error(`[TwilioService] Attempt ${attempt}/${retryCount} failed:`, error.message);

            // Don't retry for certain error types
            if (error.code === 21211 || // Invalid 'To' phone number
                error.code === 21614 || // 'To' number not verified
                error.code === 21608) { // Unverified 'To' number
                return {
                    success: false,
                    error: `Invalid phone number: ${error.message}`,
                    code: 'INVALID_PHONE_NUMBER'
                };
            }

            if (error.code === 20003) { // Authentication error
                return {
                    success: false,
                    error: 'Twilio authentication failed. Check your credentials.',
                    code: 'AUTH_FAILED'
                };
            }

            // On last attempt, return the error
            if (attempt === retryCount) {
                return {
                    success: false,
                    error: `Failed after ${retryCount} attempts: ${error.message}`,
                    code: error.code || 'SEND_FAILED'
                };
            }

            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
        }
    }
};

/**
 * Send a test SMS to verify configuration
 * @param {string} phoneNumber - Recipient phone number
 * @returns {Promise<Object>} Result object
 */
const sendTestSMS = async (phoneNumber) => {
    return sendAlertSMS({
        to: phoneNumber,
        alertType: 'test',
        timestamp: new Date().toISOString(),
        source: 'Test',
        dashboardType: 'Configuration',
        customMessage: 'VIGILX Test: Your SMS alert configuration is working correctly! 🚗✓'
    });
};

module.exports = {
    isConfigured,
    sendAlertSMS,
    sendTestSMS,
    formatAlertMessage
};
