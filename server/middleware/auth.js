/**
 * ============================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================
 * Protects routes with JWT verification
 * ============================================
 */

const { verifyToken, JWT_CONFIG } = require('../config/jwt');

/**
 * Authentication middleware - verifies access token
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = verifyToken(token, JWT_CONFIG.TOKEN_TYPES.ACCESS);
        
        // Check token type
        if (decoded.tokenType !== JWT_CONFIG.TOKEN_TYPES.ACCESS) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type.',
                code: 'INVALID_TOKEN_TYPE'
            });
        }
        
        // Attach user data to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        let statusCode = 401;
        let message = 'Invalid or expired token.';
        let code = 'INVALID_TOKEN';
        
        if (error.name === 'TokenExpiredError') {
            message = 'Token has expired. Please refresh your token.';
            code = 'TOKEN_EXPIRED';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Invalid token.';
            code = 'MALFORMED_TOKEN';
        }
        
        return res.status(statusCode).json({
            success: false,
            message,
            code
        });
    }
};

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated.',
                code: 'NOT_AUTHENTICATED'
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.',
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }
        
        next();
    };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block request
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token, JWT_CONFIG.TOKEN_TYPES.ACCESS);
            
            if (decoded.tokenType === JWT_CONFIG.TOKEN_TYPES.ACCESS) {
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    role: decoded.role
                };
            }
        }
    } catch (error) {
        // Silently fail - authentication is optional
        console.log('Optional auth failed (expected):', error.message);
    }
    
    next();
};

/**
 * Refresh token verification middleware
 */
const verifyRefreshToken = (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required.',
                code: 'NO_REFRESH_TOKEN'
            });
        }
        
        const decoded = verifyToken(refreshToken, JWT_CONFIG.TOKEN_TYPES.REFRESH);
        
        if (decoded.tokenType !== JWT_CONFIG.TOKEN_TYPES.REFRESH) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token type.',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
        
        req.refreshTokenData = decoded;
        next();
    } catch (error) {
        console.error('Refresh token verification error:', error.message);
        
        let message = 'Invalid refresh token.';
        let code = 'INVALID_REFRESH_TOKEN';
        
        if (error.name === 'TokenExpiredError') {
            message = 'Refresh token has expired. Please log in again.';
            code = 'REFRESH_TOKEN_EXPIRED';
        }
        
        return res.status(401).json({
            success: false,
            message,
            code
        });
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth,
    verifyRefreshToken
};