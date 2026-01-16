/**
 * ============================================
 * AUTHENTICATION ROUTES
 * ============================================
 * All authentication-related API endpoints
 * ============================================
 */

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const { authenticate, authorize, verifyRefreshToken } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimit');
const {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    updateProfileValidation,
    changePasswordValidation
} = require('../middleware/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    authLimiter, // Rate limiting for registration
    registerValidation,
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    authLimiter, // Rate limiting for login attempts
    loginValidation,
    authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
    '/logout',
    authenticate,
    authController.logout
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (with valid refresh token)
 */
router.post(
    '/refresh-token',
    verifyRefreshToken,
    authController.refreshToken
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    authController.getProfile
);

/**
 * @route   PUT /api/auth/me
 * @desc    Update user profile
 * @access  Private
 */
router.put(
    '/me',
    authenticate,
    updateProfileValidation,
    authController.updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post(
    '/change-password',
    authenticate,
    changePasswordValidation,
    authController.changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
    '/forgot-password',
    passwordResetLimiter, // Rate limiting for password reset
    forgotPasswordValidation,
    authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
    '/reset-password',
    resetPasswordValidation,
    authController.resetPassword
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get(
    '/verify-email/:token',
    authController.verifyEmail
);

/**
 * @route   GET /api/auth/admin/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get(
    '/admin/users',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const db = require('../models');
            const users = await db.User.findAll({
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']]
            });
            
            res.json({
                success: true,
                count: users.length,
                data: { users }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                code: 'USERS_FETCH_ERROR'
            });
        }
    }
);

/**
 * @route   GET /api/auth/test
 * @desc    Test authentication
 * @access  Private
 */
router.get(
    '/test',
    authenticate,
    (req, res) => {
        res.json({
            success: true,
            message: 'Authentication test successful!',
            user: req.user
        });
    }
);

module.exports = router;