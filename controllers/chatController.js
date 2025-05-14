const chatbotService = require('../services/chatbotService');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');

// Process chatbot messages
exports.processMessage = async (req, res) => {
    try {
        const { userId, message } = req.body;
        const user = req.user; // Get authenticated user from middleware
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }
        
        // Use authenticated userId instead of passed userId
        const response = await chatbotService.processMessage(user.id, message);
        
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
};

// Get chat history for a user
exports.getChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        
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
};

// Update user preferences
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { preferences } = req.body;
        
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
};

// Get product recommendations
exports.getRecommendations = async (req, res) => {
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
};

// Get product details
exports.getProductDetails = async (req, res) => {
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
};

// Get similar products
exports.getSimilarProducts = async (req, res) => {
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
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity, size, color } = req.body;
        const userId = req.user.id; // Get authenticated user ID
        
        console.log('Cart request received:', { userId, productId, quantity, size, color });
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ProductId is required'
            });
        }
        
        // Kiểm tra sản phẩm có tồn tại không
        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found:', productId);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        
        // Tìm user theo id từ authentication
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Initialize shopping cart if it doesn't exist
        if (!user.shoppingCart) {
            user.shoppingCart = [];
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
        
        try {
            // Trả về thông tin giỏ hàng cập nhật
            const updatedUser = await User.findById(userId).populate({
                path: 'shoppingCart.product',
                model: 'Product'
            });
            
            res.json({
                success: true,
                message: 'Đã thêm sản phẩm vào giỏ hàng',
                cartCount: updatedUser.shoppingCart.length,
                cart: updatedUser.shoppingCart
            });
        } catch (populateError) {
            console.error('Error populating shopping cart:', populateError);
            // Still return success even if populate fails
            res.json({
                success: true,
                message: 'Đã thêm sản phẩm vào giỏ hàng',
                cartCount: user.shoppingCart.length
            });
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi thêm vào giỏ hàng: ' + error.message
        });
    }
};

// Get cart contents
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id; // Get authenticated user ID
        console.log('Getting cart for user:', userId);
        
        try {
            // Find user by authenticated ID with populated shopping cart
            let user = await User.findById(userId).populate({
                path: 'shoppingCart.product',
                model: 'Product'
            });
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Initialize shopping cart if it doesn't exist
            if (!user.shoppingCart) {
                user.shoppingCart = [];
            }
            
            console.log(`Cart has ${user.shoppingCart.length} items`);
            
            res.json({
                success: true,
                cartCount: user.shoppingCart.length,
                cart: user.shoppingCart
            });
        } catch (populateError) {
            console.error('Error populating shopping cart:', populateError);
            
            // Fallback: get user without population
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                cartCount: user.shoppingCart ? user.shoppingCart.length : 0,
                cart: user.shoppingCart || []
            });
        }
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thông tin giỏ hàng: ' + error.message
        });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { productId, quantity, size, color } = req.body;
        const userId = req.user.id;
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ProductId is required'
            });
        }

        // Find user
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find the cart item
        const cartItemIndex = user.shoppingCart.findIndex(
            item => item.product.toString() === productId && 
                   ((!size && !item.size) || item.size === size) && 
                   ((!color && !item.color) || item.color === color)
        );

        if (cartItemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại trong giỏ hàng'
            });
        }

        // Update quantity
        user.shoppingCart[cartItemIndex].quantity += parseInt(quantity);
        
        // If quantity is less than 1, remove the item
        if (user.shoppingCart[cartItemIndex].quantity < 1) {
            user.shoppingCart.splice(cartItemIndex, 1);
        }

        await user.save();

        // Return updated cart
        const updatedUser = await User.findById(userId).populate({
            path: 'shoppingCart.product',
            model: 'Product'
        });

        res.json({
            success: true,
            message: 'Đã cập nhật giỏ hàng',
            cartCount: updatedUser.shoppingCart.length,
            cart: updatedUser.shoppingCart
        });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật giỏ hàng'
        });
    }
};

// Remove item from cart
exports.removeCartItem = async (req, res) => {
    try {
        const { productId, size, color } = req.body;
        const userId = req.user.id;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ProductId is required'
            });
        }

        // Find user
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find the cart item
        const cartItemIndex = user.shoppingCart.findIndex(
            item => item.product.toString() === productId && 
                   ((!size && !item.size) || item.size === size) && 
                   ((!color && !item.color) || item.color === color)
        );

        if (cartItemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại trong giỏ hàng'
            });
        }

        // Remove item
        user.shoppingCart.splice(cartItemIndex, 1);
        await user.save();

        // Return updated cart
        const updatedUser = await User.findById(userId).populate({
            path: 'shoppingCart.product',
            model: 'Product'
        });

        res.json({
            success: true,
            message: 'Đã xóa sản phẩm khỏi giỏ hàng',
            cartCount: updatedUser.shoppingCart.length,
            cart: updatedUser.shoppingCart
        });
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng'
        });
    }
};

// Process payment for cart
exports.paymentCart = async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        const userId = req.user.id;

        // Find user with populated cart
        let user = await User.findById(userId).populate({
            path: 'shoppingCart.product',
            model: 'Product'
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if cart is empty
        if (!user.shoppingCart || user.shoppingCart.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Shopping cart is empty'
            });
        }

        // Calculate total amount
        const totalAmount = user.shoppingCart.reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);

        if (paymentMethod === 'COD') {
            // Process Cash on Delivery
            // Here you would normally create an order in your database
            
            // Clear the cart after successful order
            user.shoppingCart = [];
            await user.save();
            
            return res.json({
                success: true,
                message: 'Order placed successfully with Cash on Delivery',
                orderTotal: totalAmount,
                paymentMethod: 'COD'
            });
        } 
        else if (paymentMethod === 'MOMO') {
            // Process MoMo payment
            const axios = require('axios');
            const crypto = require('crypto');
            const momoConfig = require('../config/momoConfig');
            
            let {
                accessKey,
                secretKey,
                orderInfo,
                partnerCode,
                redirectUrl,
                ipnUrl,
                requestType,
                extraData,
                orderGroupId,
                autoCapture,
                lang,
            } = momoConfig;

            // Convert amount to string with no decimal places
            const amount = String(Math.round(totalAmount));
            const orderId = partnerCode + new Date().getTime();
            const requestId = orderId;

            // Create signature
            const rawSignature =
                'accessKey=' + accessKey +
                '&amount=' + amount +
                '&extraData=' + extraData +
                '&ipnUrl=' + ipnUrl +
                '&orderId=' + orderId +
                '&orderInfo=' + orderInfo +
                '&partnerCode=' + partnerCode +
                '&redirectUrl=' + redirectUrl +
                '&requestId=' + requestId +
                '&requestType=' + requestType;

            const signature = crypto
                .createHmac('sha256', secretKey)
                .update(rawSignature)
                .digest('hex');

            // Create request body
            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                partnerName: 'Test',
                storeId: 'MomoTestStore',
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                lang: lang,
                requestType: requestType,
                autoCapture: autoCapture,
                extraData: extraData,
                orderGroupId: orderGroupId,
                signature: signature,
            });

            try {
                // Send request to MoMo
                const response = await axios({
                    method: 'POST',
                    url: 'https://test-payment.momo.vn/v2/gateway/api/create',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(requestBody),
                    },
                    data: requestBody,
                });
                
                // Store order information for callback processing
                // In a real application, you would save this to your database
                
                return res.json({
                    success: true,
                    paymentMethod: 'MOMO',
                    paymentUrl: response.data.payUrl,
                    orderId: orderId,
                    amount: amount,
                    orderInfo: orderInfo
                });
            } catch (error) {
                console.error('MoMo payment error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error processing MoMo payment',
                    error: error.message
                });
            }
        } 
        else {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method. Please use COD or MOMO.'
            });
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing payment: ' + error.message
        });
    }
};

// Process MoMo payment callback
exports.momoCallback = async (req, res) => {
    try {
        console.log('MoMo callback received:', req.body);
        
        const { 
            partnerCode, 
            orderId, 
            requestId, 
            amount, 
            orderInfo, 
            orderType,
            transId, 
            resultCode, 
            message, 
            payType, 
            responseTime, 
            extraData, 
            signature 
        } = req.body;
        
        // Verify the transaction with the resultCode
        if (resultCode === 0 || resultCode === '0') {
            // Transaction successful
            console.log('Payment successful for order:', orderId);
            
            // Here you would update your order status in the database
            // and clear the user's cart after successful payment
            
            // Find user by order information
            // This requires you to store the orderId with the user in a real application
            // For demo purposes, we'll just log the successful transaction
            
            return res.status(204).send();
        } else {
            // Transaction failed
            console.log('Payment failed for order:', orderId, 'Result code:', resultCode);
            return res.status(204).send();
        }
    } catch (error) {
        console.error('Error processing MoMo callback:', error);
        return res.status(204).send();
    }
};

// Check MoMo transaction status
exports.checkMomoTransactionStatus = async (req, res) => {
    try {
        const { orderId } = req.body;
        const crypto = require('crypto');
        const axios = require('axios');
        const momoConfig = require('../config/momoConfig');
        
        const { secretKey, accessKey } = momoConfig;
        
        // Create signature for status check
        const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;
        
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');
        
        const requestBody = JSON.stringify({
            partnerCode: 'MOMO',
            requestId: orderId,
            orderId: orderId,
            signature: signature,
            lang: 'vi',
        });
        
        // Check status with MoMo API
        const result = await axios({
            method: 'POST',
            url: 'https://test-payment.momo.vn/v2/gateway/api/query',
            headers: {
                'Content-Type': 'application/json',
            },
            data: requestBody,
        });
        
        // Return transaction status
        return res.status(200).json({
            success: true,
            transactionStatus: result.data
        });
    } catch (error) {
        console.error('Error checking MoMo transaction status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking transaction status'
        });
    }
};
