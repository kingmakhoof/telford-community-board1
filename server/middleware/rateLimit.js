/**
 * ============================================
 * RATE LIMITING MIDDLEWARE
 * ============================================
 * Prevents brute force attacks and API abuse
 * ============================================
 */

const rateLimit = require('express-rate-limit');

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
    // General API rate limiting
    general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false // Disable the `X-RateLimit-*` headers
    },
    
    // Stricter limits for authentication endpoints
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 login attempts per windowMs
        message: {
            success: false,
            message: 'Too many login attempts, please try again later.',
            code: 'LOGIN_RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true // Don't count successful logins
    },
    
    // Password reset endpoints
    passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // Limit each IP to 3 password reset attempts per hour
        message: {
            success: false,
            message: 'Too many password reset attempts, please try again later.',
            code: 'PASSWORD_RESET_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    }
};

// Create rate limiters
const generalLimiter = rateLimit(RATE_LIMIT_CONFIG.general);
const authLimiter = rateLimit(RATE_LIMIT_CONFIG.auth);
const passwordResetLimiter = rateLimit(RATE_LIMIT_CONFIG.passwordReset);

/**
 * Custom rate limiter based on user ID (for logged-in users)
 */
const userRateLimiter = (maxRequests, windowMs) => {
    return rateLimit({
        windowMs,
        max: maxRequests,
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise use IP
            return req.user ? `user:${req.user.id}` : req.ip;
        },
        message: {
            success: false,
            message: 'You have made too many requests. Please try again later.',
            code: 'USER_RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

/**
 * Skip rate limiting for certain conditions
 */
const skipRateLimit = (req) => {
    // Skip rate limiting for admin users
    if (req.user && req.user.role === 'admin') {
        return true;
    }
    
    // Skip for certain paths (health checks, etc.)
    const skipPaths = ['/api/health', '/api/docs'];
    if (skipPaths.includes(req.path)) {
        return true;
    }
    
    return false;
};

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    userRateLimiter,
    skipRateLimit
};