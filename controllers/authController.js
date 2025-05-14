const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register new user
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if all required fields are provided
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        user = new User({
            username,
            email,
            password
        });
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        
        // Save user to database
        await user.save();
        
        // Return success response
        res.status(201).json({
            message: 'User registered successfully'
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Login attempt for email:', email);
        
        // Check if email and password are provided
        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        
        // Check if user exists
        const user = await User.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch ? 'Yes' : 'No');
        
        if (!isMatch) {
            console.log('Password does not match for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const payload = {
            user: {
                id: user.id
            }
        };
        
        // Ensure JWT_SECRET is available
        const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
        console.log('Using JWT secret:', jwtSecret ? 'Secret is set' : 'Warning: Using default secret');
        
        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    throw err;
                }
                console.log('JWT token generated successfully');
                
                // Check the token is valid by verifying it
                try {
                    const decoded = jwt.verify(token, jwtSecret);
                    console.log('Token verified successfully');
                } catch (verifyErr) {
                    console.error('Token verification failed:', verifyErr);
                }
                
                res.json({
                    token,
                    user: {
                        userId: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            }
        );
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Debug endpoint to check if a user exists
exports.checkUserExists = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email });
        
        if (user) {
            return res.json({ 
                exists: true, 
                message: 'User found',
                userId: user._id,
                username: user.username
            });
        } else {
            return res.json({ exists: false, message: 'User not found' });
        }
    } catch (err) {
        console.error('Check user error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
