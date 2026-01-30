/**
 * Error Handler Middleware for VIGILX
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(`Error: ${err.message}`);

    if (process.env.NODE_ENV === 'development') {
        logger.error(err.stack);
    }

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
