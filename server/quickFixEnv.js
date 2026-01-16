/**
 * Quick fix for .env file
 */
const fs = require('fs').promises;
const path = require('path');

async function fixEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    
    try {
        // Read current .env
        let content = await fs.readFile(envPath, 'utf8');
        console.log('📄 Current .env (first few lines):\n');
        console.log(content.split('\n').slice(0, 10).join('\n'));
        console.log('\n---\n');
        
        // Fix the password line
        content = content.replace(/DB_PASSWORD=.*/g, 'DB_PASSWORD=Amirisking7*');
        
        // Write fixed file
        await fs.writeFile(envPath, content, 'utf8');
        console.log('✅ Fixed DB_PASSWORD line');
        console.log('   Changed to: DB_PASSWORD=Amirisking7*');
        
        // Verify
        const newContent = await fs.readFile(envPath, 'utf8');
        const passLine = newContent.split('\n').find(line => line.includes('DB_PASSWORD'));
        console.log('\n🔍 Verification:');
        console.log(`   ${passLine}`);
        console.log(`   Password value: "${passLine.split('=')[1]}"`);
        console.log(`   Length: ${passLine.split('=')[1]?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixEnv();