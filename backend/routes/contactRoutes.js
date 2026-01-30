/**
 * Contact Routes for VIGILX
 * CRUD operations for emergency contacts
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { validateContact } = require('../middleware/validator');
const logger = require('../utils/logger');

/**
 * GET /api/contacts
 * Get all emergency contacts
 */
router.get('/', (req, res) => {
    const { dashboard_type } = req.query;

    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    if (dashboard_type) {
        sql += ' AND dashboard_type = ?';
        params.push(dashboard_type);
    }

    sql += ' ORDER BY priority ASC, created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            logger.error(`Failed to get contacts: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, contacts: rows || [] });
    });
});

/**
 * POST /api/contacts
 * Add new emergency contact
 */
router.post('/', validateContact, (req, res) => {
    const { name, phone_number, priority, enabled, dashboard_type } = req.body;

    const sql = `INSERT INTO contacts (name, phone_number, priority, enabled, dashboard_type)
                 VALUES (?, ?, ?, ?, ?)`;

    const params = [
        name,
        phone_number,
        priority || 1,
        enabled !== false ? 1 : 0,
        dashboard_type || 'commercial'
    ];

    db.run(sql, params, function (err) {
        if (err) {
            logger.error(`Failed to add contact: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
        logger.info(`Contact added: ${name} (${phone_number})`);
        res.json({
            success: true,
            contactId: this.lastID,
            message: 'Emergency contact added successfully'
        });
    });
});

/**
 * PUT /api/contacts/:id
 * Update contact
 */
router.put('/:id', validateContact, (req, res) => {
    const { name, phone_number, priority, enabled } = req.body;
    const { id } = req.params;

    const sql = `UPDATE contacts 
                 SET name = ?, phone_number = ?, priority = ?, enabled = ?
                 WHERE id = ?`;

    db.run(sql, [name, phone_number, priority || 1, enabled ? 1 : 0, id], function (err) {
        if (err) {
            logger.error(`Failed to update contact: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        res.json({
            success: true,
            message: 'Contact updated successfully'
        });
    });
});

/**
 * DELETE /api/contacts/:id
 * Delete contact
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM contacts WHERE id = ?', [id], function (err) {
        if (err) {
            logger.error(`Failed to delete contact: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, error: 'Contact not found' });
        }
        logger.info(`Contact deleted: ID ${id}`);
        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });
    });
});

module.exports = router;
