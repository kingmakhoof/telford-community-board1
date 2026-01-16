const { Sequelize } = require('sequelize');

// Debug: Show what we received
console.log('\n🔧 Database Configuration (from process.env):');
console.log(`   DB_HOST: "${process.env.DB_HOST}"`);
console.log(`   DB_PORT: "${process.env.DB_PORT}"`);
console.log(`   DB_NAME: "${process.env.DB_NAME}"`);
console.log(`   DB_USER: "${process.env.DB_USER}"`);
console.log(`   DB_PASSWORD: "${process.env.DB_PASSWORD}"`);
console.log(`   Password length: ${process.env.DB_PASSWORD?.length || 0}`);
console.log('');

// Ensure password is a string (not undefined)
const dbPassword = process.env.DB_PASSWORD || '';

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME || 'telford_community_db',
    process.env.DB_USER || 'postgres',
    dbPassword, // Always a string (empty if undefined)
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        },
        
        logging: process.env.NODE_ENV === 'development' 
            ? (msg) => console.log(`   📦 SQL: ${msg}`)
            : false,
            
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    }
);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully');
        
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synchronized');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        
        if (error.original) {
            console.error('  Original error:', error.original.message);
            console.error('  Error code:', error.original.code);
            
            if (error.original.code === '28P01') {
                console.error('\n💡 Authentication failed. Check:');
                console.error('   1. DB_PASSWORD in .env file');
                console.error('   2. Password value:', `"${process.env.DB_PASSWORD}"`);
                console.error('   3. Password length:', process.env.DB_PASSWORD?.length || 0);
            }
        }
        
        throw error;
    }
}

module.exports = {
    sequelize,
    Sequelize,
    testConnection
};