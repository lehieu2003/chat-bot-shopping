const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories', 'shoes']
    },
    subCategory: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['men', 'women', 'unisex']
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    sizes: [{
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }],
    colors: [{
        type: String
    }],
    material: {
        type: String
    },
    occasions: [{
        type: String,
        enum: ['casual', 'formal', 'sports', 'party', 'work', 'beach']
    }],
    style: [{
        type: String,
        enum: ['classic', 'modern', 'vintage', 'sporty', 'boho', 'minimalist']
    }],
    imageUrl: {
        type: String
    },
    inStock: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
