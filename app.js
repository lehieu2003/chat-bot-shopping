require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const chatbotRoutes = require('./routes/chatbotRoutes');
const apiTestRoutes = require('./routes/apiTestRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-chatbot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/test', apiTestRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route không tồn tại: ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Lỗi server: ' + (err.message || 'Unknown error')
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API routes: /api/chatbot/*, /api/auth/*`);
});
