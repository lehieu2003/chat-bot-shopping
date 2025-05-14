const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Process messages - POST /api/chatbot/message
router.post('/message', auth, chatController.processMessage);

// Get chat history - GET /api/chatbot/history/:userId
router.get('/history/:userId', auth, chatController.getChatHistory);

// Update user preferences - PUT /api/chatbot/user/:userId
router.put('/user/:userId', auth, chatController.updateUser);

// Get product recommendations - GET /api/chatbot/recommendations
router.get('/recommendations', auth, chatController.getRecommendations);

// Get product details - GET /api/chatbot/product/:productId
router.get('/product/:productId', auth, chatController.getProductDetails);

// Get similar products - GET /api/chatbot/similar-products
router.get('/similar-products', auth, chatController.getSimilarProducts);

// Add to cart - POST /api/chatbot/cart
router.post('/cart', auth, chatController.addToCart);

// Get cart contents - GET /api/chatbot/cart
router.get('/cart', auth, chatController.getCart);

// Update cart item - PUT /api/chatbot/cart/update
router.put('/cart/update', auth, chatController.updateCartItem);

// Remove cart item - DELETE /api/chatbot/cart/remove
router.delete('/cart/remove', auth, chatController.removeCartItem);

module.exports = router;
