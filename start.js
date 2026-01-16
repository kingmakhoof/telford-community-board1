<<<<<<< HEAD
/**
 * Simple start script that ensures correct load order
 */
require('dotenv').config();

console.log('🚀 Starting Telford Community Board...\n');

// Debug environment
console.log('📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD set: ${process.env.DB_PASSWORD ? 'Yes' : 'No'}`);
console.log('');

// Start the server
=======
/**
 * Simple start script that ensures correct load order
 */
require('dotenv').config();

console.log('🚀 Starting Telford Community Board...\n');

// Debug environment
console.log('📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD set: ${process.env.DB_PASSWORD ? 'Yes' : 'No'}`);
console.log('');

// Start the server
>>>>>>> f9c04158b4baadce1605677f2d3b85ebb8762984
require('./server/server.js');