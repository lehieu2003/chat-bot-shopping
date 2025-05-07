const express = require('express');
const router = express.Router();

// Simple test endpoint to verify API connectivity
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API test successful',
        timestamp: new Date().toISOString()
    });
});

// Test cart endpoint
router.post('/cart-test', (req, res) => {
    const { userId, productId } = req.body;
    res.json({
        success: true,
        message: 'Cart test successful',
        receivedData: { userId, productId },
        cartCount: 1
    });
});

// Test cart GET endpoint
router.get('/cart-test/:userId', (req, res) => {
    const { userId } = req.params;
    res.json({
        success: true,
        message: 'Cart GET test successful',
        userId,
        cartCount: 1,
        cart: [{
            product: {
                _id: '123456789',
                name: 'Test Product',
                price: 100000,
            },
            quantity: 1
        }]
    });
});

module.exports = router;
