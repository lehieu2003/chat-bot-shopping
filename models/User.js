const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define cart item schema
const CartItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    size: {
        type: String
    },
    color: {
        type: String
    }
});

// Define message schema for chat history
const MessageSchema = new Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Define user schema
const UserSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    preferences: {
        budget: {
            min: {
                type: Number,
                default: 0
            },
            max: {
                type: Number,
                default: 2000000
            }
        },
        favoriteColors: [String],
        favoriteStyles: [String],
        sizes: {
            tops: String,
            bottoms: String,
            shoes: String
        }
    },
    chatHistory: [MessageSchema],
    shoppingCart: [CartItemSchema]
});

module.exports = mongoose.model('User', UserSchema);
