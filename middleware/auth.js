const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if no token
    if (!token) {
        console.log('No authentication token provided');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    try {
        // Verify token
        const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        
        // Add user from payload
        req.user = decoded.user;
        console.log('Token verified, user ID:', req.user.id);
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
