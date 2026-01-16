/**
 * ============================================
 * JWT CONFIGURATION
 * ============================================
 * Handles JWT token generation, verification, and refresh
 * ============================================
 */

const jwt = require('jsonwebtoken');

// JWT Configuration
const JWT_CONFIG = {
    // Token expiration times
    ACCESS_TOKEN_EXPIRY: '15m',           // 15 minutes - short-lived for security
    REFRESH_TOKEN_EXPIRY: '7d',           // 7 days - long-lived for user convenience
    RESET_TOKEN_EXPIRY: '1h',             // 1 hour - for password reset
    
    // Token types for better security
    TOKEN_TYPES: {
        ACCESS: 'access',
        REFRESH: 'refresh',
        RESET: 'reset'
    }
};

/**
 * Generate JWT token
 * @param {object} payload - Data to encode in token
 * @param {string} type - Token type (access, refresh, reset)
 * @returns {string} - JWT token
 */
function generateToken(payload, type = JWT_CONFIG.TOKEN_TYPES.ACCESS) {
    const secret = getSecretByType(type);
    const expiresIn = getExpiryByType(type);
    
    // Add token type to payload for additional security
    const tokenPayload = {
        ...payload,
        tokenType: type,
        iat: Math.floor(Date.now() / 1000) // Issued at
    };
    
    return jwt.sign(tokenPayload, secret, { expiresIn });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {string} type - Expected token type
 * @returns {object} - Decoded token payload
 */
function verifyToken(token, type = JWT_CONFIG.TOKEN_TYPES.ACCESS) {
    const secret = getSecretByType(type);
    return jwt.verify(token, secret);
}

/**
 * Decode token without verification (for inspection only)
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 */
function decodeToken(token) {
    return jwt.decode(token);
}

/**
 * Get secret key based on token type
 * @param {string} type - Token type
 * @returns {string} - Secret key
 */
function getSecretByType(type) {
    const secrets = {
        [JWT_CONFIG.TOKEN_TYPES.ACCESS]: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
        [JWT_CONFIG.TOKEN_TYPES.REFRESH]: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        [JWT_CONFIG.TOKEN_TYPES.RESET]: process.env.JWT_RESET_SECRET || process.env.JWT_SECRET
    };
    
    const secret = secrets[type];
    if (!secret) {
        throw new Error(`JWT secret not configured for token type: ${type}`);
    }
    return secret;
}

/**
 * Get expiry time based on token type
 * @param {string} type - Token type
 * @returns {string} - Expiry time string
 */
function getExpiryByType(type) {
    const expiries = {
        [JWT_CONFIG.TOKEN_TYPES.ACCESS]: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
        [JWT_CONFIG.TOKEN_TYPES.REFRESH]: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
        [JWT_CONFIG.TOKEN_TYPES.RESET]: JWT_CONFIG.RESET_TOKEN_EXPIRY
    };
    
    return expiries[type] || JWT_CONFIG.ACCESS_TOKEN_EXPIRY;
}

/**
 * Generate both access and refresh tokens for a user
 * @param {object} user - User object
 * @returns {object} - Tokens object
 */
function generateAuthTokens(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role
    };
    
    const accessToken = generateToken(payload, JWT_CONFIG.TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(payload, JWT_CONFIG.TOKEN_TYPES.REFRESH);
    
    return {
        accessToken,
        refreshToken,
        accessTokenExpiry: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
        refreshTokenExpiry: JWT_CONFIG.REFRESH_TOKEN_EXPIRY
    };
}

/**
 * Generate password reset token
 * @param {string} email - User email
 * @returns {string} - Reset token
 */
function generateResetToken(email) {
    return generateToken({ email }, JWT_CONFIG.TOKEN_TYPES.RESET);
}

/**
 * Verify if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
function isTokenExpired(token) {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp) return true;
        
        const currentTime = Math.floor(Date.now() / 1000);
        return decoded.exp < currentTime;
    } catch (error) {
        return true;
    }
}

/**
 * Get token expiry timestamp
 * @param {string} token - JWT token
 * @returns {number|null} - Expiry timestamp in seconds
 */
function getTokenExpiry(token) {
    try {
        const decoded = decodeToken(token);
        return decoded?.exp || null;
    } catch (error) {
        return null;
    }
}

module.exports = {
    JWT_CONFIG,
    generateToken,
    verifyToken,
    decodeToken,
    generateAuthTokens,
    generateResetToken,
    isTokenExpired,
    getTokenExpiry
};