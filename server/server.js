/**
 * ============================================
 * TELFORD COMMUNITY BOARD - MAIN SERVER FILE
 * ============================================
 * Fixed: Added missing middleware imports
 * ============================================
 */

// ============================================
// 1. LOAD ENVIRONMENT VARIABLES FIRST!
// ============================================
const dotenv = require('dotenv');
dotenv.config();

// Debug: Show loaded environment variables
console.log('🔍 Environment Variables Loaded:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DB_HOST: ${process.env.DB_HOST}`);
console.log(`   DB_PORT: ${process.env.DB_PORT}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET!'}`);
console.log('');

// ============================================
// 2. NOW IMPORT OTHER DEPENDENCIES
// ============================================
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

// Import authentication middleware
const { authenticate, authorize } = require('./middleware/auth');

// ============================================
// 3. IMPORT DATABASE CONFIG AND ROUTES
// ============================================
const { sequelize, testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

// ============================================
// 4. INITIALIZE EXPRESS
// ============================================
const app = express();

// ============================================
// CONFIGURE MIDDLEWARE
// ============================================
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5500',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

app.use(express.static(path.join(__dirname, '../client/public')));

if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

// ============================================
// DATABASE INITIALIZATION
// ============================================
async function initializeDatabase() {
    try {
        await testConnection();
        console.log('✅ Database connection established successfully');
        
        const db = require('./models');
        
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synchronized');
        }
        
        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
    });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Test protected route
app.get('/api/protected', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'You have accessed a protected route!',
        user: req.user
    });
});

// Test admin route
app.get('/api/admin', authenticate, authorize('admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome, admin!',
        user: req.user
    });
});

// Serve main frontend page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/views/index.html'));
});

// Serve auth test page
app.get('/test-auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/views/test-auth.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Error:', err.stack);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
    try {
        const db = await initializeDatabase();
        console.log('📊 Database models loaded');
        
        app.locals.db = db;
        
        app.listen(PORT, HOST, () => {
            console.log(`\n🚀 Server running at http://${HOST}:${PORT}`);
            console.log(`📁 Environment: ${process.env.NODE_ENV}`);
            console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
            console.log(`👤 Users in database: (checking...)`);
            
            db.User.count().then(count => {
                console.log(`   Total users: ${count}`);
            }).catch(err => {
                console.log(`   Could not count users: ${err.message}`);
            });
            
            console.log(`\n🔗 Health check: http://${HOST}:${PORT}/api/health`);
            console.log(`🔗 Frontend: http://${HOST}:${PORT}/`);
            console.log(`🔗 Auth Test: http://${HOST}:${PORT}/test-auth.html`);
            console.log(`🔗 Protected route: http://${HOST}:${PORT}/api/protected`);
            console.log(`🔗 Admin route: http://${HOST}:${PORT}/api/admin`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Closing server gracefully...');
    sequelize.close();
    process.exit(0);
});

startServer();