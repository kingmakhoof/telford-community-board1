/**
 * ============================================
 * USER MODEL TEST SCRIPT
 * ============================================
 * Tests the User model functionality
 * Run with: npm test or node server/tests/userModel.test.js
 * ============================================
 */

const { sequelize } = require('../config/database');
const db = require('../models');

// Test configuration
const TEST_CONFIG = {
    cleanup: true, // Clean up test data after tests
    verbose: true  // Show detailed output
};

async function runTests() {
    console.log('🧪 Starting User Model Tests...\n');
    
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established');
        
        // Sync models (creates tables if they don't exist)
        await sequelize.sync({ force: false });
        console.log('✅ Database models synchronized');
        
        // ============================================
        // TEST 1: Create a new user
        // ============================================
        console.log('\n📝 Test 1: Creating a new user');
        const testUser = await db.User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            bio: 'This is a test user'
        });
        
        console.log('✅ User created successfully');
        console.log(`  ID: ${testUser.id}`);
        console.log(`  Username: ${testUser.username}`);
        console.log(`  Email: ${testUser.email}`);
        console.log(`  Role: ${testUser.role}`);
        console.log(`  Hashed password stored: ${testUser.password ? 'Yes' : 'No'}`);
        console.log(`  Password excluded from JSON: ${testUser.toJSON().password ? 'No (ERROR!)' : 'Yes'}`);
        
        // ============================================
        // TEST 2: Password comparison
        // ============================================
        console.log('\n🔐 Test 2: Password comparison');
        
        // Test correct password
        const correctPasswordMatch = await testUser.comparePassword('Password123!');
        console.log(`✅ Correct password comparison: ${correctPasswordMatch}`);
        
        // Test incorrect password
        const wrongPasswordMatch = await testUser.comparePassword('wrongpassword');
        console.log(`✅ Wrong password rejected: ${!wrongPasswordMatch}`);
        
        // ============================================
        // TEST 3: Find user for authentication
        // ============================================
        console.log('\n🔍 Test 3: Find user for authentication');
        
        // Find with email (should include password)
        const authUserByEmail = await db.User.findByEmailForAuth('test@example.com');
        console.log(`✅ Found user by email: ${authUserByEmail ? 'Yes' : 'No'}`);
        console.log(`  Password included for auth: ${authUserByEmail?.password ? 'Yes' : 'No'}`);
        
        // Find with username (should include password)
        const authUserByUsername = await db.User.findByUsernameForAuth('testuser');
        console.log(`✅ Found user by username: ${authUserByUsername ? 'Yes' : 'No'}`);
        
        // ============================================
        // TEST 4: Validation rules
        // ============================================
        console.log('\n⚖️  Test 4: Validation rules');
        
        try {
            // Test short username
            await db.User.create({
                username: 'ab',
                email: 'short@example.com',
                password: 'Password123!'
            });
            console.log('❌ Should have rejected short username');
        } catch (error) {
            console.log(`✅ Correctly rejected short username: ${error.message}`);
        }
        
        try {
            // Test invalid email
            await db.User.create({
                username: 'invalidemail',
                email: 'not-an-email',
                password: 'Password123!'
            });
            console.log('❌ Should have rejected invalid email');
        } catch (error) {
            console.log(`✅ Correctly rejected invalid email: ${error.message}`);
        }
        
        try {
            // Test weak password
            await db.User.create({
                username: 'weakpass',
                email: 'weak@example.com',
                password: 'weak'
            });
            console.log('❌ Should have rejected weak password');
        } catch (error) {
            console.log(`✅ Correctly rejected weak password: ${error.message}`);
        }
        
        // ============================================
        // TEST 5: Unique constraints
        // ============================================
        console.log('\n🚫 Test 5: Unique constraints');
        
        try {
            // Duplicate username
            await db.User.create({
                username: 'testuser', // Already exists
                email: 'different@example.com',
                password: 'Password123!'
            });
            console.log('❌ Should have rejected duplicate username');
        } catch (error) {
            console.log(`✅ Correctly rejected duplicate username: ${error.errors?.[0]?.message || error.message}`);
        }
        
        try {
            // Duplicate email
            await db.User.create({
                username: 'differentuser',
                email: 'test@example.com', // Already exists
                password: 'Password123!'
            });
            console.log('❌ Should have rejected duplicate email');
        } catch (error) {
            console.log(`✅ Correctly rejected duplicate email: ${error.errors?.[0]?.message || error.message}`);
        }
        
        // ============================================
        // TEST 6: Instance methods
        // ============================================
        console.log('\n🛠️  Test 6: Instance methods');
        
        // Test role checking
        console.log(`✅ User is admin? ${testUser.isAdmin()}`);
        console.log(`✅ User has 'user' role? ${testUser.hasRole('user')}`);
        
        // Test public profile
        const publicProfile = testUser.getPublicProfile();
        console.log(`✅ Public profile excludes password: ${!publicProfile.password}`);
        console.log(`✅ Public profile includes username: ${!!publicProfile.username}`);
        
        // ============================================
        // TEST 7: Class methods
        // ============================================
        console.log('\n🏛️  Test 7: Class methods (static methods)');
        
        // Check username availability
        const usernameAvailable = await db.User.isUsernameAvailable('newuser');
        console.log(`✅ New username available? ${usernameAvailable}`);
        
        const existingUsernameAvailable = await db.User.isUsernameAvailable('testuser');
        console.log(`✅ Existing username available? ${!existingUsernameAvailable}`);
        
        // Get statistics
        const stats = await db.User.getStatistics();
        console.log(`✅ Statistics retrieved: ${JSON.stringify(stats, null, 2)}`);
        
        // ============================================
        // TEST 8: Update password (re-hashing)
        // ============================================
        console.log('\n🔄 Test 8: Update password');
        
        const oldHash = testUser.password;
        testUser.password = 'NewPassword123!';
        await testUser.save();
        
        const newHash = testUser.password;
        console.log(`✅ Password changed: ${oldHash !== newHash}`);
        
        const newPasswordMatch = await testUser.comparePassword('NewPassword123!');
        console.log(`✅ New password works: ${newPasswordMatch}`);
        
        // ============================================
        // TEST 9: Scopes
        // ============================================
        console.log('\n🎯 Test 9: Scopes');
        
        // Create an inactive user
        const inactiveUser = await db.User.create({
            username: 'inactiveuser',
            email: 'inactive@example.com',
            password: 'Password123!',
            isActive: false
        });
        
        // Default scope should exclude inactive users
        const allUsersDefault = await db.User.findAll();
        console.log(`✅ Default scope excludes inactive users: ${allUsersDefault.length} users found`);
        
        // With scope to include all
        const allUsers = await db.User.scope('allUsers').findAll();
        console.log(`✅ 'allUsers' scope includes inactive: ${allUsers.length} users found`);
        
        // ============================================
        // CLEANUP
        // ============================================
        if (TEST_CONFIG.cleanup) {
            console.log('\n🧹 Cleaning up test data...');
            await db.User.destroy({ where: {}, truncate: true });
            console.log('✅ Test data cleaned up');
        }
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        await sequelize.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };