/**
 * ============================================
 * FIX DATABASE SCHEMA TO MATCH SEQUELIZE
 * ============================================
 * Updates the existing database to match Sequelize model
 * ============================================
 */

require('dotenv').config();
const { Client } = require('pg');

const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function fixSchema() {
    const client = new Client(config);
    
    console.log('🔧 Fixing database schema to match Sequelize...\n');
    
    try {
        await client.connect();
        console.log('✅ Connected to database\n');
        
        // ============================================
        // 1. BACKUP EXISTING DATA
        // ============================================
        console.log('1. Backing up existing user data...');
        
        const backupResult = await client.query(`
            SELECT id, username, email, password_hash, display_name, 
                   role, is_active, email_verified, created_at, updated_at
            FROM users
        `);
        
        console.log(`✅ Backed up ${backupResult.rows.length} user(s)\n`);
        
        // ============================================
        // 2. UPDATE USERS TABLE STRUCTURE
        // ============================================
        console.log('2. Updating users table structure...');
        
        // Rename password_hash to password
        try {
            await client.query(`
                ALTER TABLE users 
                RENAME COLUMN password_hash TO password
            `);
            console.log('✅ Renamed password_hash to password');
        } catch (error) {
            console.log(`⚠️  Column rename: ${error.message}`);
        }
        
        // Make sure password is NOT NULL
        try {
            await client.query(`
                ALTER TABLE users 
                ALTER COLUMN password SET NOT NULL
            `);
            console.log('✅ Set password as NOT NULL');
        } catch (error) {
            console.log(`⚠️  NOT NULL constraint: ${error.message}`);
        }
        
        // Update existing admin user password
        try {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('AdminPassword123!', salt);
            
            await client.query(`
                UPDATE users 
                SET password = $1 
                WHERE email = 'admin@telford.com'
            `, [hashedPassword]);
            
            console.log('✅ Updated admin user password');
        } catch (error) {
            console.log(`⚠️  Password update: ${error.message}`);
        }
        
        console.log('\n✅ Schema updates completed!\n');
        
        // ============================================
        // 3. VERIFY UPDATES
        // ============================================
        console.log('3. Verifying updates...');
        
        const verifyResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Updated users table columns:');
        verifyResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        console.log('\n🎉 Database schema is now compatible with Sequelize!');
        
    } catch (error) {
        console.error('\n❌ Schema fix failed:', error.message);
    } finally {
        await client.end();
        console.log('\n👋 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    fixSchema();
}

module.exports = { fixSchema };