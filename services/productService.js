const Product = require('../models/Product');

// Tìm kiếm sản phẩm theo các tiêu chí
async function searchProducts(entities) {
    try {
        let query = {};
        
        // Lọc theo loại sản phẩm
        if (entities.productTypes && entities.productTypes.length > 0) {
            const productTypeMapping = {
                'áo': { category: 'tops' },
                'quần': { category: 'bottoms' },
                'váy': { category: 'dresses' },
                'đầm': { category: 'dresses' },
                'áo khoác': { category: 'outerwear' },
                'giày': { category: 'shoes' },
                'mũ': { category: 'accessories' },
                'túi': { category: 'accessories' },
                'kính': { category: 'accessories' },
                'dép': { category: 'shoes' }
            };
            
            const productType = entities.productTypes[0];
            if (productTypeMapping[productType]) {
                query.category = productTypeMapping[productType].category;
            }
        }
        
        // Lọc theo màu sắc
        if (entities.colors && entities.colors.length > 0) {
            query.colors = { $in: entities.colors };
        }
        
        // Lọc theo kích cỡ
        if (entities.sizes && entities.sizes.length > 0) {
            query.sizes = { $in: entities.sizes };
        }
        
        // Lọc theo dịp
        if (entities.occasions && entities.occasions.length > 0) {
            const occasionMapping = {
                'đi chơi': 'casual',
                'đi làm': 'work',
                'đi biển': 'beach',
                'đi tiệc': 'party',
                'sự kiện': 'formal',
                'hàng ngày': 'casual',
                'dạo phố': 'casual'
            };
            
            let mappedOccasions = entities.occasions
                .map(occ => occasionMapping[occ])
                .filter(occ => occ); // Lọc bỏ undefined
            
            if (mappedOccasions.length > 0) {
                query.occasions = { $in: mappedOccasions };
            }
        }
        
        // Lọc theo giới tính
        if (entities.genders && entities.genders.length > 0) {
            const genderMapping = {
                'nam': 'men',
                'nữ': 'women',
                'unisex': 'unisex'
            };
            
            let mappedGenders = entities.genders
                .map(gender => genderMapping[gender])
                .filter(gender => gender);
            
            if (mappedGenders.length > 0) {
                query.gender = { $in: mappedGenders };
            }
        }
        
        // Chỉ lấy sản phẩm còn hàng
        query.inStock = true;
        
        // Thực hiện truy vấn
        const products = await Product.find(query)
            .limit(10) // Giới hạn số lượng kết quả
            .sort({ createdAt: -1 }); // Sắp xếp mới nhất trước
        
        return products;
    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
}

// Lấy thông tin chi tiết sản phẩm
async function getProductDetails(productId) {
    try {
        const product = await Product.findById(productId);
        return product;
    } catch (error) {
        console.error('Error getting product details:', error);
        return null;
    }
}

// Lấy các sản phẩm tương tự
async function getSimilarProducts(productId) {
    try {
        const product = await Product.findById(productId);
        
        if (!product) return [];
        
        const similarProducts = await Product.find({
            category: product.category,
            _id: { $ne: productId },
            style: { $in: product.style },
            inStock: true
        })
        .limit(5)
        .sort({ createdAt: -1 });
        
        return similarProducts;
    } catch (error) {
        console.error('Error getting similar products:', error);
        return [];
    }
}

module.exports = {
    searchProducts,
    getProductDetails,
    getSimilarProducts
};
