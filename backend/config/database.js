/**
 * SQLite Database Connection for VIGILX
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'vigilx.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[Database] Connection error:', err.message);
    } else {
        console.log('[Database] Connected to SQLite database');
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

module.exports = db;
