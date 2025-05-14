const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Apply auth middleware to all chatbot routes
router.use(auth);

// Endpoint xử lý tin nhắn
router.post('/message', chatController.processMessage);

// Endpoint lấy lịch sử chat
router.get('/history/:userId', chatController.getChatHistory);

// Endpoint cập nhật thông tin người dùng
router.put('/user/:userId', chatController.updateUser);

// Endpoint lấy sản phẩm gợi ý
router.get('/recommendations', chatController.getRecommendations);

// Endpoint lấy thông tin chi tiết sản phẩm
router.get('/product/:productId', chatController.getProductDetails);

// Endpoint lấy các sản phẩm tương tự
router.get('/similar-products', chatController.getSimilarProducts);

// Debug middleware for cart routes
router.use('/cart*', (req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.originalUrl}`, req.params, req.body);
    next();
});

// Endpoint thêm sản phẩm vào giỏ hàng
router.post('/cart', chatController.addToCart);

// Endpoint lấy thông tin giỏ hàng
router.get('/cart', chatController.getCart);

// Endpoint cập nhật số lượng sản phẩm trong giỏ hàng
router.put('/cart/update', chatController.updateCartItem);

// Endpoint xóa sản phẩm khỏi giỏ hàng
router.delete('/cart/remove', chatController.removeCartItem);

// Endpoint for payment cart
router.post('/cart/payment', chatController.paymentCart);

// Endpoint for MoMo callback
router.post('/momo/callback', chatController.momoCallback);

// Endpoint for checking MoMo transaction status
router.post('/momo/check-status', chatController.checkMomoTransactionStatus);

module.exports = router;
