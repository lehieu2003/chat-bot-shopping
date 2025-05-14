require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-chatbot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB for seeding'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Function to seed database with test user
async function seedDatabase() {
    try {
        // Clear existing users
        await User.deleteOne({ email: 'lehieunghiahanh761@gmail.com' });
        console.log('Removed existing test user');
        
        // Create a test user with the email and password provided
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('12345678', salt);
        
        const testUser = new User({
            username: 'testuser',
            email: 'lehieunghiahanh761@gmail.com',
            password: hashedPassword
        });
        
        await testUser.save();
        console.log('Test user created successfully!');
        console.log('Email: lehieunghiahanh761@gmail.com');
        console.log('Password: 12345678');
        
        mongoose.disconnect();
    } catch (err) {
        console.error('Error seeding database:', err);
        mongoose.disconnect();
    }
}

seedDatabase();
