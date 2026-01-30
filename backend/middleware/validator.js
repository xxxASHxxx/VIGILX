/**
 * Request Validation Middleware for VIGILX
 */

const validateSimulation = (req, res, next) => {
    const { phone_numbers } = req.body;

    if (phone_numbers && !Array.isArray(phone_numbers)) {
        return res.status(400).json({
            success: false,
            error: 'phone_numbers must be an array'
        });
    }

    if (phone_numbers) {
        for (const number of phone_numbers) {
            if (!/^\+[1-9]\d{9,14}$/.test(number)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid phone number format: ${number}. Use +CountryCode format (e.g., +919876543210)`
                });
            }
        }
    }

    next();
};

const validateContact = (req, res, next) => {
    const { name, phone_number } = req.body;

    if (!name || !phone_number) {
        return res.status(400).json({
            success: false,
            error: 'Name and phone_number are required'
        });
    }

    if (!/^\+[1-9]\d{9,14}$/.test(phone_number)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid phone number format. Use +CountryCode format (e.g., +919876543210)'
        });
    }

    next();
};

module.exports = { validateSimulation, validateContact };
