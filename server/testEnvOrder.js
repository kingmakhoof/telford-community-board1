/**
 * Test environment variable loading order
 */

console.log('🧪 Testing environment variable loading order...\n');

// Test 1: Load dotenv at different points
console.log('1. Testing dotenv loading...');

// Clear any existing env vars for test
delete process.env.DB_PASSWORD;

// Load dotenv
require('dotenv').config();

console.log(`   DB_PASSWORD loaded: "${process.env.DB_PASSWORD}"`);
console.log(`   Length: ${process.env.DB_PASSWORD?.length || 0}`);
console.log('');

// Test 2: Check if database.js can read them
console.log('2. Testing database config reading...');
const { sequelize } = require('./config/database');

// Test 3: Try to connect
console.log('3. Testing connection...');
async function test() {
    try {
        await sequelize.authenticate();
        console.log('✅ All tests passed!');
        console.log('\n💡 Issue was: dotenv needs to be loaded FIRST');
        console.log('   BEFORE any file tries to read process.env');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

test();