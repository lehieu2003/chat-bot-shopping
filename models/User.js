const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    preferences: {
        size: String,
        favoriteColors: [String],
        preferredStyles: [String],
        budget: {
            min: Number,
            max: Number
        }
    },
    chatHistory: [{
        message: String,
        isBot: Boolean,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    shoppingCart: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        size: String,
        color: String,
        quantity: Number
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
