/**
 * Debug PostgreSQL connection with your actual password
 */
require('dotenv').config();
const { Client } = require('pg');

console.log('🔍 Debugging PostgreSQL Connection\n');

// First, let's see what's actually in the environment
console.log('1. Environment Variables:');
console.log(`   DB_HOST: "${process.env.DB_HOST}"`);
console.log(`   DB_PORT: "${process.env.DB_PORT}"`);
console.log(`   DB_NAME: "${process.env.DB_NAME}"`);
console.log(`   DB_USER: "${process.env.DB_USER}"`);
console.log(`   DB_PASSWORD: "${process.env.DB_PASSWORD}" (length: ${process.env.DB_PASSWORD?.length || 0})`);
console.log(`   Type of DB_PASSWORD: ${typeof process.env.DB_PASSWORD}`);
console.log('');

// Try connecting with what's in .env
console.log('2. Trying to connect with .env values...');
const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'telford_community_db'
});

async function testConnection() {
    try {
        await client.connect();
        console.log('✅ SUCCESS: Connected to PostgreSQL!');
        
        // Get PostgreSQL version
        const versionResult = await client.query('SELECT version()');
        console.log(`   PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);
        
        // Check our database
        const dbResult = await client.query(`
            SELECT datname, encoding, datcollate 
            FROM pg_database 
            WHERE datname = $1
        `, [process.env.DB_NAME]);
        
        if (dbResult.rows.length > 0) {
            console.log(`   Database "${process.env.DB_NAME}" exists`);
        } else {
            console.log(`   ❌ Database "${process.env.DB_NAME}" does not exist`);
        }
        
        // Check users table
        const tableResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
        `);
        
        console.log(`   Users table exists: ${tableResult.rows.length > 0}`);
        
        // Count users
        if (tableResult.rows.length > 0) {
            const countResult = await client.query('SELECT COUNT(*) as count FROM users');
            console.log(`   Total users: ${countResult.rows[0].count}`);
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        
        // Detailed error analysis
        console.log('\n💡 Error Analysis:');
        
        if (error.message.includes('password authentication failed')) {
            console.log('   - Wrong username/password');
            console.log('   - Check if password has special characters');
            console.log('   - Try wrapping password in quotes in .env file');
        } else if (error.message.includes('password must be a string')) {
            console.log('   - Password is undefined or not a string');
            console.log('   - Check .env file formatting');
            console.log('   - Make sure DB_PASSWORD has a value');
        } else if (error.message.includes('connect')) {
            console.log('   - PostgreSQL might not be running');
            console.log('   - Check firewall settings');
            console.log('   - Verify host/port');
        }
        
        return false;
    } finally {
        await client.end();
    }
}

// Run test
testConnection().then(success => {
    if (!success) {
        console.log('\n🔧 Troubleshooting Steps:');
        console.log('1. Check your .env file formatting:');
        console.log('   - No spaces around =');
        console.log('   - No quotes unless password has spaces');
        console.log('   - Example: DB_PASSWORD=myPassword123');
        
        console.log('\n2. If password has special characters, try:');
        console.log('   DB_PASSWORD="my@Pass#word!123"');
        
        console.log('\n3. Create a test connection with hardcoded values:');
        console.log('   Copy your pgAdmin password into this script');
    }
});