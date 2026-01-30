/**
 * Database Initialization for VIGILX
 * Creates all required tables
 */
const db = require('../config/database');

const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const schema = `
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                device_name TEXT,
                alert_type TEXT DEFAULT 'drowsiness',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                confidence_score REAL,
                dashboard_type TEXT,
                detection_source TEXT,
                sms_sent INTEGER DEFAULT 0,
                sms_status TEXT,
                acknowledged INTEGER DEFAULT 0,
                metadata TEXT
            );

            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                enabled INTEGER DEFAULT 1,
                dashboard_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                device_name TEXT,
                device_type TEXT,
                status TEXT DEFAULT 'online',
                dashboard_type TEXT,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sms_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER,
                phone_number TEXT,
                message_body TEXT,
                twilio_sid TEXT,
                status TEXT,
                error_message TEXT,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(alert_id) REFERENCES alerts(id)
            );

            CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
            CREATE INDEX IF NOT EXISTS idx_alerts_dashboard ON alerts(dashboard_type);
            CREATE INDEX IF NOT EXISTS idx_contacts_dashboard ON contacts(dashboard_type);
        `;

        db.exec(schema, (err) => {
            if (err) {
                console.error('[Database] Schema initialization failed:', err.message);
                reject(err);
            } else {
                console.log('[Database] Schema initialized successfully');
                resolve();
            }
        });
    });
};

module.exports = initDatabase;
