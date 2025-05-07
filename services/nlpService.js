const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Khai báo từ khóa (intents)
const intents = {
    greeting: ['xin chào', 'chào', 'hi', 'hello', 'hey'],
    productSearch: ['tìm', 'kiếm', 'muốn mua', 'cần', 'có', 'tìm kiếm'],
    sizeAdvice: ['size', 'kích cỡ', 'số', 'cỡ', 'vừa'],
    styleAdvice: ['phối đồ', 'mix', 'phong cách', 'style', 'mặc với', 'hợp với'],
    priceQuery: ['giá', 'bao nhiêu', 'tiền'],
    occasionAdvice: ['mặc khi nào', 'dịp', 'sự kiện', 'đi chơi', 'đi làm', 'đi tiệc'],
    materialInfo: ['chất liệu', 'vải', 'cotton', 'len', 'da', 'vải gì'],
    recommendations: ['gợi ý', 'đề xuất', 'recommend', 'giới thiệu'],
    shoppingCart: ['giỏ hàng', 'cart', 'thanh toán', 'mua'],
    goodbye: ['tạm biệt', 'bye', 'gặp lại sau', 'hẹn gặp lại']
};

// Trích xuất entities
const entities = {
    productTypes: ['áo', 'quần', 'váy', 'giày', 'mũ', 'túi', 'đầm', 'kính', 'dép', 'áo khoác'],
    colors: ['đỏ', 'xanh', 'vàng', 'đen', 'trắng', 'hồng', 'tím', 'cam', 'xám', 'nâu'],
    sizes: ['s', 'm', 'l', 'xl', 'xxl', '38', '39', '40', '41', '42'],
    occasions: ['đi chơi', 'đi làm', 'đi biển', 'đi tiệc', 'sự kiện', 'hàng ngày', 'dạo phố'],
    genders: ['nam', 'nữ', 'unisex']
};

// Phân tích ý định người dùng
function identifyIntent(message) {
    const tokens = tokenizer.tokenize(message.toLowerCase());
    
    // Tính điểm cho mỗi intent
    let intentScores = {};
    
    Object.keys(intents).forEach(intent => {
        intentScores[intent] = 0;
        
        intents[intent].forEach(keyword => {
            if (message.toLowerCase().includes(keyword)) {
                intentScores[intent] += 1;
            }
        });
    });
    
    // Tìm intent có điểm cao nhất
    let maxScore = 0;
    let detectedIntent = 'unknown';
    
    Object.keys(intentScores).forEach(intent => {
        if (intentScores[intent] > maxScore) {
            maxScore = intentScores[intent];
            detectedIntent = intent;
        }
    });
    
    return {
        intent: maxScore > 0 ? detectedIntent : 'unknown',
        confidence: maxScore / 5 // Điểm từ 0-1
    };
}

// Trích xuất thông tin từ tin nhắn
function extractEntities(message) {
    const tokens = tokenizer.tokenize(message.toLowerCase());
    let extractedEntities = {};
    
    // Kiểm tra các entity trong tin nhắn
    Object.keys(entities).forEach(entityType => {
        extractedEntities[entityType] = [];
        
        entities[entityType].forEach(entity => {
            if (message.toLowerCase().includes(entity)) {
                extractedEntities[entityType].push(entity);
            }
        });
    });
    
    return extractedEntities;
}

module.exports = {
    identifyIntent,
    extractEntities
};
