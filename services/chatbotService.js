const nlpService = require('./nlpService');
const productService = require('./productService');
const User = require('../models/User');

// Xử lý tin nhắn người dùng
async function processMessage(userId, message) {
    try {
        // Tìm hoặc tạo người dùng mới
        let user = await findOrCreateUser(userId);
        
        // Phân tích ý định và trích xuất thông tin
        const intentData = nlpService.identifyIntent(message);
        const entities = nlpService.extractEntities(message);
        
        // Lưu tin nhắn vào lịch sử
        await saveMessageToHistory(user._id, message, false);
        
        // Tạo phản hồi dựa trên ý định
        const response = await generateResponse(intentData.intent, entities, user);
        
        // Lưu phản hồi vào lịch sử
        await saveMessageToHistory(user._id, response, true);
        
        return response;
    } catch (error) {
        console.error('Error processing message:', error);
        return "Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn.";
    }
}

// Tìm hoặc tạo người dùng mới
async function findOrCreateUser(userId) {
    try {
        let user = await User.findOne({ userId });
        
        if (!user) {
            user = new User({
                userId,
                preferences: {
                    budget: { min: 0, max: 2000000 }
                }
            });
            await user.save();
        }
        
        return user;
    } catch (error) {
        console.error('Error finding or creating user:', error);
        throw error;
    }
}

// Lưu tin nhắn vào lịch sử
async function saveMessageToHistory(userId, message, isBot) {
    try {
        await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    chatHistory: {
                        message,
                        isBot,
                        timestamp: new Date()
                    }
                }
            }
        );
    } catch (error) {
        console.error('Error saving message to history:', error);
    }
}

// Tạo phản hồi dựa trên ý định
async function generateResponse(intent, entities, user) {
    switch (intent) {
        case 'greeting':
            return `Xin chào! Tôi là trợ lý ảo tư vấn thời trang. Tôi có thể giúp bạn tìm kiếm quần áo, tư vấn kích cỡ, phong cách và nhiều thông tin khác. Bạn cần tìm gì hôm nay?`;
            
        case 'productSearch':
            const products = await productService.searchProducts(entities);
            if (products.length > 0) {
                let response = `Tôi tìm thấy ${products.length} sản phẩm phù hợp với yêu cầu của bạn:\n`;
                products.slice(0, 3).forEach((product, index) => {
                    response += `\n${index + 1}. ${product.name} - ${product.price.toLocaleString('vi-VN')}đ`;
                });
                response += `\n\nBạn có muốn xem thêm thông tin về sản phẩm nào không?`;
                return response;
            } else {
                return `Xin lỗi, tôi không tìm thấy sản phẩm phù hợp với yêu cầu của bạn. Bạn có thể mô tả cụ thể hơn được không?`;
            }
            
        case 'sizeAdvice':
            if (entities.productTypes.length > 0) {
                const productType = entities.productTypes[0];
                return getSizeAdvice(productType);
            } else {
                return `Để tư vấn kích cỡ chính xác, bạn vui lòng cho tôi biết bạn đang tìm kiếm loại quần áo nào (áo, quần, váy...) và số đo của bạn.`;
            }
            
        case 'styleAdvice':
            if (entities.productTypes.length > 0) {
                const productType = entities.productTypes[0];
                return getStyleAdvice(productType, entities);
            } else {
                return `Để tư vấn phối đồ, bạn vui lòng cho tôi biết bạn muốn phối với món đồ nào (áo sơ mi, quần jean...) hoặc bạn đang cần phối đồ cho dịp gì?`;
            }
            
        case 'priceQuery':
            if (entities.productTypes.length > 0) {
                const productType = entities.productTypes[0];
                return getPriceInfo(productType);
            } else {
                return `Để cung cấp thông tin về giá, bạn vui lòng cho tôi biết bạn đang quan tâm đến sản phẩm nào?`;
            }
            
        case 'occasionAdvice':
            if (entities.occasions.length > 0) {
                const occasion = entities.occasions[0];
                return getOccasionAdvice(occasion);
            } else {
                return `Tôi có thể gợi ý trang phục cho nhiều dịp khác nhau như đi làm, đi chơi, đi tiệc, đi biển... Bạn đang cần tư vấn cho dịp nào?`;
            }
            
        case 'recommendations':
            return getRecommendations(user.preferences);
            
        case 'goodbye':
            return `Cảm ơn bạn đã trò chuyện! Rất vui được giúp đỡ bạn. Chúc bạn một ngày tốt lành và hẹn gặp lại!`;
            
        default:
            return `Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể hỏi về sản phẩm, kích cỡ, phong cách phối đồ, hoặc nhận gợi ý thời trang.`;
    }
}

// Các hàm hỗ trợ tư vấn
function getSizeAdvice(productType) {
    const sizeAdvice = {
        'áo': "Để chọn kích cỡ áo phù hợp, bạn có thể đo vòng ngực và dựa vào bảng size: S (86-90cm), M (91-95cm), L (96-100cm), XL (101-105cm).",
        'quần': "Để chọn kích cỡ quần phù hợp, bạn cần đo vòng eo và vòng mông. Bảng size thông thường: S (eo 66-70cm), M (eo 71-75cm), L (eo 76-80cm), XL (eo 81-85cm).",
        'váy': "Để chọn kích cỡ váy phù hợp, bạn cần đo vòng ngực, vòng eo và vòng mông. Bạn có thể tham khảo bảng size trên website hoặc cung cấp số đo để tôi tư vấn cụ thể hơn.",
        'giày': "Để chọn size giày, bạn có thể đo chiều dài bàn chân. Bảng size cơ bản: Size 36 (22.5cm), 37 (23cm), 38 (23.5cm), 39 (24cm), 40 (25cm)."
    };
    
    return sizeAdvice[productType] || `Để tư vấn kích cỡ cho ${productType}, bạn vui lòng cho tôi biết số đo cơ thể của bạn.`;
}

function getStyleAdvice(productType, entities) {
    const styleAdvice = {
        'áo sơ mi': "Áo sơ mi có thể phối với quần jean hoặc quần tây, đi kèm giày tây hoặc sneaker tùy vào không gian bạn đến.",
        'quần jean': "Quần jean là item dễ phối, có thể kết hợp với áo thun, áo sơ mi hoặc áo khoác tùy vào mùa và dịp.",
        'váy': "Váy có thể phối với áo thun để trẻ trung hoặc áo sơ mi để lịch sự. Bạn có thể đi giày cao gót hoặc sandal tùy dịp.",
        'áo khoác': "Áo khoác thường là lớp ngoài cùng, bên trong bạn có thể mặc áo thun, áo sơ mi. Dưới có thể là quần jean hoặc quần tây tùy phong cách."
    };
    
    return styleAdvice[productType] || `${productType} thường phù hợp với phong cách casual hoặc smart casual. Bạn có thể phối với các trang phục đơn giản để tạo sự hài hòa.`;
}

function getPriceInfo(productType) {
    const priceRanges = {
        'áo': "Áo thun có giá từ 150,000đ đến 500,000đ. Áo sơ mi có giá từ 350,000đ đến 800,000đ tùy chất liệu và thương hiệu.",
        'quần': "Quần jean thường có giá từ 400,000đ đến 1,000,000đ. Quần tây có giá từ 500,000đ đến 1,200,000đ tùy chất liệu và thương hiệu.",
        'váy': "Váy có giá từ 300,000đ đến 1,500,000đ tùy vào kiểu dáng, chất liệu và thương hiệu.",
        'giày': "Giày thể thao có giá từ 500,000đ đến 2,000,000đ. Giày tây có giá từ 800,000đ đến 3,000,000đ tùy thương hiệu và chất liệu."
    };
    
    return priceRanges[productType] || `Giá ${productType} thường dao động từ 300,000đ đến 1,000,000đ tùy vào chất liệu, kiểu dáng và thương hiệu.`;
}

function getOccasionAdvice(occasion) {
    const occasionAdvice = {
        'đi làm': "Cho dịp đi làm, bạn nên chọn trang phục lịch sự như áo sơ mi, quần tây hoặc váy công sở. Màu sắc nên chọn tone trung tính như đen, trắng, xám, be.",
        'đi chơi': "Cho dịp đi chơi, bạn có thể chọn trang phục thoải mái như áo thun, quần jean, váy suông. Màu sắc và họa tiết có thể đa dạng hơn tùy sở thích.",
        'đi tiệc': "Cho dịp đi tiệc, bạn có thể chọn váy đầm hoặc suit tùy vào dress code. Nên chọn màu sắc nổi bật hoặc đen lịch sự tùy vào không khí buổi tiệc.",
        'đi biển': "Cho dịp đi biển, bạn nên chọn trang phục thoáng mát như áo thun, quần short, váy suông hoặc đầm maxi. Nên chọn chất liệu thoáng khí như cotton, linen."
    };
    
    return occasionAdvice[occasion] || `Cho dịp ${occasion}, bạn nên chọn trang phục phù hợp với không gian và thời tiết, đồng thời thể hiện được phong cách cá nhân.`;
}

function getRecommendations(preferences) {
    // Trong thực tế, đây sẽ là một thuật toán đề xuất phức tạp hơn
    return "Dựa trên sở thích của bạn, tôi đề xuất:\n\n1. Áo sơ mi trắng basic - 450,000đ\n2. Quần jean xanh đậm slim fit - 650,000đ\n3. Giày sneaker trắng - 850,000đ\n\nĐây là những items cơ bản, dễ phối và phù hợp nhiều dịp khác nhau.";
}

module.exports = {
    processMessage
};
