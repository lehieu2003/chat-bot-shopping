const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get current user (protected route)
router.get('/me', auth, authController.getCurrentUser);

// Debug endpoint to check if a user exists
router.get('/check-user/:email', authController.checkUserExists);

module.exports = router;
