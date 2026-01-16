/**
 * ============================================
 * AUTHENTICATION CONTROLLER
 * ============================================
 * Handles user authentication and account management
 * ============================================
 */

const db = require('../models');
const { generateAuthTokens, generateResetToken, verifyToken, JWT_CONFIG } = require('../config/jwt');
const { hash } = require('bcryptjs');

/**
 * Register a new user
 */
const register = async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;
        
        // Check if user already exists
        const existingUser = await db.User.findOne({
            where: {
                [db.Sequelize.Op.or]: [
                    { email: email.toLowerCase() },
                    { username: username }
                ]
            }
        });
        
        if (existingUser) {
            const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
            return res.status(400).json({
                success: false,
                message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
                code: `${field.toUpperCase()}_EXISTS`
            });
        }
        
        // Create new user
        const user = await db.User.create({
            username,
            email: email.toLowerCase(),
            password,
            displayName: displayName || username,
            role: 'user',
            isActive: true,
            emailVerified: false // Email verification would be added here
        });
        
        // Generate tokens
        const tokens = generateAuthTokens(user);
        
        // Update last login
        await user.updateLastLogin();
        
        // Get public profile (excludes password)
        const userProfile = user.getPublicProfile();
        
        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: userProfile,
                tokens: {
                    accessToken: tokens.accessToken,
                    expiresIn: tokens.accessTokenExpiry
                }
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            code: 'REGISTRATION_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        // Find user by email or username
        let user;
        if (email) {
            user = await db.User.findByEmailForAuth(email);
        } else if (username) {
            user = await db.User.findByUsernameForAuth(username);
        }
        
        // Check if user exists and is active
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Please contact support.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }
        
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Generate tokens
        const tokens = generateAuthTokens(user);
        
        // Update last login
        await user.updateLastLogin();
        
        // Get public profile
        const userProfile = user.getPublicProfile();
        
        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userProfile,
                tokens: {
                    accessToken: tokens.accessToken,
                    expiresIn: tokens.accessTokenExpiry
                }
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            code: 'LOGIN_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
    try {
        // Clear the refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        // In a real application, you might want to blacklist the refresh token
        // This requires storing tokens in a database or Redis
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required',
                code: 'NO_REFRESH_TOKEN'
            });
        }
        
        // Verify refresh token
        const decoded = verifyToken(refreshToken, JWT_CONFIG.TOKEN_TYPES.REFRESH);
        
        // Find user
        const user = await db.User.findByPk(decoded.userId);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
        
        // Generate new access token
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        
        const newAccessToken = generateToken(payload, JWT_CONFIG.TOKEN_TYPES.ACCESS);
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken,
                expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY
            }
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        
        let statusCode = 401;
        let message = 'Invalid refresh token';
        let code = 'INVALID_REFRESH_TOKEN';
        
        if (error.name === 'TokenExpiredError') {
            message = 'Refresh token expired. Please log in again.';
            code = 'REFRESH_TOKEN_EXPIRED';
        }
        
        res.status(statusCode).json({
            success: false,
            message,
            code
        });
    }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await db.User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: {
                user: user.getPublicProfile()
            }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            code: 'PROFILE_FETCH_ERROR'
        });
    }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
    try {
        const { displayName, bio, location, avatar } = req.body;
        
        const user = await db.User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Update allowed fields
        const updates = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (bio !== undefined) updates.bio = bio;
        if (location !== undefined) updates.location = location;
        if (avatar !== undefined) updates.avatar = avatar;
        
        await user.update(updates);
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.getPublicProfile()
            }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            code: 'PROFILE_UPDATE_ERROR'
        });
    }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await db.User.scope('withPassword').findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
                code: 'INCORRECT_PASSWORD'
            });
        }
        
        // Update password (hooks will handle hashing)
        user.password = newPassword;
        await user.save();
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
};

/**
 * Request password reset
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await db.User.findOne({ where: { email: email.toLowerCase() } });
        
        // For security, don't reveal if user exists or not
        if (!user) {
            // Still return success to prevent email enumeration
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.'
            });
        }
        
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }
        
        // Generate reset token
        const resetToken = generateResetToken(user.email);
        
        // In a real application, you would:
        // 1. Store the reset token in database with expiry
        // 2. Send email with reset link
        // 3. Log the request for security
        
        // For now, we'll return the token (in production, send email)
        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        
        console.log(`Password reset link for ${user.email}: ${resetLink}`);
        
        res.json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.',
            // Only include in development
            ...(process.env.NODE_ENV === 'development' && {
                debug: {
                    resetToken,
                    resetLink
                }
            })
        });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
};

/**
 * Reset password with token
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        
        // Verify reset token
        const decoded = verifyToken(token, JWT_CONFIG.TOKEN_TYPES.RESET);
        
        // Find user by email from token
        const user = await db.User.findOne({ 
            where: { email: decoded.email.toLowerCase() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset token',
                code: 'INVALID_RESET_TOKEN'
            });
        }
        
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }
        
        // Update password (hooks will handle hashing)
        user.password = password;
        await user.save();
        
        // In a real application, you would:
        // 1. Invalidate all existing tokens for this user
        // 2. Send confirmation email
        // 3. Log the password change
        
        res.json({
            success: true,
            message: 'Password reset successful. You can now log in with your new password.'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        
        let statusCode = 400;
        let message = 'Invalid or expired reset token';
        let code = 'INVALID_RESET_TOKEN';
        
        if (error.name === 'TokenExpiredError') {
            message = 'Reset token has expired. Please request a new password reset.';
            code = 'RESET_TOKEN_EXPIRED';
        }
        
        res.status(statusCode).json({
            success: false,
            message,
            code
        });
    }
};

/**
 * Verify email (placeholder for future implementation)
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        
        // In a real application, verify email token
        // and update user's emailVerified status
        
        res.json({
            success: true,
            message: 'Email verification would be implemented here'
        });
        
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({
            success: false,
            message: 'Email verification failed',
            code: 'EMAIL_VERIFICATION_ERROR'
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail
};