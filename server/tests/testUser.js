// Minimal test to see if basics work
console.log('🔧 Running minimal test...\n');

try {
    // Test bcrypt
    console.log('1. Testing bcrypt...');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('test', 10);
    const match = await bcrypt.compare('test', hash);
    console.log(`✅ Bcrypt works: ${match}`);
    
    // Test database connection
    console.log('\n2. Testing database connection...');
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    console.log('✅ Database connection works');
    
    // Test model loading
    console.log('\n3. Testing model loading...');
    const User = require('../models/User');
    console.log(`✅ User model type: ${typeof User}`);
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
}