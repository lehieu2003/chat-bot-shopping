const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Process message from user
exports.processMessage = async (userId, message) => {
    try {
        console.log(`Processing message from user ${userId}: "${message}"`);
        
        // Get user from database by ID
        const user = await User.findById(userId);
        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }
        
        // Process the message content
        const response = await generateResponse(message, user);
        
        // Save message to chat history if needed
        if (!user.chatHistory) {
            user.chatHistory = [];
        }
        
        user.chatHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        
        user.chatHistory.push({
            role: 'assistant',
            content: response.message,
            timestamp: new Date()
        });
        
        // Limit chat history to last 50 messages
        if (user.chatHistory.length > 50) {
            user.chatHistory = user.chatHistory.slice(-50);
        }
        
        await user.save();
        
        return response;
    } catch (error) {
        console.error('Error processing message:', error);
        throw error;
    }
};

// Generate response based on user input
async function generateResponse(message, user) {
    // Convert message to lowercase for easier matching
    const lowerMessage = message.toLowerCase();
    
    // Basic response object
    let response = {
        message: '',
        products: [],
        actions: []
    };
    
    // Check for greetings
    if (containsAny(lowerMessage, ['xin chào', 'hello', 'hi ', 'chào', 'hey'])) {
        const username = user.username || 'bạn';
        response.message = `Xin chào ${username}! Tôi có thể giúp gì cho bạn về thời trang hôm nay?`;
        return response;
    }
    
    // Check for product search requests
    if (containsAny(lowerMessage, ['áo', 'quần', 'đầm', 'váy', 'giày', 'dép', 'túi', 'ví'])) {
        return await handleProductSearch(lowerMessage, user);
    }
    
    // Check for style advice
    if (containsAny(lowerMessage, ['phối đồ', 'style', 'phong cách', 'mặc gì', 'tư vấn'])) {
        return await handleStyleAdvice(lowerMessage, user);
    }
    
    // Default response if no specific intent is detected
    response.message = 'Tôi có thể giúp bạn tìm kiếm sản phẩm thời trang, tư vấn phong cách, hoặc gợi ý các outfit phù hợp. Bạn cần hỗ trợ gì về thời trang?';
    
    return response;
}

// Helper functions for handling different types of requests
async function handleProductSearch(message, user) {
    let response = {
        message: '',
        products: [],
        actions: []
    };
    
    // Determine product category from message
    let category = null;
    if (containsAny(message, ['áo', 'áo sơ mi', 'áo thun', 'áo khoác'])) {
        category = 'tops';
    } else if (containsAny(message, ['quần', 'quần jean', 'quần tây', 'quần short'])) {
        category = 'bottoms';
    } else if (containsAny(message, ['váy', 'đầm'])) {
        category = 'dresses';
    } else if (containsAny(message, ['giày', 'dép', 'sandal', 'boot'])) {
        category = 'shoes';
    }
    
    // Try to extract price limits
    const budget = extractBudget(message) || (user.preferences ? user.preferences.budget : { min: 0, max: 2000000 });
    
    // Query for products
    const query = {
        inStock: true,
        price: { $gte: budget.min, $lte: budget.max }
    };
    
    if (category) {
        query.category = category;
    }
    
    // Get matching products
    const products = await Product.find(query).limit(6);
    
    // Generate response
    if (products.length > 0) {
        let categoryName = '';
        switch (category) {
            case 'tops': categoryName = 'áo'; break;
            case 'bottoms': categoryName = 'quần'; break;
            case 'dresses': categoryName = 'váy/đầm'; break;
            case 'shoes': categoryName = 'giày'; break;
            default: categoryName = 'sản phẩm'; break;
        }
        
        response.message = `Tôi đã tìm thấy một số ${categoryName} phù hợp với yêu cầu của bạn:`;
        response.products = products;
    } else {
        response.message = 'Xin lỗi, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn. Bạn có thể mô tả lại chi tiết hơn được không?';
    }
    
    return response;
}

async function handleStyleAdvice(message, user) {
    let response = {
        message: '',
        products: []
    };
    
    // Extract style type from message
    let style = null;
    if (containsAny(message, ['công sở', 'văn phòng', 'formal', 'business'])) {
        style = 'formal';
        response.message = 'Với phong cách công sở, bạn có thể tham khảo những outfit sau đây:';
    } else if (containsAny(message, ['casual', 'đời thường', 'hàng ngày'])) {
        style = 'casual';
        response.message = 'Với phong cách đời thường, tôi gợi ý cho bạn:';
    } else if (containsAny(message, ['sport', 'thể thao', 'active'])) {
        style = 'sport';
        response.message = 'Với phong cách thể thao, bạn có thể tham khảo:';
    } else {
        style = 'casual'; // Default style
        response.message = 'Dưới đây là một số gợi ý phong cách thời trang cho bạn:';
    }
    
    // Get products matching the style
    const products = await Product.find({ style: { $in: [style] }, inStock: true }).limit(6);
    response.products = products;
    
    return response;
}

function containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

function extractBudget(message) {
    let budget = { min: 0, max: 2000000 }; // Default budget
    
    const maxRegex = /(?:dưới|không quá|tối đa|max)\s+(\d+)(?:k|nghìn|triệu|tr)/i;
    const maxMatch = message.match(maxRegex);
    if (maxMatch) {
        let value = parseInt(maxMatch[1]);
        if (maxMatch[0].includes('triệu') || maxMatch[0].includes('tr')) {
            value = value * 1000000;
        } else {
            value = value * 1000;
        }
        budget.max = value;
    }
    
    const minRegex = /(?:trên|từ|hơn|min)\s+(\d+)(?:k|nghìn|triệu|tr)/i;
    const minMatch = message.match(minRegex);
    if (minMatch) {
        let value = parseInt(minMatch[1]);
        if (minMatch[0].includes('triệu') || minMatch[0].includes('tr')) {
            value = value * 1000000;
        } else {
            value = value * 1000;
        }
        budget.min = value;
    }
    
    const rangeRegex = /từ\s+(\d+)(?:k|nghìn|triệu|tr)?\s+đến\s+(\d+)(?:k|nghìn|triệu|tr)/i;
    const rangeMatch = message.match(rangeRegex);
    if (rangeMatch) {
        let minValue = parseInt(rangeMatch[1]);
        let maxValue = parseInt(rangeMatch[2]);
        
        if (rangeMatch[0].includes('triệu') || rangeMatch[0].includes('tr')) {
            minValue = minValue * 1000000;
            maxValue = maxValue * 1000000;
        } else {
            minValue = minValue * 1000;
            maxValue = maxValue * 1000;
        }
        
        budget.min = minValue;
        budget.max = maxValue;
    }
    
    return budget;
}
