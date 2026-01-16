/**
 * ============================================
 * DATABASE INITIALIZATION SCRIPT
 * ============================================
 * Simplified version that focuses on basics
 * ============================================
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telford_community_db'
};

async function executeSqlFile(client, filePath) {
    try {
        const sql = await fs.readFile(filePath, 'utf8');
        console.log(`📄 Executing: ${path.basename(filePath)}`);
        
        // Remove comments and empty lines for cleaner execution
        const statements = sql
            .replace(/--.*$/gm, '') // Remove single line comments
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*'));
        
        for (const statement of statements) {
            if (statement.length === 0) continue;
            
            try {
                await client.query(statement);
            } catch (error) {
                // Ignore "already exists" errors
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate')) {
                    console.log(`  ⚠️  Skipping: ${error.message.split('\n')[0]}`);
                    continue;
                }
                throw error;
            }
        }
        
        console.log(`✅ Successfully executed: ${path.basename(filePath)}`);
    } catch (error) {
        throw new Error(`Failed to execute ${filePath}: ${error.message}`);
    }
}

async function initializeDatabase() {
    let client = null;
    
    console.log('🚀 Starting database initialization...');
    console.log(`📁 Target database: ${config.database}`);
    
    try {
        // Step 1: Connect to database
        console.log('\n1. Connecting to PostgreSQL...');
        client = new Client(config);
        await client.connect();
        console.log('✅ Connected to PostgreSQL');
        
        // Step 2: Create tables from schema
        console.log('\n2. Creating database schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        await executeSqlFile(client, schemaPath);
        
        // Step 3: Verify tables were created
        console.log('\n3. Verifying table creation...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('✅ Tables created:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        // Step 4: Count records in users table
        console.log('\n4. Checking initial data...');
        const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table has ${usersResult.rows[0].count} record(s)`);
        
        console.log('\n🎉 Database initialization complete!');
        
    } catch (error) {
        console.error('\n❌ Initialization failed:', error.message);
        
        // Provide helpful hints
        if (error.message.includes('connection')) {
            console.error('\n💡 Troubleshooting tips:');
            console.error('1. Is PostgreSQL installed and running?');
            console.error('2. Check if PostgreSQL service is running:');
            console.error('   Linux/Mac: sudo service postgresql status');
            console.error('   Windows: Check Services for "postgresql"');
            console.error('3. Verify connection details in .env file:');
            console.error(`   DB_HOST: ${process.env.DB_HOST}`);
            console.error(`   DB_PORT: ${process.env.DB_PORT}`);
            console.error(`   DB_USER: ${process.env.DB_USER}`);
            console.error(`   DB_NAME: ${process.env.DB_NAME}`);
        }
        
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
            console.log('\n👋 Database connection closed');
        }
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };