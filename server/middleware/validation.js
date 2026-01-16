/**
 * ============================================
 * INPUT VALIDATION MIDDLEWARE
 * ============================================
 * Validates request data before processing
 * ============================================
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    
    next();
};

/**
 * Registration validation rules
 */
const registerValidation = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can only contain letters, numbers, dots, dashes, and underscores'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8, max: 100 }).withMessage('Password must be between 8 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    
    body('displayName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Display name cannot exceed 100 characters'),
    
    validate
];

/**
 * Login validation rules
 */
const loginValidation = [
    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    // Either email or username must be provided
    body().custom((value, { req }) => {
        if (!req.body.email && !req.body.username) {
            throw new Error('Either email or username is required');
        }
        return true;
    }),
    
    validate
];

/**
 * Password reset request validation
 */
const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    validate
];

/**
 * Password reset validation
 */
const resetPasswordValidation = [
    body('token')
        .notEmpty().withMessage('Reset token is required'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8, max: 100 }).withMessage('Password must be between 8 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    
    validate
];

/**
 * Update profile validation
 */
const updateProfileValidation = [
    body('displayName')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Display name cannot exceed 100 characters'),
    
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Bio cannot exceed 2000 characters'),
    
    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),
    
    body('avatar')
        .optional()
        .isURL().withMessage('Avatar must be a valid URL'),
    
    validate
];

/**
 * Change password validation
 */
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8, max: 100 }).withMessage('Password must be between 8 and 100 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        .custom((value, { req }) => value !== req.body.currentPassword)
        .withMessage('New password must be different from current password'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match'),
    
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    updateProfileValidation,
    changePasswordValidation,
    validate
};