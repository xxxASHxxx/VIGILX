/**
 * Simulation Routes for VIGILX
 * Handles drowsiness alert simulation endpoints
 */
const express = require('express');
const router = express.Router();
const simulationService = require('../services/simulationService');
const { validateSimulation } = require('../middleware/validator');

/**
 * POST /api/simulation/trigger
 * Trigger a simulated drowsiness alert
 */
router.post('/trigger', validateSimulation, async (req, res) => {
    try {
        const result = await simulationService.simulateDrowsinessAlert(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/simulation/alerts
 * Get recent alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { limit = 50, dashboard_type } = req.query;
        const alerts = await simulationService.getRecentAlerts(parseInt(limit), dashboard_type);
        res.json({
            success: true,
            count: alerts.length,
            alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
