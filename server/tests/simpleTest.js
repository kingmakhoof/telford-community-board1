/**
 * ============================================
 * SIMPLE USER MODEL TEST
 * ============================================
 * Basic test to verify the setup works
 * ============================================
 */

require('dotenv').config();
const { sequelize, testConnection } = require('../config/database');

async function runSimpleTest() {
    console.log('🧪 Starting simple test...\n');
    
    try {
        // 1. Test database connection
        console.log('1. Testing database connection...');
        await testConnection();
        console.log('✅ Database connection successful\n');
        
        // 2. Test User model creation
        console.log('2. Loading User model...');
        const User = require('../models/User')(sequelize, sequelize.Sequelize.DataTypes);
        console.log('✅ User model loaded\n');
        
        // 3. Sync model with database
        console.log('3. Syncing User model with database...');
        await User.sync({ force: false });
        console.log('✅ User model synced\n');
        
        // 4. Create a test user
        console.log('4. Creating test user...');
        const testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'TestPassword123!',
            displayName: 'Test User'
        });
        console.log('✅ Test user created:');
        console.log(`   ID: ${testUser.id}`);
        console.log(`   Username: ${testUser.username}`);
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Hashed password stored: ${testUser.password ? 'Yes' : 'No'}`);
        console.log(`   Password starts with bcrypt: ${testUser.password.startsWith('$2')}`);
        
        // 5. Test password comparison
        console.log('\n5. Testing password comparison...');
        const correctMatch = await testUser.comparePassword('TestPassword123!');
        const wrongMatch = await testUser.comparePassword('WrongPassword');
        console.log(`✅ Correct password matches: ${correctMatch}`);
        console.log(`✅ Wrong password rejected: ${!wrongMatch}`);
        
        // 6. Test public profile
        console.log('\n6. Testing public profile...');
        const publicProfile = testUser.getPublicProfile();
        console.log(`✅ Public profile excludes password: ${!publicProfile.password}`);
        console.log(`✅ Public profile includes username: ${publicProfile.username === 'testuser'}`);
        
        // 7. Clean up
        console.log('\n7. Cleaning up test data...');
        await testUser.destroy();
        console.log('✅ Test data cleaned up');
        
        console.log('\n🎉 All tests passed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Close connection
        await sequelize.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    runSimpleTest();
}

module.exports = { runSimpleTest };