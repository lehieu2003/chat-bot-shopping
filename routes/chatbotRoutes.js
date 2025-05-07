const express = require('express');
const router = express.Router();
const chatbotService = require('../services/chatbotService');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Log available routes when the module loads
console.log('Available chatbot routes:');
console.log('- POST /api/chatbot/message');
console.log('- GET /api/chatbot/history/:userId');
console.log('- PUT /api/chatbot/user/:userId');
console.log('- GET /api/chatbot/recommendations');
console.log('- GET /api/chatbot/product/:productId');
console.log('- GET /api/chatbot/similar-products');
console.log('- POST /api/chatbot/cart');
console.log('- GET /api/chatbot/cart/:userId');

// Endpoint xử lý tin nhắn
router.post('/message', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                message: 'UserId và message là bắt buộc'
            });
        }
        
        const response = await chatbotService.processMessage(userId, message);
        
        res.json({
            success: true,
            response
        });
    } catch (error) {
        console.error('Error in message endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xử lý tin nhắn'
        });
    }
});

// Endpoint lấy lịch sử chat
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const User = require('../models/User');
        
        const user = await User.findOne({ userId });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        res.json({
            success: true,
            history: user.chatHistory
        });
    } catch (error) {
        console.error('Error in history endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy lịch sử chat'
        });
    }
});

// Endpoint cập nhật thông tin người dùng
router.put('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { preferences } = req.body;
        
        const User = require('../models/User');
        
        const user = await User.findOneAndUpdate(
            { userId },
            { preferences },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error in update user endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật thông tin người dùng'
        });
    }
});

// Endpoint lấy sản phẩm gợi ý
router.get('/recommendations', async (req, res) => {
    try {
        const { limit = 5, category, style } = req.query;
        
        let query = { inStock: true };
        
        if (category) {
            query.category = category;
        }
        
        if (style) {
            query.style = { $in: [style] };
        }
        
        const products = await Product.find(query)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error fetching product recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy gợi ý sản phẩm'
        });
    }
});

// Endpoint lấy thông tin chi tiết sản phẩm
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Validate if productId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }
        
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thông tin sản phẩm'
        });
    }
});

// Endpoint lấy các sản phẩm tương tự
router.get('/similar-products', async (req, res) => {
    try {
        const { category, exclude, limit = 8, style } = req.query;
        
        let query = { inStock: true };
        
        if (category) {
            query.category = category;
        }
        
        if (exclude) {
            query._id = { $ne: exclude };
        }
        
        if (style) {
            query.style = { $in: [style] };
        }
        
        const products = await Product.find(query)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error fetching similar products:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy sản phẩm tương tự'
        });
    }
});

// Debug middleware for cart routes
router.use('/cart*', (req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.originalUrl}`, req.params, req.body);
    next();
});

// Endpoint thêm sản phẩm vào giỏ hàng
router.post('/cart', async (req, res) => {
    try {
        const { userId, productId, quantity, size, color } = req.body;
        
        console.log('Cart request received:', { userId, productId, quantity, size, color });
        
        if (!userId || !productId) {
            return res.status(400).json({
                success: false,
                message: 'UserId và productId là bắt buộc'
            });
        }
        
        const User = require('../models/User');
        const Product = require('../models/Product');
        
        // Kiểm tra sản phẩm có tồn tại không
        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found:', productId);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        // Tìm user hoặc tạo mới nếu chưa có
        let user = await User.findOne({ userId });
        if (!user) {
            console.log('Creating new user for userId:', userId);
            user = new User({
                userId,
                preferences: {
                    budget: { min: 0, max: 2000000 }
                },
                shoppingCart: []
            });
        }
        
        // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
        const existingCartItemIndex = user.shoppingCart.findIndex(
            item => item.product && 
                   item.product.toString() === productId && 
                   ((!size && !item.size) || item.size === size) && 
                   ((!color && !item.color) || item.color === color)
        );
        
        if (existingCartItemIndex !== -1) {
            // Cập nhật số lượng nếu đã có
            user.shoppingCart[existingCartItemIndex].quantity += parseInt(quantity) || 1;
            console.log('Updated existing cart item, new quantity:', user.shoppingCart[existingCartItemIndex].quantity);
        } else {
            // Thêm mới vào giỏ hàng
            user.shoppingCart.push({
                product: productId,
                size: size || undefined,
                color: color || undefined,
                quantity: parseInt(quantity) || 1
            });
            console.log('Added new item to cart');
        }
        
        await user.save();
        console.log('User saved with updated cart');
        
        // Trả về thông tin giỏ hàng cập nhật
        const updatedUser = await User.findOne({ userId }).populate('shoppingCart.product');
        
        res.json({
            success: true,
            message: 'Đã thêm sản phẩm vào giỏ hàng',
            cartCount: updatedUser.shoppingCart.length,
            cart: updatedUser.shoppingCart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi thêm vào giỏ hàng: ' + error.message
        });
    }
});

// Endpoint lấy thông tin giỏ hàng
router.get('/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Getting cart for user:', userId);
        
        const User = require('../models/User');
        
        // Tìm user hoặc tạo mới nếu chưa có
        let user = await User.findOne({ userId }).populate('shoppingCart.product');
        
        if (!user) {
            console.log('User not found, creating new user');
            user = new User({
                userId,
                preferences: {
                    budget: { min: 0, max: 2000000 }
                },
                shoppingCart: []
            });
            await user.save();
        }
        
        console.log(`Cart has ${user.shoppingCart.length} items`);
        
        res.json({
            success: true,
            cartCount: user.shoppingCart.length,
            cart: user.shoppingCart
        });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thông tin giỏ hàng: ' + error.message
        });
    }
});

module.exports = router;
