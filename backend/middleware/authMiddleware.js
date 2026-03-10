import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to protect routes:
 * 1. Checks for the 'Authorization' header.
 * 2. Verifies the JWT token.
 * 3. Attaches the user data to the request object.
 */
export const protect = async (req, res, next) => {
    let token;

    // Check if the request has an Authorization header starting with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (format: Bearer <token>)
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using your secret key from the .env file
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch user from DB and attach to req (excluding password) [cite: 81]
            req.user = await User.findById(decoded.id).select('-password');

            next(); // Move to the controller
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized" });
    }
};